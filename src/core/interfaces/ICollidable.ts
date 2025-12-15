/**
 * Collision bounds rectangle
 */
export interface CollisionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Interface for objects that can be collided with
 */
export interface ICollidable {
  /**
   * Get the collision bounds for this object
   */
  getCollisionBounds(): CollisionBounds;
}
