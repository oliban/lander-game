import Phaser from 'phaser';
import { GAME_HEIGHT } from '../constants';
import { Shark } from '../objects/Shark';
import { FisherBoat } from '../objects/FisherBoat';
import { GolfCart } from '../objects/GolfCart';
import { GreenlandIce } from '../objects/GreenlandIce';
import { Shuttle } from '../objects/Shuttle';
import { Bomb } from '../objects/Bomb';

interface SunkenFood {
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
}

export interface EntityManagerCallbacks {
  getShuttles: () => Shuttle[];
  getSunkenFood: () => SunkenFood[];
  getBombs: () => Bomb[];
  removeSunkenFood: (index: number) => void;
  getWaveOffset: () => number;
  getWaterPollutionLevel: () => number;
  getCameraBounds: () => { left: number; right: number };
}

export class EntityManager {
  private scene: Phaser.Scene;
  private callbacks: EntityManagerCallbacks;

  // Entities
  private sharks: Shark[] = [];
  private fisherBoat: FisherBoat | null = null;
  private golfCart: GolfCart | null = null;
  private greenlandIce: GreenlandIce | null = null;

  // Atlantic Ocean boundaries
  private readonly ATLANTIC_START = 2000;
  private readonly ATLANTIC_END = 5000;
  private readonly WATER_SURFACE = GAME_HEIGHT * 0.75;

