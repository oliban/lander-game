import Phaser from 'phaser';
import { Cannon } from '../objects/Cannon';
import { Shuttle } from '../objects/Shuttle';
import { GAME_WIDTH } from '../constants';

export interface CannonManagerCallbacks {
  getCannons: () => Cannon[];
  getShuttles: () => Shuttle[];
  getCamera: () => Phaser.Cameras.Scene2D.Camera;
  getWindStrength: () => number;
  isCannonsBribed: () => boolean;
}

export class CannonManager {
  private scene: Phaser.Scene;
  private callbacks: CannonManagerCallbacks;

  private readonly CAMERA_MARGIN = 200;

  constructor(scene: Phaser.Scene, callbacks: CannonManagerCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  /**
   * Update all cannons - targeting, firing, and projectile collisions
   */
  update(time: number): void {
    const cannons = this.callbacks.getCannons();
    const shuttles = this.callbacks.getShuttles();
    const camera = this.callbacks.getCamera();
    const windStrength = this.callbacks.getWindStrength();
    const isBribed = this.callbacks.isCannonsBribed();

    const activeShuttles = shuttles.filter(s => s.active);
    const cameraLeft = camera.scrollX - this.CAMERA_MARGIN;
    const cameraRight = camera.scrollX + GAME_WIDTH + this.CAMERA_MARGIN;

    for (const cannon of cannons) {
      const isOnScreen = this.isCannonOnScreen(cannon.x, cameraLeft, cameraRight);
      const hasProjectiles = cannon.getProjectiles().length > 0;

      // Set target if cannon should fire
      if (this.shouldCannonFire(isOnScreen, cannon.isActive(), isBribed, activeShuttles.length > 0)) {
        const target = this.findNearestTarget(cannon.x, cannon.y, activeShuttles);
        if (target) {
          cannon.setTarget({ x: target.x, y: target.y });
        }
      } else if (isBribed) {
        // Clear target so bribed cannons stop aiming
        cannon.setTarget(null as unknown as { x: number; y: number });
      }

      // Update cannon if on screen or has projectiles in flight
      if (this.shouldUpdateCannon(isOnScreen, hasProjectiles)) {
        cannon.update(time, windStrength);
        // Note: Projectile-shuttle collisions are handled by CollisionManager via Matter.js physics
      }
    }
  }

  /**
   * Check if cannon is within camera view (with margin)
   */
  private isCannonOnScreen(cannonX: number, cameraLeft: number, cameraRight: number): boolean {
    return cannonX >= cameraLeft && cannonX <= cameraRight;
  }

  /**
   * Determine if cannon should fire
   */
  private shouldCannonFire(
    isOnScreen: boolean,
    isActive: boolean,
    isBribed: boolean,
    hasTargets: boolean
  ): boolean {
    return isOnScreen && isActive && !isBribed && hasTargets;
  }

  /**
   * Determine if cannon should be updated
   */
  private shouldUpdateCannon(isOnScreen: boolean, hasProjectiles: boolean): boolean {
    return isOnScreen || hasProjectiles;
  }

  /**
   * Find the nearest active shuttle to target
   */
  private findNearestTarget(cannonX: number, cannonY: number, shuttles: Shuttle[]): Shuttle | null {
    if (shuttles.length === 0) return null;

    let nearest = shuttles[0];
    let nearestDist = Math.hypot(cannonX - nearest.x, cannonY - nearest.y);

    for (const shuttle of shuttles) {
      const dist = Math.hypot(cannonX - shuttle.x, cannonY - shuttle.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = shuttle;
      }
    }

    return nearest;
  }

}
