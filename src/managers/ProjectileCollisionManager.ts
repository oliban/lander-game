import Phaser from 'phaser';
import { Cannon } from '../objects/Cannon';
import { CountryDecoration } from '../objects/CountryDecoration';
import { MedalHouse } from '../objects/MedalHouse';
import { PerformanceSettings } from '../systems/PerformanceSettings';

export interface ProjectileCollisionCallbacks {
  getCannons: () => Cannon[];
  getDecorations: () => (CountryDecoration | MedalHouse)[];
}

export class ProjectileCollisionManager {
  private scene: Phaser.Scene;
  private callbacks: ProjectileCollisionCallbacks;

  private readonly COLLISION_RADIUS = 15;
  private readonly HORIZONTAL_THRESHOLD = 150;

  constructor(scene: Phaser.Scene, callbacks: ProjectileCollisionCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  /**
   * Check and handle all projectile collisions
   */
  update(): void {
    const cannons = this.callbacks.getCannons();
    const decorations = this.callbacks.getDecorations();

    // Collect all projectiles from all cannons
    const allProjectiles: { projectile: any; cannonIndex: number }[] = [];
    for (let i = 0; i < cannons.length; i++) {
      for (const projectile of cannons[i].getProjectiles()) {
        allProjectiles.push({ projectile, cannonIndex: i });
      }
    }

    const toDestroy: Set<any> = new Set();

    // Check projectile-projectile collisions (skip at low quality - O(n²) is expensive)
    if (PerformanceSettings.getPreset().projectileCollisions) {
      this.checkProjectileProjectileCollisions(allProjectiles, toDestroy);
    }

    // Check projectile-building collisions
    this.checkProjectileBuildingCollisions(allProjectiles, decorations, toDestroy);

    // Remove destroyed projectiles from their cannons
    this.removeDestroyedProjectiles(cannons, toDestroy);
  }

  /**
   * Check collisions between projectiles
   */
  private checkProjectileProjectileCollisions(
    allProjectiles: { projectile: any; cannonIndex: number }[],
    toDestroy: Set<any>
  ): void {
    for (let i = 0; i < allProjectiles.length; i++) {
      for (let j = i + 1; j < allProjectiles.length; j++) {
        const p1 = allProjectiles[i].projectile;
        const p2 = allProjectiles[j].projectile;

        // Skip if already marked for destruction
        if (toDestroy.has(p1) || toDestroy.has(p2)) continue;

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.COLLISION_RADIUS) {
          // Collision! Mark both for destruction
          toDestroy.add(p1);
          toDestroy.add(p2);

          // Create small explosion at midpoint
          this.createProjectileExplosion((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        }
      }
    }
  }

  /**
   * Check collisions between projectiles and buildings
   */
  private checkProjectileBuildingCollisions(
    allProjectiles: { projectile: any; cannonIndex: number }[],
    decorations: (CountryDecoration | MedalHouse)[],
    toDestroy: Set<any>
  ): void {
    for (const { projectile } of allProjectiles) {
      if (toDestroy.has(projectile)) continue;

      for (const decoration of decorations) {
        if (decoration.isDestroyed || !decoration.visible) continue;

        // Quick horizontal distance check
        if (Math.abs(projectile.x - decoration.x) > this.HORIZONTAL_THRESHOLD) continue;

        const bounds = decoration.getCollisionBounds();

        if (
          projectile.x >= bounds.x &&
          projectile.x <= bounds.x + bounds.width &&
          projectile.y >= bounds.y &&
          projectile.y <= bounds.y + bounds.height
        ) {
          // Hit a building! Projectile explodes, building is unharmed
          toDestroy.add(projectile);
          this.createProjectileExplosion(projectile.x, projectile.y);
          break;
        }
      }
    }
  }

  /**
   * Remove destroyed projectiles from cannons
   */
  private removeDestroyedProjectiles(cannons: Cannon[], toDestroy: Set<any>): void {
    for (const cannon of cannons) {
      const projectiles = cannon.getProjectiles();
      for (let i = projectiles.length - 1; i >= 0; i--) {
        if (toDestroy.has(projectiles[i])) {
          projectiles[i].destroy();
          projectiles.splice(i, 1);
        }
      }
    }
  }

  /**
   * Create explosion effect at position
   */
  private createProjectileExplosion(x: number, y: number): void {
    // Big explosion flash - projectiles colliding creates a satisfying boom
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xFF3300, 0.9);
    flash.fillCircle(x, y, 35);
    flash.fillStyle(0xFF6600, 0.9);
    flash.fillCircle(x, y, 28);
    flash.fillStyle(0xFFAA00, 1);
    flash.fillCircle(x, y, 20);
    flash.fillStyle(0xFFFF00, 1);
    flash.fillCircle(x, y, 12);
    flash.fillStyle(0xFFFFFF, 1);
    flash.fillCircle(x, y, 6);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 350,
      onComplete: () => flash.destroy(),
    });

    // More debris particles flying outward
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
      const distance = 40 + Math.random() * 30;
      const debris = this.scene.add.graphics();
      const colors = [0xFF6600, 0xFFAA00, 0x888888, 0xFFFF00];
      debris.fillStyle(colors[Math.floor(Math.random() * colors.length)], 1);
      debris.fillCircle(0, 0, 2 + Math.random() * 3);
      debris.setPosition(x, y);

      this.scene.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 400 + Math.random() * 200,
        onComplete: () => debris.destroy(),
      });
    }
  }
}
