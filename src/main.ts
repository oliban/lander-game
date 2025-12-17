import Phaser from 'phaser';
import { gameConfig } from './config';
import { GyroscopeManager } from './input/GyroscopeManager';
import { isMobileDevice, supportsGyroscope } from './utils/DeviceDetection';

// Gyroscope manager instance (created on mobile)
let gyroManager: GyroscopeManager | null = null;
let gyroEnabled = false;
let gyroAnimationId: number | null = null;

// Track which direction keys are currently "pressed" by gyro
let gyroLeftPressed = false;
let gyroRightPressed = false;

/**
 * Simulates a keyboard key press/release by dispatching KeyboardEvent
 * Includes keyCode for Phaser compatibility
 */
function simulateKey(code: string, isDown: boolean): void {
  const eventType = isDown ? 'keydown' : 'keyup';

  // Map code to keyCode for Phaser
  const keyCodeMap: Record<string, number> = {
    'ArrowUp': 38,
    'ArrowDown': 40,
    'ArrowLeft': 37,
    'ArrowRight': 39,
    'Space': 32,
    'Enter': 13,
  };

  const keyCode = keyCodeMap[code] || 0;

  // Create event with all necessary properties
  const event = new KeyboardEvent(eventType, {
    key: code,
    code: code,
    bubbles: true,
    cancelable: true,
    view: window,
  });

  // Override readonly keyCode/which properties for Phaser compatibility
  Object.defineProperty(event, 'keyCode', { value: keyCode });
  Object.defineProperty(event, 'which', { value: keyCode });

  // Dispatch to window where Phaser listens
  window.dispatchEvent(event);
}

/**
 * Adds touch event listeners to a button that simulate keyboard keys
 */
function addTouchToKeyEvents(
  element: HTMLElement | null,
  keyCode: string
): void {
  if (!element) return;

  element.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      simulateKey(keyCode, true);
      element.classList.add('active');
    },
    { passive: false }
  );

  element.addEventListener(
    'touchend',
    (e) => {
      e.preventDefault();
      simulateKey(keyCode, false);
      element.classList.remove('active');
    },
    { passive: false }
  );

  element.addEventListener(
    'touchcancel',
    (e) => {
      e.preventDefault();
      simulateKey(keyCode, false);
      element.classList.remove('active');
    },
    { passive: false }
  );

  // Mouse events for desktop testing
  element.addEventListener('mousedown', () => {
    simulateKey(keyCode, true);
    element.classList.add('active');
  });
  element.addEventListener('mouseup', () => {
    simulateKey(keyCode, false);
    element.classList.remove('active');
  });
  element.addEventListener('mouseleave', () => {
    simulateKey(keyCode, false);
    element.classList.remove('active');
  });
}

/**
 * Adds touch event for single-press actions (like toggle buttons)
 */
function addSinglePressTouchEvent(
  element: HTMLElement | null,
  onPress: () => void
): void {
  if (!element) return;

  element.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      onPress();
    },
    { passive: false }
  );

  // Mouse event for desktop testing
  element.addEventListener('click', (e) => {
    // Only handle click if it wasn't from a touch (avoid double-firing)
    if (!(e as any).sourceCapabilities?.firesTouchEvents) {
      onPress();
    }
  });
}

/**
 * Initializes touch controls for mobile devices
 */
