import Phaser from 'phaser';
import { Bomb } from '../objects/Bomb';
import { Shuttle } from '../objects/Shuttle';
import { InventorySystem } from '../systems/InventorySystem';
import { CountryDecoration } from '../objects/CountryDecoration';
import { Cannon } from '../objects/Cannon';
import { LandingPad } from '../objects/LandingPad';
import { Biplane } from '../objects/Biplane';
import { GolfCart } from '../objects/GolfCart';
import { FisherBoat } from '../objects/FisherBoat';
import { OilTower } from '../objects/OilTower';
import { GreenlandIce } from '../objects/GreenlandIce';
import { Shark } from '../objects/Shark';
import { MedalHouse } from '../objects/MedalHouse';
import { BOMB_DROPPABLE_TYPES, COUNTRIES, GAME_HEIGHT, DOGFIGHT_CONFIG } from '../constants';
import { ScorchMarkManager } from './ScorchMarkManager';
import { PerformanceSettings } from '../systems/PerformanceSettings';

export interface BombCallbacks {
  // Scene methods
  playSound: (key: string, config?: { volume?: number }) => void;
  playSoundIfNotPlaying: (key: string) => void;
  shakeCamera: (duration: number, intensity: number) => void;

  // Terrain
  getTerrainHeightAt: (x: number) => number;

  // Explosion effects
  applyExplosionShockwave: (x: number, y: number) => void;
  showDestructionPoints: (x: number, y: number, points: number, name: string) => void;

  // Scorch marks
  scorchMarkManager: ScorchMarkManager;

  // Achievement tracking
  onBuildingDestroyed: () => void;
  onPlayerKill: (killerPlayer: number) => void;

  // State updates - BombManager doesn't track these, GameScene does
  onKillScored: (killerPlayer: number) => { p1Kills: number; p2Kills: number };
  setKillAlreadyTracked: (value: boolean) => void;
  addDestructionScore: (points: number) => void;
  addDestroyedBuilding: (building: { name: string; points: number; textureKey?: string; country?: string }) => void;

  // Player events
  emitPlayerKill: (killer: number, victim: number, p1Kills: number, p2Kills: number) => void;
  handleShuttleCrash: (playerNum: number, message: string, cause: string) => void;

  // Dogfight
  getGameMode: () => string;
  getPlayerCount: () => number;
  showDogfightWinner: () => void;
  getKillCounts: () => { p1Kills: number; p2Kills: number };

  // Sunken food tracking
  addSunkenFood: (foodData: { x: number; y: number; sprite: Phaser.GameObjects.Sprite }) => void;

  // Epstein files (dropped from golf cart)
  spawnEpsteinFiles: (positions: { x: number; y: number }[]) => void;

  // Propaganda banner (dropped from biplane)
  spawnPropagandaBanner: (x: number, y: number, propagandaType: string, message: string, accentColor: number) => void;
}

export class BombManager {
  private scene: Phaser.Scene;
  private callbacks: BombCallbacks;

  // Bomb state (only tracks bombs, not scores/kills)
  private bombs: Bomb[] = [];
  private bombCooldown: boolean = false;
  private bombCooldown2: boolean = false;

  // Water bounds (cached)
  private atlanticStart: number;
  private atlanticEnd: number;

  // Performance optimization - throttle collision checks
  private lastCollisionCheckTime: number = 0;

  constructor(scene: Phaser.Scene, callbacks: BombCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;

    // Cache water bounds
    this.atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    this.atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
  }

  initialize(): void {
    this.bombs = [];
    this.bombCooldown = false;
    this.bombCooldown2 = false;
  }

