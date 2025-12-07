import Phaser from 'phaser';
import { Shuttle } from '../objects/Shuttle';
import { Terrain } from '../objects/Terrain';
import { LandingPad } from '../objects/LandingPad';
import { Cannon } from '../objects/Cannon';
import { Collectible, spawnCollectibles } from '../objects/Collectible';
import { FuelSystem } from '../systems/FuelSystem';
import { InventorySystem } from '../systems/InventorySystem';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  WORLD_WIDTH,
  COUNTRIES,
  LANDING_PADS,
} from '../constants';

type GameState = 'playing' | 'landed' | 'crashed' | 'victory';

export class GameScene extends Phaser.Scene {
  private shuttle!: Shuttle;
  private terrain!: Terrain;
  private landingPads: LandingPad[] = [];
  private cannons: Cannon[] = [];
  private collectibles: Collectible[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fuelSystem!: FuelSystem;
  private inventorySystem!: InventorySystem;
  private gameState: GameState = 'playing';
  private starfield!: Phaser.GameObjects.Graphics;
  private currentCountryText!: Phaser.GameObjects.Text;
  private startPadId: number = 0; // Track which pad we started on to ignore initial collision
  private invulnerable: boolean = true; // Brief invulnerability at start

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.gameState = 'playing';

    // Initialize systems
    this.fuelSystem = new FuelSystem();
    this.inventorySystem = new InventorySystem();

    // Create starfield background
    this.createStarfield();

    // Create terrain
    this.terrain = new Terrain(this, 0, WORLD_WIDTH);

    // Create landing pads
    this.createLandingPads();

    // Create cannons
    this.createCannons();

    // Create collectibles
    this.collectibles = spawnCollectibles(
      this,
      0,
      WORLD_WIDTH,
      (x) => this.terrain.getHeightAt(x)
    );

    // Create shuttle - start landed on first pad
    const startPad = this.landingPads[0];
    this.startPadId = 0; // Remember we started on pad 0
    // Position shuttle well above the pad surface
    // The shuttle's bottom is 18px below center, so place center 40px above pad surface to be safe
    const shuttleStartY = startPad.y - 40;
    console.log('Starting shuttle at:', startPad.x, shuttleStartY, 'pad.y:', startPad.y);
    this.shuttle = new Shuttle(this, startPad.x, shuttleStartY);
    this.shuttle.setFuelSystem(this.fuelSystem);
    // Start with zero velocity (landed) and static until player presses thrust
    this.shuttle.setVelocity(0, 0);
    this.shuttle.setStatic(true);

    // Invulnerability at start - prevents crashes until player launches
    this.invulnerable = true;

    // Set up camera - allow some space above for flying high
    this.cameras.main.setBounds(0, -300, WORLD_WIDTH, GAME_HEIGHT + 300);
    // IMPORTANT: Center camera on shuttle FIRST before enabling follow
    this.cameras.main.centerOn(this.shuttle.x, this.shuttle.y);
    this.cameras.main.startFollow(this.shuttle, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(200, 100);

    // Removed bloom effect - was causing visual issues

    // Set up input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Set up collision detection
    this.setupCollisions();

    // Start UI scene
    this.scene.launch('UIScene', {
      fuelSystem: this.fuelSystem,
      inventorySystem: this.inventorySystem,
      getShuttleVelocity: () => this.shuttle.getVelocity(),
      getProgress: () => this.getProgress(),
      getCurrentCountry: () => this.getCurrentCountry(),
      getLegsExtended: () => this.shuttle.areLandingLegsExtended(),
    });

    // Country indicator
    this.currentCountryText = this.add.text(GAME_WIDTH / 2, 20, '', {
      fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.currentCountryText.setOrigin(0.5, 0);

    // Handle first thrust - enable physics and collisions
    let hasLaunched = false;
    const launchHandler = () => {
      if (!hasLaunched && this.cursors.up.isDown) {
        hasLaunched = true;
        console.log('Launching shuttle - enabling physics');
        this.shuttle.setStatic(false);
        // Short delay before enabling collision damage (let player get away from start)
        this.time.delayedCall(800, () => {
          console.log('Invulnerability ended');
          this.invulnerable = false;
        });
      }
    };
    this.events.on('update', launchHandler);
    this.currentCountryText.setScrollFactor(0);
    // Removed postFX glow - was causing black screen issues
  }

  private createStarfield(): void {
    // Solid sky background (failsafe - always visible)
    const skyBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x87CEEB);
    skyBg.setScrollFactor(0);
    skyBg.setDepth(-110);

    // Draw sky gradient background
    this.starfield = this.add.graphics();
    this.starfield.setScrollFactor(0);
    this.starfield.setDepth(-100);

    // Sky gradient from light blue to lighter blue at horizon
    for (let y = 0; y < GAME_HEIGHT; y++) {
      const ratio = y / GAME_HEIGHT;
      const r = Math.floor(135 - ratio * 30);
      const g = Math.floor(206 - ratio * 50);
      const b = Math.floor(235 - ratio * 20);
      this.starfield.fillStyle((r << 16) | (g << 8) | b);
      this.starfield.fillRect(0, y, GAME_WIDTH, 1);
    }

    // Draw some clouds with parallax
    const cloudGraphics = this.add.graphics();
    cloudGraphics.setScrollFactor(0.02);
    cloudGraphics.setDepth(-90);

    for (let i = 0; i < 20; i++) {
      const x = Math.random() * GAME_WIDTH * 5;
      const y = 50 + Math.random() * 200;
      const scale = 0.5 + Math.random() * 0.8;

      cloudGraphics.fillStyle(0xFFFFFF, 0.8);
      cloudGraphics.fillCircle(x, y, 25 * scale);
      cloudGraphics.fillCircle(x + 20 * scale, y - 8 * scale, 20 * scale);
      cloudGraphics.fillCircle(x + 40 * scale, y, 28 * scale);
      cloudGraphics.fillCircle(x + 20 * scale, y + 8 * scale, 18 * scale);
    }

    // Sun
    const sun = this.add.graphics();
    sun.setScrollFactor(0);
    sun.setDepth(-95);
    sun.fillStyle(0xFFDD00);
    sun.fillCircle(100, 80, 40);
    sun.fillStyle(0xFFFF88, 0.3);
    sun.fillCircle(100, 80, 55);
  }

  private createLandingPads(): void {
    for (let i = 0; i < LANDING_PADS.length; i++) {
      const padData = LANDING_PADS[i];
      const terrainY = this.terrain.getHeightAt(padData.x);
      const isFinal = i === LANDING_PADS.length - 1;

      const pad = new LandingPad(
        this,
        padData.x,
        terrainY,
        padData.width,
        padData.name,
        isFinal
      );
      this.landingPads.push(pad);
    }
  }

  private createCannons(): void {
    // Place cannons based on country cannon density
    for (const country of COUNTRIES) {
      if (country.cannonDensity <= 0) continue;

      const nextCountry = COUNTRIES[COUNTRIES.indexOf(country) + 1];
      const endX = nextCountry ? nextCountry.startX : WORLD_WIDTH;

      // Calculate number of cannons
      const countryWidth = endX - country.startX;
      const numCannons = Math.floor(countryWidth * country.cannonDensity / 500);

      for (let i = 0; i < numCannons; i++) {
        const x = country.startX + (countryWidth / (numCannons + 1)) * (i + 1);

        // Skip if too close to landing pads
        const tooCloseTopad = LANDING_PADS.some(
          (pad) => Math.abs(pad.x - x) < 200
        );
        if (tooCloseTopad) continue;

        const y = this.terrain.getHeightAt(x) - 15;
        const cannon = new Cannon(this, x, y);
        this.cannons.push(cannon);
      }
    }
  }

  private setupCollisions(): void {
    // Collision with terrain
    this.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      for (const pair of event.pairs) {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        // Check shuttle collision with terrain
        if (this.isShuttleCollision(bodyA, bodyB, 'terrain')) {
          this.handleTerrainCollision();
        }

        // Check shuttle collision with landing pad
        if (this.isShuttleCollision(bodyA, bodyB, 'landingPad')) {
          const padBody = bodyA.label === 'landingPad' ? bodyA : bodyB;
          const pad = (padBody as unknown as { landingPadRef: LandingPad }).landingPadRef;
          if (pad) {
            this.handleLandingPadCollision(pad);
          }
        }

        // Check shuttle collision with projectile
        if (this.isShuttleCollision(bodyA, bodyB, 'projectile')) {
          this.handleProjectileHit();
        }

        // Check shuttle collision with collectible
        if (this.isShuttleCollision(bodyA, bodyB, 'collectible')) {
          const collectibleBody = bodyA.label === 'collectible' ? bodyA : bodyB;
          const collectible = (collectibleBody as unknown as { collectibleRef: Collectible }).collectibleRef;
          if (collectible) {
            this.handleCollectiblePickup(collectible);
          }
        }
      }
    });
  }

