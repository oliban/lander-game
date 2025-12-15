import Phaser from 'phaser';
import { IBobbable, BobbingConfig } from '../interfaces';
import { DestructibleObject, DestructibleObjectConfig } from './DestructibleObject';

/**
 * Configuration for BobbingObject
 */
export interface BobbingObjectConfig extends DestructibleObjectConfig {
  /** Bobbing behavior configuration */
  bobbing?: BobbingConfig;
}

/**
 * Default bobbing configuration
 */
const DEFAULT_BOBBING: Required<BobbingConfig> = {
  bobAmplitude: 6,
  bobFrequency: 1.2,
  rotationAmplitude: 0.04,
  rotationFrequency: 0.7,
  rotationPhaseOffset: 0.3,
};

/**
 * Base class for floating/bobbing destructible objects
 * Extends DestructibleObject and implements IBobbable
 */
export abstract class BobbingObject extends DestructibleObject implements IBobbable {
  public baseY: number;
  protected bobbingConfig: Required<BobbingConfig>;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BobbingObjectConfig) {
    super(scene, x, y, config);

    this.baseY = y;
    this.bobbingConfig = {
      ...DEFAULT_BOBBING,
      ...config.bobbing,
    };
  }

  /**
   * Update the object's position based on wave offset
   * @param waveOffset The current wave phase offset
   */
  updateBobbing(waveOffset: number): void {
    if (this.isDestroyed) return;

    const { bobAmplitude, bobFrequency, rotationAmplitude, rotationFrequency, rotationPhaseOffset } = this.bobbingConfig;

    // Vertical bobbing
    const bobY = Math.sin(waveOffset * bobFrequency) * bobAmplitude;
    this.y = this.baseY + bobY;

    // Rotation sway
    this.rotation = Math.sin(waveOffset * rotationFrequency + rotationPhaseOffset) * rotationAmplitude;
  }
}
