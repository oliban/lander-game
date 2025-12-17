/**
 * GyroscopeManager - Handles device orientation for tilt-based steering
 */

export class GyroscopeManager {
  private calibrationOffset: number = 0;
  private currentGamma: number = 0;
  private isEnabled: boolean = false;
  private hasPermission: boolean = false;
  private boundHandler: ((event: DeviceOrientationEvent) => void) | null = null;

  // Dead zone to prevent drift when holding steady
  private readonly DEAD_ZONE = 5; // degrees
  // Maximum tilt angle for full rotation
  private readonly MAX_TILT = 30; // degrees

  constructor() {
    this.boundHandler = this.handleOrientation.bind(this);
  }

  /**
   * Checks if gyroscope is supported on this device
   */
  isSupported(): boolean {
    return 'DeviceOrientationEvent' in window;
  }

  /**
   * Requests permission to use the gyroscope (required on iOS 13+)
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    // iOS 13+ requires explicit permission request
    if (
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (
          DeviceOrientationEvent as any
        ).requestPermission();
        this.hasPermission = permission === 'granted';
        return this.hasPermission;
      } catch (error) {
        console.warn('Gyroscope permission request failed:', error);
        return false;
      }
    }

    // Non-iOS devices don't require permission
    this.hasPermission = true;
    return true;
  }

  /**
   * Calibrates the gyroscope - sets current position as neutral
   */
  calibrate(): void {
    this.calibrationOffset = this.currentGamma;
  }

  /**
   * Enables gyroscope tracking
   */
  enable(): void {
    if (!this.hasPermission || this.isEnabled) {
      return;
    }

    if (this.boundHandler) {
      window.addEventListener('deviceorientation', this.boundHandler);
    }
    this.isEnabled = true;
  }

  /**
   * Disables gyroscope tracking
   */
  disable(): void {
    if (!this.isEnabled) {
      return;
    }

    if (this.boundHandler) {
      window.removeEventListener('deviceorientation', this.boundHandler);
    }
    this.isEnabled = false;
    this.currentGamma = 0;
  }

  /**
   * Gets normalized rotation value (-1 to 1)
   * Negative = tilted left, Positive = tilted right
   */
  getNormalizedRotation(): number {
    if (!this.isEnabled) {
      return 0;
    }

    // Apply calibration offset
    let adjustedGamma = this.currentGamma - this.calibrationOffset;

    // Apply dead zone
    if (Math.abs(adjustedGamma) < this.DEAD_ZONE) {
      return 0;
    }

    // Remove dead zone from calculation
    if (adjustedGamma > 0) {
      adjustedGamma -= this.DEAD_ZONE;
    } else {
      adjustedGamma += this.DEAD_ZONE;
    }

    // Normalize to -1 to 1 range based on max tilt
    const effectiveMax = this.MAX_TILT - this.DEAD_ZONE;
    const normalized = adjustedGamma / effectiveMax;

    // Clamp to -1 to 1
    return Math.max(-1, Math.min(1, normalized));
  }

  /**
   * Handles device orientation events
   */
  private handleOrientation(event: DeviceOrientationEvent): void {
    // gamma is the left-to-right tilt in degrees (-90 to 90)
    if (event.gamma !== null) {
      this.currentGamma = event.gamma;
    }
  }

  /**
   * Checks if gyroscope is currently enabled
   */
  getIsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Gets raw gamma value (for debugging)
   */
  getRawGamma(): number {
    return this.currentGamma;
  }
}
