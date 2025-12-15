import Phaser from 'phaser';
import { Biplane } from '../objects/Biplane';
import { Shuttle } from '../objects/Shuttle';
import { COUNTRIES } from '../constants';

export interface BiplaneManagerCallbacks {
  getShuttles: () => Shuttle[];
  getMatterPhysics: () => Phaser.Physics.Matter.MatterPhysics;
  playBoingSound: () => void;
}

export class BiplaneManager {
  private scene: Phaser.Scene;
  private callbacks: BiplaneManagerCallbacks;

  private biplane: Biplane | null = null;
  private biplaneTargetCountry: string | null = null;
  private biplaneSpawned: boolean = false;

  private readonly SPAWN_DISTANCE = 1500;
  private readonly VALID_COUNTRIES = ['USA', 'United Kingdom', 'France', 'Switzerland', 'Germany', 'Poland', 'Russia'];
  private readonly BOUNCE_STRENGTH = 8;

  constructor(scene: Phaser.Scene, callbacks: BiplaneManagerCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  /**
   * Initialize biplane target (call from scene's create method)
   * 30% chance for info plane, 70% for country propaganda
   */
  initialize(): void {
    if (Math.random() < 0.3) {
      this.biplaneTargetCountry = 'GAME_INFO';
    } else {
      this.biplaneTargetCountry = this.VALID_COUNTRIES[
        Math.floor(Math.random() * this.VALID_COUNTRIES.length)
      ];
    }
    this.biplaneSpawned = false;
  }

  /**
   * Update biplane spawning, movement, and shuttle collision
   */
  update(time: number): void {
    this.checkSpawnBiplane();
    this.updateBiplane(time);
  }

  /**
   * Check if biplane should spawn based on player proximity to target country
   */
  private checkSpawnBiplane(): void {
    if (this.biplaneSpawned || !this.biplaneTargetCountry) return;

    const shuttles = this.callbacks.getShuttles();

    // For GAME_INFO, check all countries; for propaganda, check only target country
    const countriesToCheck = this.biplaneTargetCountry === 'GAME_INFO'
      ? this.VALID_COUNTRIES
      : [this.biplaneTargetCountry];

    for (const countryName of countriesToCheck) {
      const targetCountryData = COUNTRIES.find(c => c.name === countryName);
      const nextCountryData = COUNTRIES.find(c => c.startX > (targetCountryData?.startX ?? 0));
      if (!targetCountryData) continue;

      const countryStartX = targetCountryData.startX;
      const countryEndX = nextCountryData ? nextCountryData.startX : countryStartX + 6000;
      const countryCenter = countryStartX + (countryEndX - countryStartX) / 2;

      // Check all active shuttles
      for (const shuttle of shuttles) {
        if (!shuttle.active) continue;
        const distToCenter = Math.abs(shuttle.x - countryCenter);
        if (distToCenter < this.SPAWN_DISTANCE) {
          // For GAME_INFO, spawn at the country player is approaching
          const spawnCountry = this.biplaneTargetCountry === 'GAME_INFO' ? countryName : this.biplaneTargetCountry;
          this.biplane = new Biplane(this.scene, this.biplaneTargetCountry, shuttle.x, spawnCountry);
          this.biplaneSpawned = true;
          return;
        }
      }
    }
  }

  /**
   * Update biplane movement and check for shuttle collision
   */
  private updateBiplane(time: number): void {
    if (!this.biplane || this.biplane.isDestroyed) return;

    this.biplane.update(time, 16); // ~60fps delta

    // Check collision with shuttles - bounce off, don't destroy (skip if hidden/waiting)
    if (this.biplane.isHidden) return;

    const bounds = this.biplane.getCollisionBounds();
    const shuttles = this.callbacks.getShuttles();
    const matter = this.callbacks.getMatterPhysics();

    for (const shuttle of shuttles) {
      if (!shuttle.active) continue;

      // Simple AABB collision check
      const shuttleBounds = {
        x: shuttle.x - 14,
        y: shuttle.y - 18,
        width: 28,
        height: 36,
      };

      if (
        shuttleBounds.x < bounds.x + bounds.width &&
        shuttleBounds.x + shuttleBounds.width > bounds.x &&
        shuttleBounds.y < bounds.y + bounds.height &&
        shuttleBounds.y + shuttleBounds.height > bounds.y
      ) {
        // Collision! Bounce shuttle off the plane (don't destroy)
        const body = shuttle.body as MatterJS.BodyType;
        if (body) {
          // Calculate bounce direction based on relative position
          const dx = shuttle.x - this.biplane.x;
          const dy = shuttle.y - this.biplane.y;

          // Strong bounce away from plane
          const normalX = dx / (Math.abs(dx) + Math.abs(dy) + 0.1);
          const normalY = dy / (Math.abs(dx) + Math.abs(dy) + 0.1);

          matter.body.setVelocity(body, {
            x: body.velocity.x + normalX * this.BOUNCE_STRENGTH,
            y: body.velocity.y + normalY * this.BOUNCE_STRENGTH - 2, // Slight upward bias
          });

          // Play boing sound for bouncy collision
          this.callbacks.playBoingSound();
        }
        break;
      }
    }
  }

  /**
   * Get the biplane for external use (e.g., BombManager collision detection)
   */
  getBiplane(): Biplane | null {
    return this.biplane;
  }

  /**
   * Get biplane as array for BombManager (matches expected interface)
   */
  getBiplanes(): Biplane[] {
    return this.biplane ? [this.biplane] : [];
  }

  /**
   * Remove biplane from manager (called when destroyed by bomb)
   */
  removeBiplane(): void {
    this.biplane = null;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.biplane) {
      this.biplane.destroy();
      this.biplane = null;
    }
  }
}
