/**
 * Base destruction result with common properties
 */
export interface DestructionResult {
  name: string;
  points: number;
}

/**
 * Interface for objects that can be destroyed
 */
export interface IDestructible {
  /**
   * Whether the object has been destroyed
   */
  isDestroyed: boolean;

  /**
   * Point value when destroyed
   */
  readonly pointValue: number;

  /**
   * Trigger destruction/explosion of the object
   * Returns destruction metadata or void
   */
  explode(): DestructionResult | void;
}