  constructor(scene: Phaser.Scene, callbacks: EntityManagerCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  /**
   * Initialize all entities (call from scene's create method)
   */
  initialize(gameMode: string): void {
    // Create fisher boat in Atlantic Ocean
    this.createFisherBoat();

    // Create sharks in Atlantic Ocean
    this.spawnSharks();

    // Create Greenland ice block (not in dogfight mode)
    if (gameMode !== 'dogfight') {
      this.spawnGreenlandIce();
    }

    // Create golf cart (1/3 chance to spawn)
    if (Math.random() < 0.33) {
      this.createGolfCart();
    }
  }

  /**
   * Create fisher boat at fixed position in Atlantic
   */
  private createFisherBoat(): void {
    this.fisherBoat = new FisherBoat(this.scene, 3500);
    // 15% chance the boat has a "fish" package
    this.fisherBoat.hasFishPackage = Math.random() < 0.15;
  }

  /**
   * Spawn sharks distributed across Atlantic Ocean zones
   */
  private spawnSharks(): void {
    const sharkCount = 2 + Math.floor(Math.random() * 2); // 2-3 sharks

    // Divide Atlantic into zones to spread sharks out
    const zoneWidth = (this.ATLANTIC_END - this.ATLANTIC_START) / sharkCount;

    for (let i = 0; i < sharkCount; i++) {
      const zoneStart = this.ATLANTIC_START + i * zoneWidth;
      const zoneEnd = zoneStart + zoneWidth;

      // Spawn in center of zone with some randomness
      const x = zoneStart + zoneWidth * 0.5 + (Math.random() - 0.5) * zoneWidth * 0.3;

      // Patrol within zone (with some overlap allowed)
      const patrolMinX = zoneStart + 50;
      const patrolMaxX = zoneEnd - 50;

      const shark = new Shark(this.scene, x, patrolMinX, patrolMaxX);
      this.sharks.push(shark);
    }
  }

  /**
   * Spawn Greenland ice in Atlantic, avoiding boat and oil platform
   */
  private spawnGreenlandIce(): void {
    // Positions to avoid:
    // - Fisher boat at x=3500 (avoid 3400-3600)
    // - Mid-Atlantic Platform at x=4300 (avoid 4200-4400)
    // Valid spawn zones: 2800-3400 or 3600-4100
    const zones = [
      { min: 2800, max: 3400 },  // Before fisher boat
      { min: 3600, max: 4100 },  // After fisher boat, before oil platform
    ];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const x = zone.min + Math.random() * (zone.max - zone.min);
    this.greenlandIce = new GreenlandIce(this.scene, x);
  }

  /**
   * Create golf cart in USA section
   */
  private createGolfCart(): void {
    this.golfCart = new GolfCart(this.scene, 1000, 800, 1200);
  }

  /**
   * Update all entities (call from scene's update method)
   */
  update(): void {
    // Update fisher boat
    this.updateFisherBoat();

    // Update sharks with off-screen culling for performance
    this.updateSharks();
  }

  /**
   * Update fisher boat (bob with waves, proximity check)
   */
  private updateFisherBoat(): void {
    if (!this.fisherBoat || this.fisherBoat.isDestroyed) return;

    // Check shuttle proximity
    this.checkBoatProximity();

    // Update boat bobbing
    this.fisherBoat.update(this.callbacks.getWaveOffset());
  }

  /**
   * Update sharks with camera culling for performance
   */
  private updateSharks(): void {
    const foodTargets = this.getFoodTargetsInOcean();
    const waveOffset = this.callbacks.getWaveOffset();
    const pollutionLevel = this.callbacks.getWaterPollutionLevel();
    const cameraBounds = this.callbacks.getCameraBounds();

    for (const shark of this.sharks) {
      if (!shark.isDestroyed) {
        // Only fully update sharks near the camera
        const isNearCamera = shark.x >= cameraBounds.left && shark.x <= cameraBounds.right;
        shark.update(waveOffset, pollutionLevel, foodTargets, !isNearCamera);

        // Check if shark can eat any sunken food (only near camera)
        if (isNearCamera) {
          this.checkSharkEatsSunkenFood(shark);
        }
      }
    }
  }

  /**
   * Get food targets in ocean for sharks to pursue
   */
  private getFoodTargetsInOcean(): { x: number; y: number }[] {
    const targets: { x: number; y: number }[] = [];

    // Add sunken food positions
    for (const food of this.callbacks.getSunkenFood()) {
      if (food && food.sprite && food.sprite.active && food.x !== undefined && food.y !== undefined) {
        targets.push({ x: food.x, y: food.y });
      }
    }

    // Add currently falling bombs that are in Atlantic Ocean and underwater
    for (const bomb of this.callbacks.getBombs()) {
      if (bomb && bomb.active && bomb.body &&
          bomb.x >= this.ATLANTIC_START && bomb.x <= this.ATLANTIC_END &&
          bomb.y > this.WATER_SURFACE) {
        targets.push({ x: bomb.x, y: bomb.y });
      }
    }

    return targets;
  }

  /**
   * Check if shark can eat sunken food
   */
  private checkSharkEatsSunkenFood(shark: Shark): void {
    if (!shark.canEatBomb()) return;

    const eatingBounds = shark.getEatingBounds();
    const sunkenFood = this.callbacks.getSunkenFood();

    for (let i = sunkenFood.length - 1; i >= 0; i--) {
      const food = sunkenFood[i];
      if (
        food.x >= eatingBounds.x &&
        food.x <= eatingBounds.x + eatingBounds.width &&
        food.y >= eatingBounds.y &&
        food.y <= eatingBounds.y + eatingBounds.height
      ) {
        // Shark eats the food!
        shark.eatBomb();
        food.sprite.destroy();
        this.callbacks.removeSunkenFood(i);
        break; // Only eat one at a time
      }
    }
  }

  /**
   * Check if any shuttle is near the fishing boat
   */
  private checkBoatProximity(): void {
    if (!this.fisherBoat || this.fisherBoat.isDestroyed) return;

    let shuttleNearby = false;
    for (const shuttle of this.callbacks.getShuttles()) {
      if (!shuttle.active) continue;
      const horizDist = Math.abs(shuttle.x - this.fisherBoat.x);
      const vertDist = Math.abs(shuttle.y - this.fisherBoat.y);
      if (horizDist < 150 && vertDist < 100) {
        shuttleNearby = true;
        break;
      }
    }
    this.fisherBoat.shuttleNearby = shuttleNearby;
  }

  // Getters for GameScene access

  getSharks(): Shark[] {
    return this.sharks;
  }

  getFisherBoat(): FisherBoat | null {
    return this.fisherBoat;
  }

  getGolfCart(): GolfCart | null {
    return this.golfCart;
  }

  getGreenlandIce(): GreenlandIce | null {
    return this.greenlandIce;
  }

  /**
   * Check if fisherboat has fish package and hasn't been collected
   */
  hasFishPackageAvailable(): boolean {
    return this.fisherBoat?.hasFishPackage === true &&
           this.fisherBoat?.fishPackageCollected !== true;
  }

  /**
   * Mark fish package as collected
   */
  collectFishPackage(): void {
    if (this.fisherBoat) {
      this.fisherBoat.fishPackageCollected = true;
    }
  }

  /**
   * Clean up all entities
   */
  destroy(): void {
    for (const shark of this.sharks) {
      shark.destroy();
    }
    this.sharks = [];

    if (this.fisherBoat) {
      this.fisherBoat.destroy();
      this.fisherBoat = null;
    }

    if (this.golfCart) {
      this.golfCart.destroy();
      this.golfCart = null;
    }

    if (this.greenlandIce) {
      this.greenlandIce.destroy();
      this.greenlandIce = null;
    }
  }
}