  dropBomb(shuttle: Shuttle, inventory: InventorySystem, playerNum: number = 1): void {
    // Find a droppable food item in inventory
    let foodType: string | null = null;

    for (const type of BOMB_DROPPABLE_TYPES) {
      const count = inventory.getCount(type as any);
      if (count > 0) {
        foodType = type;
        break;
      }
    }

    if (!foodType) {
      return;
    }

    // Play space force sound if bombing from above the screen, otherwise random bomb quote
    if (shuttle.y < 0) {
      this.callbacks.playSoundIfNotPlaying('space_force');
    } else {
      const bombQuoteNum = Math.floor(Math.random() * 8) + 1;
      this.callbacks.playSoundIfNotPlaying(`bomb${bombQuoteNum}`);
    }

    // Consume 1 from inventory
    inventory.remove(foodType as any, 1);

    // Create bomb at shuttle position
    const bomb = new Bomb(this.scene, shuttle.x, shuttle.y + 20, foodType, playerNum);

    // Give it the shuttle's velocity plus some downward motion
    const shuttleVel = shuttle.getVelocity();
    bomb.setVelocity(shuttleVel.x * 0.5, shuttleVel.y + 2);

    this.bombs.push(bomb);
  }

  canDropBomb(playerNum: number): boolean {
    return playerNum === 1 ? !this.bombCooldown : !this.bombCooldown2;
  }

  startCooldown(playerNum: number): void {
    if (playerNum === 1) {
      this.bombCooldown = true;
      this.scene.time.delayedCall(300, () => {
        this.bombCooldown = false;
      });
    } else {
      this.bombCooldown2 = true;
      this.scene.time.delayedCall(300, () => {
        this.bombCooldown2 = false;
      });
    }
  }

  update(
    shuttle: Shuttle | null,
    shuttle2: Shuttle | null,
    decorations: CountryDecoration[],
    cannons: Cannon[],
    landingPads: LandingPad[],
    biplanes: Biplane[],
    golfCart: GolfCart | null,
    fisherBoat: FisherBoat | null,
    oilTowers: OilTower[],
    greenlandIce: GreenlandIce | null,
    sharks: Shark[]
  ): void {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];

      if (!bomb || bomb.hasExploded || !bomb.active) {
        this.bombs.splice(i, 1);
        continue;
      }

      const bombX = bomb.x;
      const bombY = bomb.y;
      let bombDestroyed = false;

      // Check collision with OTHER player's shuttle (2-player mode only)
      if (this.callbacks.getPlayerCount() === 2) {
        const targetShuttle = bomb.droppedByPlayer === 1 ? shuttle2 : shuttle;
        if (targetShuttle && targetShuttle.active && !targetShuttle.isDebugMode()) {
          const dx = bombX - targetShuttle.x;
          const dy = bombY - targetShuttle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const hitRadius = 25;

          if (dist < hitRadius) {
            bomb.explode(this.scene);
            this.bombs.splice(i, 1);
            bombDestroyed = true;

            const killerPlayer = bomb.droppedByPlayer;
            const victimPlayer = killerPlayer === 1 ? 2 : 1;

            // Update kills via callback (GameScene tracks the state)
            const kills = this.callbacks.onKillScored(killerPlayer);

            // Track kill achievement
            this.callbacks.onPlayerKill(killerPlayer);

            // Emit event for UI
            this.callbacks.emitPlayerKill(killerPlayer, victimPlayer, kills.p1Kills, kills.p2Kills);

            // Play gotcha sound after 1 second
            this.scene.time.delayedCall(1000, () => {
              const gotchaSound = killerPlayer === 1 ? 'p1_gotcha' : 'p2_gotcha';
              this.callbacks.playSound(gotchaSound);
            });

            // In dogfight mode, check for winner
            if (this.callbacks.getGameMode() === 'dogfight') {
              if (kills.p1Kills >= DOGFIGHT_CONFIG.KILLS_TO_WIN || kills.p2Kills >= DOGFIGHT_CONFIG.KILLS_TO_WIN) {
                targetShuttle.explode();
                this.callbacks.showDogfightWinner();
                return;
              }
            }

            // Kill the target shuttle
            const causeEmoji = victimPlayer === 1 ? 'p1_bombed' : 'p2_bombed';
            this.callbacks.setKillAlreadyTracked(true);
            this.callbacks.handleShuttleCrash(victimPlayer, `Bombed by P${killerPlayer}!`, causeEmoji);
          }
        }
      }

