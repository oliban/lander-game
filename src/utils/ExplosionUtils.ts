/**
 * Utility functions for creating explosion effects in the game.
 * Provides reusable explosion components including flashes, debris, and smoke.
 */

export interface ExplosionFlashConfig {
  /** Array of colors for concentric circles (outer to inner). Default: [0xFFFF00, 0xFF6600, 0xFFFFFF] */
  flashColors?: number[];
  /** Array of radii for concentric circles (outer to inner). Default: [30, 20, 10] */
  flashSizes?: number[];
  /** Duration of flash fade-out in ms. Default: 400 */
  duration?: number;
  /** Depth of the flash graphics. Default: 100 */
  depth?: number;
}

export interface ExplosionDebrisConfig {
  /** Array of colors for debris pieces. Default: [0xFF6600, 0xFFFF00, 0xFF0000, 0xFFFFFF] */
  debrisColors?: number[];
  /** Number of debris pieces to create. Default: 12 */
  debrisCount?: number;
  /** Width of each debris piece. Default: 8 */
  debrisWidth?: number;
  /** Height of each debris piece. Default: 8 */
  debrisHeight?: number;
  /** Minimum flight distance. Default: 80 */
  minDistance?: number;
  /** Maximum flight distance. Default: 120 */
  maxDistance?: number;
  /** Duration of debris animation in ms. Default: 600 */
  duration?: number;
  /** Gravity effect (positive = fall down). Default: 50 */
  gravity?: number;
  /** Depth of debris graphics. Default: 101 */
  depth?: number;
}

export interface SmokePuffConfig {
  /** Base color of smoke. Default: 0x444444 */
  smokeColor?: number;
  /** Alpha/opacity of smoke. Default: 0.6 */
  smokeAlpha?: number;
  /** Number of smoke puffs. Default: 4 */
  puffCount?: number;
  /** Minimum size of smoke puffs. Default: 15 */
  minSize?: number;
  /** Maximum size of smoke puffs. Default: 25 */
  maxSize?: number;
  /** How high smoke rises. Default: 40 */
  riseDistance?: number;
  /** Duration of smoke animation in ms. Default: 800 */
  duration?: number;
  /** Scale multiplier during animation. Default: 2 */
  scaleMultiplier?: number;
  /** Delay between puffs in ms. Default: 50 */
  delayBetweenPuffs?: number;
  /** Depth of smoke graphics. Default: 99 */
  depth?: number;
}

export interface ExplosionConfig extends ExplosionFlashConfig, ExplosionDebrisConfig, SmokePuffConfig {
  /** Whether to create flash effect. Default: true */
  includeFlash?: boolean;
  /** Whether to create debris. Default: true */
  includeDebris?: boolean;
  /** Whether to create smoke. Default: true */
  includeSmoke?: boolean;
  /** Whether to shake camera. Default: true */
  shakeCamera?: boolean;
  /** Camera shake duration in ms. Default: 300 */
  shakeDuration?: number;
  /** Camera shake intensity. Default: 0.015 */
  shakeIntensity?: number;
}

/**
 * Creates an expanding flash effect with concentric colored circles.
 * The flash fades out over time.
 *
 * @param scene - The Phaser scene to create the flash in
 * @param x - X position of the explosion center
 * @param y - Y position of the explosion center
 * @param config - Configuration for the flash effect
 *
 * @example
 * createExplosionFlash(scene, 100, 100, {
 *   flashColors: [0xFFFF00, 0xFF6600, 0xFFFFFF],
 *   flashSizes: [40, 25, 12],
 *   duration: 500
 * });
 */
export function createExplosionFlash(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: ExplosionFlashConfig = {}
): void {
  const {
    flashColors = [0xFFFF00, 0xFF6600, 0xFFFFFF],
    flashSizes = [30, 20, 10],
    duration = 400,
    depth = 100,
  } = config;

  const flash = scene.add.graphics();
  flash.setPosition(x, y);
  flash.setDepth(depth);

  // Draw concentric circles from largest to smallest
  for (let i = 0; i < Math.min(flashColors.length, flashSizes.length); i++) {
    flash.fillStyle(flashColors[i], 1);
    flash.fillCircle(0, 0, flashSizes[i]);
  }

  // Fade out
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration,
    onComplete: () => flash.destroy(),
  });
}

/**
 * Creates flying debris pieces that arc outward and fall.
 * Each piece rotates and fades as it flies.
 *
 * @param scene - The Phaser scene to create debris in
 * @param x - X position of the explosion center
 * @param y - Y position of the explosion center
 * @param config - Configuration for debris effect
 *
 * @example
 * createExplosionDebris(scene, 100, 100, {
 *   debrisColors: [0xFF6600, 0xFFFF00],
 *   debrisCount: 15,
 *   duration: 800
 * });
 */