  private isShuttleCollision(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType, label: string): boolean {
    const isShuttleA = bodyA.label === 'Body' || bodyA.label === 'Rectangle Body';
    const isShuttleB = bodyB.label === 'Body' || bodyB.label === 'Rectangle Body';

    return (isShuttleA && bodyB.label === label) || (isShuttleB && bodyA.label === label);
  }

  private handleTerrainCollision(): void {
    if (this.gameState !== 'playing') return;
    if (this.invulnerable) return; // Ignore collisions during invulnerability

    // Get the actual terrain height at shuttle position
    const terrainHeight = this.terrain.getHeightAt(this.shuttle.x);
    const shuttleBottom = this.shuttle.y + 18; // Shuttle's bottom edge

    // Only count as terrain collision if shuttle is actually near the terrain surface
    // Allow 30 pixel tolerance for physics body imprecision
    if (shuttleBottom < terrainHeight - 30) {
      console.log('Ignoring terrain collision - shuttle too high. shuttleBottom:', shuttleBottom.toFixed(1), 'terrainHeight:', terrainHeight.toFixed(1));
      return;
    }

    console.log('CRASH: Terrain collision at', { x: this.shuttle.x, y: this.shuttle.y }, 'terrainHeight:', terrainHeight.toFixed(1));

    this.gameState = 'crashed';
    this.shuttle.explode();

    this.time.delayedCall(500, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        victory: false,
        message: 'You crashed into the terrain!',
        score: 0,
      });
    });
  }

  private handleLandingPadCollision(pad: LandingPad): void {
    if (this.gameState !== 'playing') return;
    if (this.invulnerable) return; // Ignore collisions during invulnerability

    // Shuttle must be very close to the pad surface to count as a landing
    // The shuttle's bottom is about 18 pixels below its center
    const shuttleBottom = this.shuttle.y + 18;
    const distanceFromPad = pad.y - shuttleBottom;

    // Check horizontal alignment - shuttle must be centered over the pad
    const halfPadWidth = pad.width / 2;
    const horizontalDistance = Math.abs(this.shuttle.x - pad.x);
    if (horizontalDistance > halfPadWidth) {
      console.log('Ignoring pad collision - shuttle not horizontally aligned. shuttle.x:', this.shuttle.x.toFixed(1), 'pad.x:', pad.x, 'distance:', horizontalDistance.toFixed(1));
      return;
    }

    // Only count as landing if shuttle bottom is within 10 pixels of the pad surface
    // distanceFromPad > 0 means shuttle is above pad, < 0 means below
    // Tighter check: must be very close to pad surface
    if (distanceFromPad < -5 || distanceFromPad > 10) {
      console.log('Ignoring pad collision - shuttle not on pad surface. shuttleBottom:', shuttleBottom.toFixed(1), 'pad.y:', pad.y.toFixed(1), 'distance:', distanceFromPad.toFixed(1));
      return;
    }

    // Ignore collision with the start pad until we've left it
    const padIndex = this.landingPads.indexOf(pad);
    if (padIndex === this.startPadId) {
      // Check if we've moved away from start pad before (velocity check)
      const velocity = this.shuttle.getVelocity();
      if (velocity.total < 0.5) {
        // Still on start pad, haven't really taken off yet
        return;
      }
      // We've returned to start pad after flying, allow landing
      this.startPadId = -1; // Clear so future landings work
    }

    const velocity = this.shuttle.getVelocity();
    console.log('Valid pad collision detected. shuttleBottom:', shuttleBottom.toFixed(1), 'pad.y:', pad.y.toFixed(1), 'distance:', distanceFromPad.toFixed(1), 'velocity:', velocity.total.toFixed(2));

    const landingResult = this.shuttle.checkLandingSafety();

    if (!landingResult.safe) {
      console.log('CRASH: Bad landing on pad', pad.name, 'at', { x: this.shuttle.x, y: this.shuttle.y }, 'pad.y:', pad.y, 'reason:', landingResult.reason);

      this.gameState = 'crashed';
      this.shuttle.explode();

      this.time.delayedCall(500, () => {
        this.scene.stop('UIScene');
        this.scene.start('GameOverScene', {
          victory: false,
          message: `Crash landing! ${landingResult.reason}`,
          score: 0,
        });
      });
      return;
    }

    // Successful landing
    this.gameState = 'landed';

    // Stop shuttle
    this.shuttle.setVelocity(0, 0);
    this.shuttle.setAngularVelocity(0);

    if (pad.isFinalDestination) {
      // Victory!
      this.time.delayedCall(1500, () => {
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.start('GameOverScene', {
          victory: true,
          message: "You've reached Putino's Palace! Peace delivered!",
          score: this.inventorySystem.getTotalFuelValue() + Math.floor(this.fuelSystem.getFuel()),
        });
      });
    } else {
      // Open trading scene
      this.time.delayedCall(1000, () => {
        this.scene.pause();
        this.scene.launch('TradingScene', {
          inventorySystem: this.inventorySystem,
          fuelSystem: this.fuelSystem,
          padName: pad.name,
          landingQuality: landingResult.quality,
          onComplete: () => {
            this.scene.resume();
            this.gameState = 'playing';
          },
        });
      });
    }
  }

  private handleProjectileHit(): void {
    if (this.gameState !== 'playing') return;

    console.log('CRASH: Hit by projectile at', { x: this.shuttle.x, y: this.shuttle.y });

    this.gameState = 'crashed';
    this.shuttle.explode();

    this.time.delayedCall(500, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        victory: false,
        message: 'Shot down by enemy cannons!',
        score: 0,
      });
    });
  }

  private handleCollectiblePickup(collectible: Collectible): void {
    if (collectible.collected) return;

    this.inventorySystem.add(collectible.collectibleType);
    collectible.collect();

    // Remove from array
    const index = this.collectibles.indexOf(collectible);
    if (index > -1) {
      this.collectibles.splice(index, 1);
    }
  }

  private getProgress(): number {
    return Phaser.Math.Clamp(this.shuttle.x / WORLD_WIDTH, 0, 1);
  }

  private getCurrentCountry(): { name: string; color: number } {
    const x = this.shuttle.x;
    for (let i = COUNTRIES.length - 1; i >= 0; i--) {
      if (x >= COUNTRIES[i].startX) {
        return COUNTRIES[i];
      }
    }
    return COUNTRIES[0];
  }

  update(time: number): void {
    if (this.gameState !== 'playing') return;

    // Update terrain (for animated ocean waves)
    this.terrain.update();

    // Update shuttle
    this.shuttle.update(this.cursors);

    // Update cannons
    for (const cannon of this.cannons) {
      // Only update cannons that are visible
      const cameraLeft = this.cameras.main.scrollX - 200;
      const cameraRight = this.cameras.main.scrollX + GAME_WIDTH + 200;

      if (cannon.x >= cameraLeft && cannon.x <= cameraRight) {
        cannon.setTarget({ x: this.shuttle.x, y: this.shuttle.y });
        cannon.update(time);

        // Check projectile collisions manually
        for (const projectile of cannon.getProjectiles()) {
          const dx = projectile.x - this.shuttle.x;
          const dy = projectile.y - this.shuttle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 25) {
            this.handleProjectileHit();
          }
        }
      }
    }

    // Update country display
    const country = this.getCurrentCountry();
    this.currentCountryText.setText(country.name);
    this.currentCountryText.setColor('#' + country.color.toString(16).padStart(6, '0'));

    // Check for out of fuel while in air
    if (this.fuelSystem.isEmpty() && this.shuttle.body!.velocity.y > 0.5) {
      // Show warning (handled in UI)
    }

    // Check if fell off the bottom
    if (this.shuttle.y > GAME_HEIGHT + 100) {
      this.gameState = 'crashed';
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        victory: false,
        message: 'Lost in the void!',
        score: 0,
      });
    }
  }
}