      if (bombDestroyed) continue;

      // Check collision with OWN shuttle (self-bomb) - skip if within 0.5s grace period
      const timeSinceDropped = Date.now() - bomb.createdAt;
      if (timeSinceDropped >= 500) {
        const ownShuttle = bomb.droppedByPlayer === 1 ? shuttle : shuttle2;
        if (ownShuttle && ownShuttle.active && !ownShuttle.isDebugMode()) {
          const dx = bombX - ownShuttle.x;
          const dy = bombY - ownShuttle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const hitRadius = 25;

          if (dist < hitRadius) {
            bomb.explode(this.scene);
            this.bombs.splice(i, 1);
            bombDestroyed = true;

            const playerNum = bomb.droppedByPlayer;

            // Play "that was clever" sound after 1 second
            this.scene.time.delayedCall(1000, () => {
              this.callbacks.playSound('self_bomb');
            });

            // Kill the shuttle that bombed itself
            this.callbacks.handleShuttleCrash(playerNum, 'Self-bombed!', 'self_bomb');
          }
        }
      }

      if (bombDestroyed) continue;

      // Performance optimization: Get terrain height and skip expensive collision checks
      // for bombs that are still high in the air (nothing to hit yet)
      const terrainY = this.callbacks.getTerrainHeightAt(bombX);
      const heightAboveTerrain = terrainY - bombY;

      // Only check ground-based collisions when bomb is close to ground level
      // Most buildings are ~200px tall at most, so check when within 250px of terrain
      const shouldCheckGroundCollisions = heightAboveTerrain < 250;

      // Performance: Check collision throttle interval for expensive object checks
      const now = Date.now();
      const collisionInterval = PerformanceSettings.getPreset().collisionCheckInterval;
      const shouldDoFullCollisionCheck = collisionInterval === 0 ||
        (now - this.lastCollisionCheckTime >= collisionInterval);

      if (shouldCheckGroundCollisions && shouldDoFullCollisionCheck) {
        // Check collision with buildings
        bombDestroyed = this.checkDecorationCollisions(bomb, bombX, bombY, decorations);
        if (bombDestroyed) {
          this.bombs.splice(i, 1);
          continue;
        }

        // Check collision with cannons
        bombDestroyed = this.checkCannonCollisions(bomb, bombX, bombY, cannons);
        if (bombDestroyed) {
          this.bombs.splice(i, 1);
          continue;
        }

        // Check collision with landing pads
        bombDestroyed = this.checkLandingPadCollisions(bomb, bombX, bombY, landingPads);
        if (bombDestroyed) {
          this.bombs.splice(i, 1);
          continue;
        }

        // Check collision with golf cart
        bombDestroyed = this.checkGolfCartCollision(bomb, bombX, bombY, golfCart);
        if (bombDestroyed) {
          this.bombs.splice(i, 1);
          continue;
        }

        // Check collision with fisher boat
        bombDestroyed = this.checkFisherBoatCollision(bomb, bombX, bombY, fisherBoat);
        if (bombDestroyed) {
          this.bombs.splice(i, 1);
          continue;
        }

        // Check collision with oil towers
        bombDestroyed = this.checkOilTowerCollisions(bomb, bombX, bombY, oilTowers);
        if (bombDestroyed) {
          this.bombs.splice(i, 1);
          continue;
        }

        // Check collision with Greenland ice
        bombDestroyed = this.checkGreenlandIceCollision(bomb, bombX, bombY, greenlandIce);
        if (bombDestroyed) {
          this.bombs.splice(i, 1);
          continue;
        }

        // Check collision with sharks (in water)
        bombDestroyed = this.checkSharkCollisions(bomb, bombX, bombY, sharks);
        if (bombDestroyed) {
          this.bombs.splice(i, 1);
          continue;
        }

        this.lastCollisionCheckTime = now;
      }

