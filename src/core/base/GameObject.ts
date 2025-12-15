import Phaser from 'phaser';
import { ICollidable, CollisionBounds } from '../interfaces';

/**
 * Collision bounds alignment options
 */
export type BoundsAlignment = 'top' | 'center';

/**
 * Configuration for GameObject
 */
export interface GameObjectConfig {
  /** Collision width */
  collisionWidth: number;
  /** Collision height */
  collisionHeight: number;
  /** How the bounds are aligned vertically (default: 'top') */
  boundsAlignment?: BoundsAlignment;
  /** Extra height to add below (for objects extending into water, etc.) */
  extraHeight?: number;
}

/**
 * Base class for game objects with collision detection
 * Extends Phaser Container and implements ICollidable
 */
export abstract class GameObject extends Phaser.GameObjects.Container implements ICollidable {
  protected collisionWidth: number;
  protected collisionHeight: number;
  protected boundsAlignment: BoundsAlignment;
  protected extraHeight: number;

  constructor(scene: Phaser.Scene, x: number, y: number, config: GameObjectConfig) {
    super(scene, x, y);

    this.collisionWidth = config.collisionWidth;
    this.collisionHeight = config.collisionHeight;
    this.boundsAlignment = config.boundsAlignment ?? 'top';
    this.extraHeight = config.extraHeight ?? 0;

    scene.add.existing(this);
  }

  /**
   * Get the collision bounds for this object
   */
  getCollisionBounds(): CollisionBounds {
    const yOffset = this.boundsAlignment === 'center'
      ? this.collisionHeight / 2
      : this.collisionHeight;

    return {
      x: this.x - this.collisionWidth / 2,
      y: this.y - yOffset,
      width: this.collisionWidth,
      height: this.collisionHeight + this.extraHeight,
    };
  }
}
