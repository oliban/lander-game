/**
 * Interface for objects that bob/float on waves
 */
export interface IBobbable {
  /**
   * The base Y position (resting position without wave motion)
   */
  baseY: number;

  /**
   * Update the object's position based on wave offset
   * @param waveOffset The current wave phase offset
   */
  updateBobbing(waveOffset: number): void;
}

/**
 * Configuration for bobbing behavior
 */
export interface BobbingConfig {
  /** Vertical movement amplitude in pixels (default: 6) */
  bobAmplitude?: number;
  /** Vertical wave frequency multiplier (default: 1.2) */
  bobFrequency?: number;
  /** Rotation amplitude in radians (default: 0.04) */
  rotationAmplitude?: number;
  /** Rotation frequency multiplier (default: 0.7) */
  rotationFrequency?: number;
  /** Phase offset for rotation (default: 0.3) */
  rotationPhaseOffset?: number;
}