      // Biplanes fly in the air, so check them regardless of height
      if (shouldDoFullCollisionCheck) {
        bombDestroyed = this.checkBiplaneCollisions(bomb, bombX, bombY, biplanes);
        if (bombDestroyed) {
          this.bombs.splice(i, 1);
          continue;
        }
      }

      // Check collision with terrain - always check this (terrainY already calculated above)
      if (bombY >= terrainY - 5) {
        const isOverWater = bombX >= this.atlanticStart && bombX < this.atlanticEnd;

        if (isOverWater) {
          this.sinkBombInWater(bomb, terrainY, sharks);
          this.bombs.splice(i, 1);
          continue;
        }

        // Normal terrain - explode
        bomb.explode(this.scene);

        // Create bomb crater scorch mark
        this.callbacks.scorchMarkManager.createBombCrater(bombX, terrainY);

        // Play explosion sound
        const groundExplosionNum = Math.floor(Math.random() * 3) + 1;
        this.callbacks.playSound(`explosion${groundExplosionNum}`, { volume: 0.4 });

        // Apply shockwave
        this.callbacks.applyExplosionShockwave(bombX, terrainY);

        this.bombs.splice(i, 1);
        continue;
      }

      // Remove bombs that fall off screen
      if (bombY > GAME_HEIGHT + 200) {
        bomb.destroy();
        this.bombs.splice(i, 1);
      }
    }
  }

  private checkDecorationCollisions(
    bomb: Bomb,
    bombX: number,
    bombY: number,
    decorations: CountryDecoration[]
  ): boolean {
    for (let j = decorations.length - 1; j >= 0; j--) {
      const decoration = decorations[j];
      if (decoration.isDestroyed || !decoration.visible) continue;

      if (Math.abs(bombX - decoration.x) > 150) continue;

      const bounds = decoration.getCollisionBounds();

      if (
        bombX >= bounds.x &&
        bombX <= bounds.x + bounds.width &&
        bombY >= bounds.y &&
        bombY <= bounds.y + bounds.height
      ) {
        this.callbacks.shakeCamera(200, 0.01);
        bomb.hasExploded = true;
        bomb.destroy();

        const explosionNum = Math.floor(Math.random() * 3) + 1;
        this.callbacks.playSound(`explosion${explosionNum}`, { volume: 0.5 });
        const bombHitNum = Math.floor(Math.random() * 5) + 1;
        this.scene.time.delayedCall(1500, () => {
          this.callbacks.playSoundIfNotPlaying(`bombhit${bombHitNum}`);
        });

        this.callbacks.applyExplosionShockwave(decoration.x, decoration.y);

        const { name, points, textureKey, country } = decoration.explode();
        this.callbacks.addDestructionScore(points);
        this.callbacks.addDestroyedBuilding({ name, points, textureKey, country });

        this.callbacks.onBuildingDestroyed();
        this.callbacks.scorchMarkManager.clearScorchMarksInArea(bounds);

        if (decoration instanceof MedalHouse) {
          this.scene.time.delayedCall(500, () => {
            this.callbacks.playSound('sorry_johnny');
          });
        }

        this.callbacks.showDestructionPoints(decoration.x, decoration.y - 50, points, name);
        decorations.splice(j, 1);

        return true;
      }
    }
    return false;
  }

  private checkCannonCollisions(
    bomb: Bomb,
    bombX: number,
    bombY: number,
    cannons: Cannon[]
  ): boolean {
    for (let j = cannons.length - 1; j >= 0; j--) {
      const cannon = cannons[j];
      if (!cannon.isActive()) continue;

      const bounds = cannon.getCollisionBounds();

      if (
        bombX >= bounds.x &&
        bombX <= bounds.x + bounds.width &&
        bombY >= bounds.y &&
        bombY <= bounds.y + bounds.height
      ) {
        bomb.explode(this.scene);

        const explosionNum = Math.floor(Math.random() * 3) + 1;
        this.callbacks.playSound(`explosion${explosionNum}`, { volume: 0.5 });
        const cannonHitNum = Math.floor(Math.random() * 5) + 1;
        this.callbacks.playSoundIfNotPlaying(`bombhit${cannonHitNum}`);

        // Cannon doesn't have name/points properties, use hardcoded values
        const name = 'Cannon';
        const points = 200;
        cannon.explode();
        this.callbacks.addDestructionScore(points);
        this.callbacks.addDestroyedBuilding({ name, points });

        this.callbacks.showDestructionPoints(cannon.x, cannon.y - 30, points, name);
        this.callbacks.applyExplosionShockwave(bombX, bombY);

        return true;
      }
    }
    return false;
  }

  // Landing pads cannot be destroyed by bombs - they're infrastructure
  private checkLandingPadCollisions(
    _bomb: Bomb,
    _bombX: number,
    _bombY: number,
    _landingPads: LandingPad[]
  ): boolean {
    // Landing pads don't get destroyed by bombs - bombs pass through
    return false;
  }

  private checkBiplaneCollisions(
    bomb: Bomb,
    bombX: number,
    bombY: number,
    biplanes: Biplane[]
  ): boolean {
    for (let j = biplanes.length - 1; j >= 0; j--) {
      const biplane = biplanes[j];
      if (biplane.isDestroyed) continue;

      const bounds = biplane.getCollisionBounds();

      if (
        bombX >= bounds.x &&
        bombX <= bounds.x + bounds.width &&
        bombY >= bounds.y &&
        bombY <= bounds.y + bounds.height
      ) {
        bomb.explode(this.scene);

        const { name, points, bannerPosition, propagandaType, message, accentColor } = biplane.explode();
        this.callbacks.addDestructionScore(points);
        this.callbacks.addDestroyedBuilding({ name, points });

        const explosionNum = Math.floor(Math.random() * 3) + 1;
        this.callbacks.playSound(`explosion${explosionNum}`, { volume: 0.5 });

        this.callbacks.showDestructionPoints(biplane.x, biplane.y - 30, points, name);
        this.callbacks.applyExplosionShockwave(bombX, bombY);

        // Spawn propaganda banner from the destroyed biplane
        this.callbacks.spawnPropagandaBanner(
          bannerPosition.x,
          bannerPosition.y,
          propagandaType,
          message,
          accentColor
        );

        biplanes.splice(j, 1);
        return true;
      }
    }
    return false;
  }

  private checkGolfCartCollision(
    bomb: Bomb,
    bombX: number,
    bombY: number,
    golfCart: GolfCart | null
  ): boolean {
    if (!golfCart || golfCart.isDestroyed) return false;

    const bounds = golfCart.getCollisionBounds();

    if (
      bombX >= bounds.x &&
      bombX <= bounds.x + bounds.width &&
      bombY >= bounds.y &&
      bombY <= bounds.y + bounds.height
    ) {
      bomb.explode(this.scene);

      const { name, points, filePositions } = golfCart.explode();
      this.callbacks.addDestructionScore(points);
      this.callbacks.addDestroyedBuilding({ name, points });

      const explosionNum = Math.floor(Math.random() * 3) + 1;
      this.callbacks.playSound(`explosion${explosionNum}`, { volume: 0.5 });

      this.callbacks.showDestructionPoints(golfCart.x, golfCart.y - 30, points, name);
      this.callbacks.applyExplosionShockwave(bombX, bombY);

      // Spawn Epstein files at the returned positions
      if (filePositions && filePositions.length > 0) {
        this.callbacks.spawnEpsteinFiles(filePositions);
      }

      return true;
    }
    return false;
  }

  private checkFisherBoatCollision(
    bomb: Bomb,
    bombX: number,
    bombY: number,
    fisherBoat: FisherBoat | null
  ): boolean {
    if (!fisherBoat || fisherBoat.isDestroyed) return false;

    const bounds = fisherBoat.getCollisionBounds();

    if (
      bombX >= bounds.x &&
      bombX <= bounds.x + bounds.width &&
      bombY >= bounds.y &&
      bombY <= bounds.y + bounds.height
    ) {
      bomb.explode(this.scene);

      const { name, points } = fisherBoat.explode();
      this.callbacks.addDestructionScore(points);
      this.callbacks.addDestroyedBuilding({ name, points });

      const explosionNum = Math.floor(Math.random() * 3) + 1;
      this.callbacks.playSound(`explosion${explosionNum}`, { volume: 0.5 });

      this.callbacks.showDestructionPoints(fisherBoat.x, fisherBoat.y - 30, points, name);
      this.callbacks.applyExplosionShockwave(bombX, bombY);

      return true;
    }
    return false;
  }

  private checkOilTowerCollisions(
    bomb: Bomb,
    bombX: number,
    bombY: number,
    oilTowers: OilTower[]
  ): boolean {
    for (let j = oilTowers.length - 1; j >= 0; j--) {
      const tower = oilTowers[j];
      if (tower.isDestroyed) continue;

      const bounds = tower.getCollisionBounds();

      if (
        bombX >= bounds.x &&
        bombX <= bounds.x + bounds.width &&
        bombY >= bounds.y &&
        bombY <= bounds.y + bounds.height
      ) {
        bomb.explode(this.scene);

        const explosionNum = Math.floor(Math.random() * 3) + 1;
        this.callbacks.playSound(`explosion${explosionNum}`, { volume: 0.6 });

        const { name, points } = tower.explode();
        this.callbacks.addDestructionScore(points);
        this.callbacks.addDestroyedBuilding({ name, points });

        this.callbacks.applyExplosionShockwave(bombX, bombY);

        return true;
      }
    }
    return false;
  }

  private checkGreenlandIceCollision(
    bomb: Bomb,
    bombX: number,
    bombY: number,
    greenlandIce: GreenlandIce | null
  ): boolean {
    if (!greenlandIce || greenlandIce.isDestroyed) return false;

    const bounds = greenlandIce.getCollisionBounds();

    if (
      bombX >= bounds.x &&
      bombX <= bounds.x + bounds.width &&
      bombY >= bounds.y &&
      bombY <= bounds.y + bounds.height
    ) {
      bomb.explode(this.scene);

      // GreenlandIce.explode() returns void, use hardcoded values
      const name = 'Greenland Ice';
      const points = 100;
      greenlandIce.explode();
      this.callbacks.addDestructionScore(points);
      this.callbacks.addDestroyedBuilding({ name, points });

      this.callbacks.playSound('ice_break', { volume: 0.5 });

      const explosionNum = Math.floor(Math.random() * 3) + 1;
      this.callbacks.playSound(`explosion${explosionNum}`, { volume: 0.4 });

      this.callbacks.showDestructionPoints(greenlandIce.x, greenlandIce.y - 30, points, name);
      this.callbacks.applyExplosionShockwave(bombX, bombY);

      return true;
    }
    return false;
  }

  private checkSharkCollisions(
    bomb: Bomb,
    bombX: number,
    bombY: number,
    sharks: Shark[]
  ): boolean {
    for (const shark of sharks) {
      if (shark.isDestroyed) continue;

      const bounds = shark.getCollisionBounds();

      if (
        bombX >= bounds.x &&
        bombX <= bounds.x + bounds.width &&
        bombY >= bounds.y &&
        bombY <= bounds.y + bounds.height
      ) {
        bomb.explode(this.scene);

        const { name, points } = shark.explode();

        // Award points for bombing shark (500 points whether alive or dead)
        const awardPoints = points > 0 ? points : 500;
        this.callbacks.addDestructionScore(awardPoints);
        this.callbacks.addDestroyedBuilding({ name, points: awardPoints });
        this.callbacks.showDestructionPoints(shark.x, shark.y - 30, awardPoints, name);

        const explosionNum = Math.floor(Math.random() * 3) + 1;
        this.callbacks.playSound(`explosion${explosionNum}`, { volume: 0.4 });

        this.callbacks.applyExplosionShockwave(bombX, bombY);

        return true;
      }
    }
    return false;
  }

  private sinkBombInWater(bomb: Bomb, waterLevel: number, sharks: Shark[]): void {
    const bombX = bomb.x;

    // Check if any shark can eat this bomb
    for (const shark of sharks) {
      if (shark.isDestroyed || !shark.canEatBomb()) continue;

      const eatingBounds = shark.getEatingBounds();
      if (
        bombX >= eatingBounds.x &&
        bombX <= eatingBounds.x + eatingBounds.width
      ) {
        shark.eatBomb();
        bomb.destroy();
        return;
      }
    }

    // Map food types to sprite keys
    const spriteMap: { [key: string]: string } = {
      'BURGER': 'burger',
      'HAMBERDER': 'hamberder',
      'DIET_COKE': 'dietcoke',
      'TRUMP_STEAK': 'trumpsteak',
      'VODKA': 'vodka',
    };
    const spriteKey = spriteMap[bomb.foodType] || 'burger';

    // Small splash effect
    for (let i = 0; i < 8; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      const speed = 2 + Math.random() * 4;
      const droplet = this.scene.add.graphics();
      droplet.fillStyle(0x4169E1, 0.7);
      droplet.fillCircle(0, 0, 2 + Math.random() * 3);
      droplet.setPosition(bombX + (Math.random() - 0.5) * 20, waterLevel);
      droplet.setDepth(101);

      this.scene.tweens.add({
        targets: droplet,
        x: droplet.x + Math.cos(angle) * speed * 10,
        y: droplet.y + Math.sin(angle) * speed * 12 + 30,
        alpha: 0,
        duration: 400 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => droplet.destroy(),
      });
    }

    // Small ripple
    const ripple = this.scene.add.graphics();
    ripple.lineStyle(2, 0x87CEEB, 0.6);
    ripple.strokeCircle(bombX, waterLevel, 5);
    ripple.setDepth(99);

    this.scene.tweens.add({
      targets: ripple,
      scaleX: 3,
      scaleY: 0.4,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => ripple.destroy(),
    });

    // Create sinking food sprite
    const sinkingFood = this.scene.add.sprite(bombX, waterLevel, spriteKey);
    sinkingFood.setScale(0.06);
    sinkingFood.setDepth(50);

    const finalY = waterLevel + 120;
    const foodData = { x: bombX, y: finalY, sprite: sinkingFood };

    this.scene.tweens.add({
      targets: sinkingFood,
      y: finalY,
      alpha: 0.5,
      angle: sinkingFood.angle + 30,
      duration: 2000,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.callbacks.addSunkenFood(foodData);
      },
    });

    // Bubbles
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(200 + i * 200, () => {
        const bubble = this.scene.add.graphics();
        bubble.fillStyle(0xADD8E6, 0.5);
        bubble.fillCircle(0, 0, 2);
        bubble.setPosition(bombX + (Math.random() - 0.5) * 10, waterLevel + 30 + i * 15);
        bubble.setDepth(98);

        this.scene.tweens.add({
          targets: bubble,
          y: bubble.y - 40,
          alpha: 0,
          duration: 400,
          ease: 'Quad.easeOut',
          onComplete: () => bubble.destroy(),
        });
      });
    }

    bomb.destroy();
  }

  // Getters
  getBombs(): Bomb[] {
    return this.bombs;
  }

  getBombCount(): number {
    return this.bombs.length;
  }
}
