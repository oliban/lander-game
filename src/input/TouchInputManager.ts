/**
 * TouchInputManager - Singleton that manages touch input state
 * Bridges HTML touch controls to the Phaser game
 */

export interface TouchInputState {
  thrust: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  gyroEnabled: boolean;
  gyroRotation: number; // -1 to 1 (normalized tilt)
}

export class TouchInputManager {
  private static instance: TouchInputManager;

  private state: TouchInputState = {
    thrust: false,
    rotateLeft: false,
    rotateRight: false,
    gyroEnabled: false,
    gyroRotation: 0,
  };

  // Single-press action flags (consumed once per press)
  private gearPressed: boolean = false;
  private bombPressed: boolean = false;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(): TouchInputManager {
    if (!TouchInputManager.instance) {
      TouchInputManager.instance = new TouchInputManager();
    }
    return TouchInputManager.instance;
  }

  /**
   * Sets thrust state (continuous while held)
   */
  setThrust(active: boolean): void {
    this.state.thrust = active;
  }

  /**
   * Sets rotate left state (continuous while held)
   */
  setRotateLeft(active: boolean): void {
    this.state.rotateLeft = active;
  }

  /**
   * Sets rotate right state (continuous while held)
   */
  setRotateRight(active: boolean): void {
    this.state.rotateRight = active;
  }

  /**
   * Triggers gear toggle (single press action)
   */
  triggerGear(): void {
    this.gearPressed = true;
  }

  /**
   * Triggers bomb drop (single press action)
   */
  triggerBomb(): void {
    this.bombPressed = true;
  }

  /**
   * Sets gyroscope enabled state
   */
  setGyroEnabled(enabled: boolean): void {
    this.state.gyroEnabled = enabled;
  }

  /**
   * Sets gyroscope rotation value (-1 to 1)
   */
  setGyroRotation(rotation: number): void {
    this.state.gyroRotation = Math.max(-1, Math.min(1, rotation));
  }

  /**
   * Gets the current touch input state
   */
  getState(): TouchInputState {
    return { ...this.state };
  }

  /**
   * Consumes gear press (returns true once per press, then false)
   */
  consumeGearPress(): boolean {
    if (this.gearPressed) {
      this.gearPressed = false;
      return true;
    }
    return false;
  }

  /**
   * Consumes bomb press (returns true once per press, then false)
   */
  consumeBombPress(): boolean {
    if (this.bombPressed) {
      this.bombPressed = false;
      return true;
    }
    return false;
  }

  /**
   * Resets all input state (useful when game restarts)
   */
  reset(): void {
    this.state.thrust = false;
    this.state.rotateLeft = false;
    this.state.rotateRight = false;
    this.gearPressed = false;
    this.bombPressed = false;
    // Note: gyroEnabled and gyroRotation are not reset as they're controlled by UI toggle
  }
}
