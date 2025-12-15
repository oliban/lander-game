import Phaser from 'phaser';
import { LandingPad } from '../objects/LandingPad';

export interface LandingValidationResult {
  valid: boolean;
  reason?: string;
}

export type LandingType = 'victory' | 'washington_medal' | 'washington_ice' | 'normal';

export interface LandingPadManagerCallbacks {
  getLandingPads: () => LandingPad[];
  getWindStrength: () => number;
}

export class LandingPadManager {
  private scene: Phaser.Scene;
  private callbacks: LandingPadManagerCallbacks;

  private readonly SHUTTLE_BOTTOM_OFFSET = 18;
  private readonly VERTICAL_TOLERANCE_ABOVE = 10;
  private readonly VERTICAL_TOLERANCE_BELOW = 5;
  private readonly LANDING_DEBOUNCE_MS = 1000;
  private readonly VELOCITY_THRESHOLD = 0.5;

  constructor(scene: Phaser.Scene, callbacks: LandingPadManagerCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  /**
   * Update all landing pads (wind effects on flags)
   */
  update(): void {
    const windStrength = this.callbacks.getWindStrength();
    for (const pad of this.callbacks.getLandingPads()) {
      pad.updateWind(windStrength);
    }
  }

  /**
   * Validate if a shuttle's position is valid for landing on a pad
   */
  isValidLandingPosition(
    shuttleX: number,
    shuttleY: number,
    padX: number,
    padY: number,
    padWidth: number
  ): LandingValidationResult {
    const shuttleBottom = shuttleY + this.SHUTTLE_BOTTOM_OFFSET;
    const distanceFromPad = padY - shuttleBottom;
    const halfPadWidth = padWidth / 2;
    const horizontalDistance = Math.abs(shuttleX - padX);

    // Check horizontal alignment
    if (horizontalDistance > halfPadWidth) {
      return { valid: false, reason: 'not horizontally aligned' };
    }

    // Check vertical distance (positive = above pad, negative = below)
    if (distanceFromPad < -this.VERTICAL_TOLERANCE_BELOW || distanceFromPad > this.VERTICAL_TOLERANCE_ABOVE) {
      return { valid: false, reason: 'not on pad surface' };
    }

    return { valid: true };
  }

  /**
   * Check if landing should be debounced (too soon after last landing)
   */
  shouldDebounce(lastLandingTime: number, currentTime: number): boolean {
    return currentTime - lastLandingTime < this.LANDING_DEBOUNCE_MS;
  }

  /**
   * Check if landing on start pad should be ignored (hasn't taken off yet)
   */
  shouldIgnoreStartPad(padIndex: number, startPadId: number, shuttleVelocity: number): boolean {
    if (padIndex !== startPadId) return false;
    return shuttleVelocity < this.VELOCITY_THRESHOLD;
  }

  /**
   * Determine the type of landing based on pad properties and game state
   */
  getLandingType(
    pad: LandingPad,
    hasPeaceMedal: boolean,
    hasGreenlandIce: boolean,
    gameMode: string
  ): LandingType {
    if (pad.isFinalDestination && gameMode !== 'dogfight') {
      return 'victory';
    }
    if (pad.isWashington && hasGreenlandIce) {
      return 'washington_ice';
    }
    if (pad.isWashington && !hasPeaceMedal && gameMode !== 'dogfight') {
      return 'washington_medal';
    }
    return 'normal';
  }

  /**
   * Get landing bonus multiplier based on quality
   */
  getLandingBonus(quality: 'perfect' | 'good' | 'rough'): number {
    return quality === 'perfect' ? 1.5 : quality === 'good' ? 1.25 : 1.0;
  }

  /**
   * Get the sound key for a landing quality
   */
  getLandingSoundKey(quality: 'perfect' | 'good' | 'rough'): string {
    if (quality === 'perfect') return 'landing_perfect';
    if (quality === 'good') return 'landing_good';
    return 'landing_rough';
  }
}