function initializeTouchControls(): void {
  gyroManager = new GyroscopeManager();

  // Get DOM elements
  const leftPanel = document.getElementById('left-panel');
  const rightPanel = document.getElementById('right-panel');
  const gyroToggle = document.getElementById('gyro-toggle');
  const gearToggle = document.getElementById('gear-toggle');
  const steerLeft = document.getElementById('steer-left');
  const steerRight = document.getElementById('steer-right');
  const steeringContainer = document.getElementById('steering-buttons');
  const thrustBtn = document.getElementById('thrust-btn');
  const bombBtn = document.getElementById('bomb-btn');

  // Show panels on mobile
  leftPanel?.classList.remove('hidden');
  rightPanel?.classList.remove('hidden');

  // Map touch buttons directly to keyboard keys (same as P1 controls)
  // Thrust = ArrowUp + Enter (Enter for menu confirmations)
  addTouchToKeyEvents(thrustBtn, 'ArrowUp');
  addTouchToKeyEvents(thrustBtn, 'Enter');

  // Steering = ArrowLeft / ArrowRight
  addTouchToKeyEvents(steerLeft, 'ArrowLeft');
  addTouchToKeyEvents(steerRight, 'ArrowRight');

  // Gear toggle = Space
  addTouchToKeyEvents(gearToggle, 'Space');

  // Bomb = ArrowDown
  addTouchToKeyEvents(bombBtn, 'ArrowDown');

  // Gyroscope toggle
  addSinglePressTouchEvent(gyroToggle, async () => {
    await handleGyroToggle(gyroToggle, steeringContainer);
  });

  // Unlock audio context on first touch (required by mobile browsers)
  const unlockAudio = () => {
    // Create and play a silent buffer to unlock audio
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);

      // Resume any suspended context
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    }

    // Also try to unlock via user gesture by playing/pausing all audio elements
    document.querySelectorAll('audio').forEach((audio) => {
      audio.play().catch(() => {});
      audio.pause();
    });

    // Remove listeners after first interaction
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('touchend', unlockAudio);
    document.removeEventListener('click', unlockAudio);
  };

  document.addEventListener('touchstart', unlockAudio, { passive: true });
  document.addEventListener('touchend', unlockAudio, { passive: true });
  document.addEventListener('click', unlockAudio, { passive: true });
}

/**
 * Updates steering based on gyroscope tilt by simulating key presses
 */
function updateGyroSteering(): void {
  if (!gyroEnabled || !gyroManager) {
    // Release any held keys when gyro is disabled
    if (gyroLeftPressed) {
      simulateKey('ArrowLeft', false);
      gyroLeftPressed = false;
    }
    if (gyroRightPressed) {
      simulateKey('ArrowRight', false);
      gyroRightPressed = false;
    }
    return;
  }

  const rotation = gyroManager.getNormalizedRotation();
  const threshold = 0.15;

  // Tilt left
  if (rotation < -threshold) {
    if (!gyroLeftPressed) {
      simulateKey('ArrowLeft', true);
      gyroLeftPressed = true;
    }
    if (gyroRightPressed) {
      simulateKey('ArrowRight', false);
      gyroRightPressed = false;
    }
  }
  // Tilt right
  else if (rotation > threshold) {
    if (!gyroRightPressed) {
      simulateKey('ArrowRight', true);
      gyroRightPressed = true;
    }
    if (gyroLeftPressed) {
      simulateKey('ArrowLeft', false);
      gyroLeftPressed = false;
    }
  }
  // Neutral - release both
  else {
    if (gyroLeftPressed) {
      simulateKey('ArrowLeft', false);
      gyroLeftPressed = false;
    }
    if (gyroRightPressed) {
      simulateKey('ArrowRight', false);
      gyroRightPressed = false;
    }
  }

  // Continue loop
  gyroAnimationId = requestAnimationFrame(updateGyroSteering);
}

/**
 * Handles gyroscope toggle button press
 */
async function handleGyroToggle(
  gyroToggle: HTMLElement | null,
  steeringContainer: HTMLElement | null
): Promise<void> {
  if (!gyroManager) return;

  if (!supportsGyroscope()) {
    alert('Gyroscope not supported on this device');
    return;
  }

  if (!gyroEnabled) {
    // Enable gyroscope
    const hasPermission = await gyroManager.requestPermission();
    if (hasPermission) {
      gyroManager.calibrate(); // Set current position as neutral
      gyroManager.enable();
      gyroEnabled = true;
      gyroToggle?.classList.add('enabled');
      steeringContainer?.classList.add('hidden');

      // Start gyro steering loop
      gyroAnimationId = requestAnimationFrame(updateGyroSteering);
    } else {
      alert(
        'Gyroscope permission denied.\n\n' +
          'On iOS, go to Settings > Safari > Motion & Orientation Access and enable it.\n\n' +
          'Then reload this page and try again.'
      );
    }
  } else {
    // Disable gyroscope
    gyroManager.disable();
    gyroEnabled = false;
    gyroToggle?.classList.remove('enabled');
    steeringContainer?.classList.remove('hidden');

    // Stop gyro loop and release keys
    if (gyroAnimationId) {
      cancelAnimationFrame(gyroAnimationId);
      gyroAnimationId = null;
    }
    updateGyroSteering(); // This will release any held keys
  }
}

// Initialize touch controls if on mobile device
if (isMobileDevice()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTouchControls);
  } else {
    initializeTouchControls();
  }
}

// Create the game instance
new Phaser.Game(gameConfig);