export function createExplosionDebris(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: ExplosionDebrisConfig = {}
): void {
  const {
    debrisColors = [0xFF6600, 0xFFFF00, 0xFF0000, 0xFFFFFF],
    debrisCount = 12,
    debrisWidth = 8,
    debrisHeight = 8,
    minDistance = 80,
    maxDistance = 120,
    duration = 600,
    gravity = 50,
    depth = 101,
  } = config;

  for (let i = 0; i < debrisCount; i++) {
    const angle = (i / debrisCount) * Math.PI * 2;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    const targetX = Math.cos(angle) * distance;
    const targetY = Math.sin(angle) * distance + gravity;

    const debris = scene.add.graphics();
    const color = debrisColors[Math.floor(Math.random() * debrisColors.length)];
    debris.fillStyle(color, 1);
    debris.fillRect(-debrisWidth / 2, -debrisHeight / 2, debrisWidth, debrisHeight);
    debris.setPosition(x, y);
    debris.setDepth(depth);

    scene.tweens.add({
      targets: debris,
      x: x + targetX,
      y: y + targetY,
      angle: Math.random() * 360,
      alpha: 0,
      duration,
      ease: 'Power2',
      onComplete: () => debris.destroy(),
    });
  }
}

/**
 * Creates smoke puffs that rise and dissipate.
 * Each puff scales up and fades out as it rises.
 *
 * @param scene - The Phaser scene to create smoke in
 * @param x - X position of the smoke origin
 * @param y - Y position of the smoke origin
 * @param config - Configuration for smoke effect
 *
 * @example
 * createSmokePuffs(scene, 100, 100, {
 *   puffCount: 6,
 *   smokeColor: 0x555555,
 *   riseDistance: 60
 * });
 */
export function createSmokePuffs(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: SmokePuffConfig = {}
): void {
  const {
    smokeColor = 0x444444,
    smokeAlpha = 0.6,
    puffCount = 4,
    minSize = 15,
    maxSize = 25,
    riseDistance = 40,
    duration = 800,
    scaleMultiplier = 2,
    delayBetweenPuffs = 50,
    depth = 99,
  } = config;

  for (let i = 0; i < puffCount; i++) {
    const smoke = scene.add.graphics();
    const size = minSize + Math.random() * (maxSize - minSize);
    smoke.fillStyle(smokeColor, smokeAlpha);
    smoke.fillCircle(
      x + (Math.random() - 0.5) * 30,
      y + (Math.random() - 0.5) * 20,
      size
    );
    smoke.setDepth(depth);

    scene.tweens.add({
      targets: smoke,
      y: smoke.y - riseDistance,
      alpha: 0,
      scale: scaleMultiplier,
      duration,
      delay: i * delayBetweenPuffs,
      onComplete: () => smoke.destroy(),
    });
  }
}

/**
 * Creates a complete explosion effect combining flash, debris, and smoke.
 * Optionally includes camera shake. This is the main explosion function
 * that matches the original Shuttle.ts explosion behavior.
 *
 * @param scene - The Phaser scene to create the explosion in
 * @param x - X position of the explosion center
 * @param y - Y position of the explosion center
 * @param config - Configuration for all explosion components
 *
 * @example
 * // Default explosion (matches Shuttle.ts)
 * createExplosion(scene, 100, 100);
 *
 * @example
 * // Custom explosion
 * createExplosion(scene, 100, 100, {
 *   flashColors: [0xFF0000, 0xFFFF00],
 *   debrisCount: 20,
 *   includeSmoke: true,
 *   shakeCamera: true
 * });
 */
export function createExplosion(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: ExplosionConfig = {}
): void {
  const {
    includeFlash = true,
    includeDebris = true,
    includeSmoke = false,
    shakeCamera = true,
    shakeDuration = 300,
    shakeIntensity = 0.015,
    ...restConfig
  } = config;

  // Create flash
  if (includeFlash) {
    createExplosionFlash(scene, x, y, restConfig);
  }

  // Create debris
  if (includeDebris) {
    createExplosionDebris(scene, x, y, restConfig);
  }

  // Create smoke
  if (includeSmoke) {
    createSmokePuffs(scene, x, y, restConfig);
  }

  // Camera shake
  if (shakeCamera && scene.cameras?.main) {
    scene.cameras.main.shake(shakeDuration, shakeIntensity);
  }
}
