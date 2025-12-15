import Phaser from 'phaser';
import { IDestructible, DestructionResult } from '../interfaces';
import { GameObject, GameObjectConfig } from './GameObject';

/**
 * Configuration for DestructibleObject
 */
export interface DestructibleObjectConfig extends GameObjectConfig {
  /** Point value when destroyed */
  pointValue: number;
  /** Display name for the object */
  name: string;
}

/**
 * Base class for destructible game objects
 * Extends GameObject and implements IDestructible
 */
export abstract class DestructibleObject extends GameObject implements IDestructible {
  public isDestroyed: boolean = false;
  public readonly pointValue: number;
  protected objectName: string;

  constructor(scene: Phaser.Scene, x: number, y: number, config: DestructibleObjectConfig) {
    super(scene, x, y, config);

    this.pointValue = config.pointValue;
    this.objectName = config.name;
  }

  /**
   * Trigger destruction/explosion of the object
   * Override in subclasses for custom explosion effects
   * @returns Destruction metadata
   */
  explode(): DestructionResult | void {
    if (this.isDestroyed) {
      return { name: this.objectName, points: 0 };
    }

    this.isDestroyed = true;
    this.setVisible(false);

    // Subclasses should override to add explosion effects
    this.onExplode();

    return {
      name: this.objectName,
      points: this.pointValue,
    };
  }

  /**
   * Called when the object explodes
   * Override in subclasses to add custom explosion effects
   */
  protected abstract onExplode(): void;
}
