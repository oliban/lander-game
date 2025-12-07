import Phaser from 'phaser';
import { Shuttle } from '../objects/Shuttle';
import { Terrain } from '../objects/Terrain';
import { LandingPad } from '../objects/LandingPad';
import { Cannon } from '../objects/Cannon';
import { Collectible, spawnCollectibles } from '../objects/Collectible';
import { CountryDecoration, getCountryAssetPrefix } from '../objects/CountryDecoration';
import { FuelSystem } from '../systems/FuelSystem';
import { InventorySystem } from '../systems/InventorySystem';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  WORLD_WIDTH,
  WORLD_START_X,
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
  private decorations: CountryDecoration[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fuelSystem!: FuelSystem;
  private inventorySystem!: InventorySystem;
  private gameState: GameState = 'playing';
  private starfield!: Phaser.GameObjects.Graphics;
  private currentCountryText!: Phaser.GameObjects.Text;
  private startPadId: number = 1; // Track which pad we started on (NYC is now index 1)
  private invulnerable: boolean = true; // Brief invulnerability at start
  private gameStartTime: number = 0; // Track when game started for timer
  private hasPeaceMedal: boolean = false; // Whether player picked up the peace medal
  private peaceMedalGraphics: Phaser.GameObjects.Graphics | null = null; // Medal hanging under shuttle

  // Physics state for medal pendulum
  private medalAngle: number = 0; // Current angle of the medal swing (radians)
  private medalAngularVelocity: number = 0; // Angular velocity of the medal
  private lastShuttleVelX: number = 0; // Track shuttle velocity for physics
  private lastShuttleVelY: number = 0;

  // Power-up states
  private cannonsBribed: boolean = false;
  private bribeEndTime: number = 0;
  private hasSpeedBoost: boolean = false;
  private speedBoostEndTime: number = 0;
  private bribeGraphics: Phaser.GameObjects.Graphics | null = null;
  private speedBoostTrail: Phaser.GameObjects.Graphics | null = null;

  // Sitting duck detection
  private sittingDuckStartTime: number = 0;
  private isSittingDuck: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.gameState = 'playing';
    this.gameStartTime = this.time.now;

    // Initialize systems
    this.fuelSystem = new FuelSystem();
    this.inventorySystem = new InventorySystem();

    // Create starfield background
    this.createStarfield();

    // Create terrain (including Washington DC area to the left)
    this.terrain = new Terrain(this, WORLD_START_X, WORLD_WIDTH);

    // Create country decorations (buildings and landmarks)
    this.createDecorations();

    // Reset peace medal state
    this.hasPeaceMedal = false;
    this.peaceMedalGraphics = null;

    // Create landing pads
    this.createLandingPads();

    // Create cannons
    this.createCannons();

    // Create collectibles (throughout entire world including Washington area)
    // Pass decorations so collectibles don't spawn inside buildings
    this.collectibles = spawnCollectibles(
      this,
      WORLD_START_X,
      WORLD_WIDTH,
      (x) => this.terrain.getHeightAt(x),
      this.decorations
    );

    // Create shuttle - start landed on NYC pad (index 1, since Washington is now index 0)
    const startPad = this.landingPads[1]; // NYC Fuel Stop
    this.startPadId = 1; // Remember we started on pad 1
    // Position shuttle on the pad - adjust so feet visually touch the platform
    const shuttleStartY = startPad.y - 28;
    console.log('Starting shuttle at:', startPad.x, shuttleStartY, 'pad.y:', startPad.y);
    this.shuttle = new Shuttle(this, startPad.x, shuttleStartY);
    this.shuttle.setFuelSystem(this.fuelSystem);
    // Start with zero velocity (landed) and static until player presses thrust
    this.shuttle.setVelocity(0, 0);
    this.shuttle.setStatic(true);

    // Invulnerability at start - prevents crashes until player launches
    this.invulnerable = true;

    // Set up camera - allow space for flying high and Washington to the left
    this.cameras.main.setBounds(WORLD_START_X, -300, WORLD_WIDTH - WORLD_START_X, GAME_HEIGHT + 300);
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
      getElapsedTime: () => this.getElapsedTime(),
      hasPeaceMedal: () => this.hasPeaceMedal,
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
      const padData = LANDING_PADS[i] as { x: number; width: number; name: string; isWashington?: boolean };
      const terrainY = this.terrain.getHeightAt(padData.x);
      const isFinal = i === LANDING_PADS.length - 1;
      const isWashington = padData.isWashington === true;

      const pad = new LandingPad(
        this,
        padData.x,
        terrainY,
        padData.width,
        padData.name,
        isFinal,
        isWashington
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

  private createDecorations(): void {
    // Get flat areas from terrain
    const flatAreas = this.terrain.getFlatAreas();

    // Track used images to prevent duplicates: Set of "country_type_index" strings
    const usedImages = new Set<string>();

    for (const area of flatAreas) {
      // Determine which country this flat area is in
      let countryName = 'USA';
      for (let i = COUNTRIES.length - 1; i >= 0; i--) {
        if (area.x >= COUNTRIES[i].startX) {
          countryName = COUNTRIES[i].name;
          break;
        }
      }

      // Get the asset prefix for this country
      const assetPrefix = getCountryAssetPrefix(countryName);
      if (!assetPrefix) continue; // Skip Atlantic Ocean

      // Random chance to place a decoration (80%)
      if (Math.random() > 0.8) continue;

      // Choose building (70%) or landmark (30%)
      const isLandmark = Math.random() < 0.3;
      const typeStr = isLandmark ? 'landmark' : 'building';

      // Find an unused image index for this country/type combo
      // Try up to 16 times to find an unused one
      let index = -1;
      const availableIndices = [];
      for (let i = 0; i < 16; i++) {
        const key = `${assetPrefix}_${typeStr}_${i}`;
        if (!usedImages.has(key)) {
          availableIndices.push(i);
        }
      }

      // Track final type used
      let finalIsLandmark = isLandmark;

      // If no available images of this type, try the other type
      if (availableIndices.length === 0) {
        finalIsLandmark = !isLandmark;
        const altTypeStr = isLandmark ? 'building' : 'landmark';
        for (let i = 0; i < 16; i++) {
          const key = `${assetPrefix}_${altTypeStr}_${i}`;
          if (!usedImages.has(key)) {
            availableIndices.push(i);
          }
        }
        if (availableIndices.length > 0) {
          index = availableIndices[Math.floor(Math.random() * availableIndices.length)];
          const key = `${assetPrefix}_${altTypeStr}_${index}`;
          usedImages.add(key);
        }
      } else {
        // Pick a random available index
        index = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        const key = `${assetPrefix}_${typeStr}_${index}`;
        usedImages.add(key);
      }

      // Skip if no available images
      if (index === -1) continue;

      // Get actual terrain height at this position (more accurate than stored area.y)
      const terrainY = this.terrain.getHeightAt(area.x);

      // Create the decoration
      const decoration = new CountryDecoration(
        this,
        area.x,
        terrainY,
        assetPrefix,
        index,
        finalIsLandmark
      );

      this.decorations.push(decoration);
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

    // Check if we're over the Atlantic Ocean - always crash in water!
    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
    const isOverWater = this.shuttle.x >= atlanticStart && this.shuttle.x < atlanticEnd;

    if (isOverWater) {
      console.log('CRASH: Splashed into the Atlantic Ocean at', { x: this.shuttle.x, y: this.shuttle.y });

      this.gameState = 'crashed';
      this.shuttle.explode();

      this.time.delayedCall(500, () => {
        this.scene.stop('UIScene');
        this.scene.start('GameOverScene', {
          victory: false,
          message: 'You splashed into the Atlantic Ocean!',
          score: 0,
        });
      });
      return;
    }

    // Check velocity - allow bouncing off terrain at lower speeds
    const velocity = this.shuttle.getVelocity();
    const TERRAIN_CRASH_VELOCITY = 8.0; // Only crash if hitting terrain really hard

    if (velocity.total < TERRAIN_CRASH_VELOCITY) {
      // Just a bounce, not a crash - the physics engine will handle the bounce
      console.log('Terrain bounce at velocity:', velocity.total.toFixed(2));
      return;
    }

    console.log('CRASH: Terrain collision at', { x: this.shuttle.x, y: this.shuttle.y }, 'terrainHeight:', terrainHeight.toFixed(1), 'velocity:', velocity.total.toFixed(2));

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
      const elapsedTime = this.getElapsedTime();
      const inventory = this.inventorySystem.getAllItems();

      // Special message if carrying peace medal
      const victoryMessage = this.hasPeaceMedal
        ? "You've delivered the PEACE MEDAL to Putino! He is tremendously pleased!"
        : "You've reached Putino's Palace! Peace delivered!";

      this.time.delayedCall(1500, () => {
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.start('GameOverScene', {
          victory: true,
          message: victoryMessage,
          elapsedTime: elapsedTime,
          inventory: inventory,
          fuelRemaining: this.fuelSystem.getFuel(),
          hasPeaceMedal: this.hasPeaceMedal,
        });
      });
    } else if (pad.isWashington && !this.hasPeaceMedal) {
      // Pick up the Peace Medal at Washington!
      this.hasPeaceMedal = true;

      // Create the medal graphics that will hang under the shuttle
      this.createPeaceMedalGraphics();

      // Make shuttle heavier
      this.shuttle.setMass(8); // Heavier with medal

      // Reset medal physics
      this.medalAngle = 0;
      this.medalAngularVelocity = 0;

      // Show pickup message
      const pickupText = this.add.text(this.shuttle.x, this.shuttle.y - 80, 'PEACE MEDAL ACQUIRED!', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '24px',
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      });
      pickupText.setOrigin(0.5, 0.5);

      this.tweens.add({
        targets: pickupText,
        y: pickupText.y - 50,
        alpha: 0,
        duration: 2000,
        onComplete: () => pickupText.destroy(),
      });

      // Open trading scene at Washington too
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

  private createPeaceMedalGraphics(): void {
    // Create graphics object for the peace medal that hangs under the shuttle
    this.peaceMedalGraphics = this.add.graphics();
    this.peaceMedalGraphics.setDepth(50); // Above terrain, below UI
  }

  private updateMedalPhysics(): void {
    if (!this.hasPeaceMedal) return;

    // Get current shuttle velocity
    const velocity = this.shuttle.getVelocity();
    const shuttleRotation = this.shuttle.rotation;

    // Calculate shuttle acceleration (change in velocity per frame)
    const accelX = velocity.x - this.lastShuttleVelX;
    const accelY = velocity.y - this.lastShuttleVelY;

    // Store for next frame
    this.lastShuttleVelX = velocity.x;
    this.lastShuttleVelY = velocity.y;

    // Pendulum physics constants
    const wireLength = 45; // Length of wire in pixels (affects swing period)
    const gravity = 0.5; // Gravity constant
    const damping = 0.98; // Air resistance (1.0 = no damping)

    // The medal angle is relative to the shuttle's "down" direction
    // We need to account for:
    // 1. Gravity always pulls straight down (world space)
    // 2. Shuttle acceleration creates pseudo-forces on the medal
    // 3. The shuttle's rotation changes what "down" means for the attachment

    // Convert world gravity to shuttle-relative coordinates
    // When shuttle tilts, gravity appears to come from a different angle
    const effectiveGravityAngle = -shuttleRotation;

    // Pendulum restoring force: gravity tries to align medal with effective "down"
    // The restoring torque is proportional to sin(angle difference)
    const gravityTorque = (gravity / wireLength) * Math.sin(effectiveGravityAngle - this.medalAngle);

    // Shuttle horizontal acceleration creates a pseudo-force
    // Transform to shuttle-local coordinates
    const localAccelX = accelX * Math.cos(shuttleRotation) + accelY * Math.sin(shuttleRotation);

    // This acceleration pushes the medal in the opposite direction
    const accelTorque = -localAccelX * 0.08;

    // Shuttle rotation rate directly affects the medal
    // When shuttle rotates, the attachment point moves, imparting momentum
    const shuttleAngularVel = (this.shuttle.body as MatterJS.BodyType).angularVelocity;
    const rotationTorque = -shuttleAngularVel * 1.5;

    // Sum up all torques and update angular velocity
    const totalTorque = gravityTorque + accelTorque + rotationTorque;
    this.medalAngularVelocity += totalTorque;

    // Apply damping (air resistance)
    this.medalAngularVelocity *= damping;

    // Update angle
    this.medalAngle += this.medalAngularVelocity;

    // Soft clamp - apply extra damping near limits instead of hard stop
    const maxAngle = Math.PI * 0.6; // ~108 degrees
    if (Math.abs(this.medalAngle) > maxAngle) {
      this.medalAngle = Math.sign(this.medalAngle) * maxAngle;
      this.medalAngularVelocity *= -0.3; // Bounce back slightly
    }
  }

  private updatePeaceMedalGraphics(): void {
    if (!this.peaceMedalGraphics || !this.hasPeaceMedal) return;

    // Update physics first
    this.updateMedalPhysics();

    this.peaceMedalGraphics.clear();

    const shuttleX = this.shuttle.x;
    const shuttleY = this.shuttle.y;
    const shuttleRotation = this.shuttle.rotation;

    // Attachment point at bottom of shuttle (in shuttle's local space, then rotated)
    const attachOffsetY = 18; // Distance from shuttle center to bottom
    const attachX = shuttleX + Math.sin(shuttleRotation) * attachOffsetY;
    const attachY = shuttleY + Math.cos(shuttleRotation) * attachOffsetY;

    // The medal angle is in world space (0 = straight down)
    // medalAngle represents deviation from straight down
    const wireLength = 45;

    // Medal position: hanging from attachment point at the pendulum angle
    // medalAngle = 0 means straight down (world space)
    const medalX = attachX + Math.sin(this.medalAngle) * wireLength;
    const medalY = attachY + Math.cos(this.medalAngle) * wireLength;

    // Draw wires (two wires from shuttle bottom to medal top)
    this.peaceMedalGraphics.lineStyle(2, 0x555555, 1);

    // Calculate wire attachment points on shuttle (spread apart)
    const wireSpread = 6;
    const leftAttachX = attachX - wireSpread * Math.cos(shuttleRotation);
    const leftAttachY = attachY + wireSpread * Math.sin(shuttleRotation);
    const rightAttachX = attachX + wireSpread * Math.cos(shuttleRotation);
    const rightAttachY = attachY - wireSpread * Math.sin(shuttleRotation);

    // Wire endpoints on medal
    const medalTopY = medalY - 12;

    // Left wire
    this.peaceMedalGraphics.lineBetween(leftAttachX, leftAttachY, medalX - 4, medalTopY);
    // Right wire
    this.peaceMedalGraphics.lineBetween(rightAttachX, rightAttachY, medalX + 4, medalTopY);

    // Draw ribbon (always vertical in world space, slight tilt with swing)
    this.peaceMedalGraphics.fillStyle(0x0000AA, 1);
    const ribbonTilt = this.medalAngle * 0.3; // Ribbon tilts slightly with swing
    const ribbonWidth = 8;
    const ribbonHeight = 16;
    const rx = medalX;
    const ry = medalY - 6;

    // Draw ribbon as polygon
    this.peaceMedalGraphics.beginPath();
    this.peaceMedalGraphics.moveTo(
      rx - ribbonWidth / 2 * Math.cos(ribbonTilt),
      ry - ribbonHeight - ribbonWidth / 2 * Math.sin(ribbonTilt)
    );
    this.peaceMedalGraphics.lineTo(
      rx + ribbonWidth / 2 * Math.cos(ribbonTilt),
      ry - ribbonHeight + ribbonWidth / 2 * Math.sin(ribbonTilt)
    );
    this.peaceMedalGraphics.lineTo(
      rx + ribbonWidth / 2 * Math.cos(ribbonTilt),
      ry + ribbonWidth / 2 * Math.sin(ribbonTilt)
    );
    this.peaceMedalGraphics.lineTo(
      rx - ribbonWidth / 2 * Math.cos(ribbonTilt),
      ry - ribbonWidth / 2 * Math.sin(ribbonTilt)
    );
    this.peaceMedalGraphics.closePath();
    this.peaceMedalGraphics.fillPath();

    // Draw medal (gold circle)
    this.peaceMedalGraphics.fillStyle(0xFFD700, 1);
    this.peaceMedalGraphics.fillCircle(medalX, medalY, 14);
    this.peaceMedalGraphics.lineStyle(3, 0xB8860B, 1);
    this.peaceMedalGraphics.strokeCircle(medalX, medalY, 14);

    // Inner ring
    this.peaceMedalGraphics.lineStyle(1, 0xDAA520, 1);
    this.peaceMedalGraphics.strokeCircle(medalX, medalY, 10);

    // Peace dove in center (simplified)
    this.peaceMedalGraphics.fillStyle(0xFFFFFF, 1);
    // Dove body
    this.peaceMedalGraphics.fillEllipse(medalX, medalY, 8, 5);
    // Dove wing
    this.peaceMedalGraphics.fillTriangle(
      medalX - 2, medalY,
      medalX + 4, medalY - 4,
      medalX + 4, medalY + 1
    );
    // Dove head
    this.peaceMedalGraphics.fillCircle(medalX - 4, medalY - 1, 2);
  }

  private handleProjectileHit(): void {
    if (this.gameState !== 'playing') return;
    if (this.cannonsBribed) return; // Bribed cannons shoot dollar signs - they don't hurt!

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

    // Check for special power-ups
    if (collectible.special === 'bribe_cannons') {
      this.activateBribeCannons();
    } else if (collectible.special === 'speed_boost') {
      this.activateSpeedBoost();
    } else {
      // Regular collectible - add to inventory
      this.inventorySystem.add(collectible.collectibleType);
    }

    collectible.collect();

    // Remove from array
    const index = this.collectibles.indexOf(collectible);
    if (index > -1) {
      this.collectibles.splice(index, 1);
    }
  }

  private activateBribeCannons(): void {
    const duration = 10000; // 10 seconds of bribed cannons
    this.cannonsBribed = true;
    this.bribeEndTime = this.time.now + duration;

    // Create bribe graphics (dollar signs floating)
    if (!this.bribeGraphics) {
      this.bribeGraphics = this.add.graphics();
      this.bribeGraphics.setDepth(100);
    }

    // Show "CANNONS BRIBED!" text floating
    const bribeText = this.add.text(this.shuttle.x, this.shuttle.y - 60, 'CANNONS BRIBED!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '22px',
      color: '#228B22',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    bribeText.setOrigin(0.5, 0.5);

    // Second line - the joke
    const subText = this.add.text(this.shuttle.x, this.shuttle.y - 35, '"The art of the deal!"', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#FFD700',
      fontStyle: 'italic',
      stroke: '#000000',
      strokeThickness: 2,
    });
    subText.setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: [bribeText, subText],
      y: '-=50',
      alpha: 0,
      duration: 2500,
      onComplete: () => {
        bribeText.destroy();
        subText.destroy();
      },
    });

    // Make dollar signs rain from top
    for (let i = 0; i < 20; i++) {
      this.time.delayedCall(i * 100, () => {
        const dollarSign = this.add.text(
          this.shuttle.x + (Math.random() - 0.5) * 200,
          this.shuttle.y - 100,
          '$',
          {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '24px',
            color: '#228B22',
            fontStyle: 'bold',
          }
        );
        dollarSign.setOrigin(0.5, 0.5);

        this.tweens.add({
          targets: dollarSign,
          y: dollarSign.y + 150,
          alpha: 0,
          angle: Math.random() * 360,
          duration: 1000,
          onComplete: () => dollarSign.destroy(),
        });
      });
    }

    // Flash effect (green for money)
    this.cameras.main.flash(300, 34, 139, 34);
  }

  private activateSpeedBoost(): void {
    const duration = 6000; // 6 seconds of speed boost
    this.hasSpeedBoost = true;
    this.speedBoostEndTime = this.time.now + duration;

    // Modify shuttle thrust temporarily
    this.shuttle.setThrustMultiplier(1.8);

    // Create speed trail effect
    if (!this.speedBoostTrail) {
      this.speedBoostTrail = this.add.graphics();
      this.speedBoostTrail.setDepth(45);
    }

    // Show "SPEED BOOST" text
    const speedText = this.add.text(this.shuttle.x, this.shuttle.y - 60, 'RED TIE POWER!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '18px',
      color: '#DC143C',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    speedText.setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: speedText,
      y: speedText.y - 40,
      alpha: 0,
      duration: 2000,
      onComplete: () => speedText.destroy(),
    });

    // Flash effect
    this.cameras.main.flash(300, 220, 20, 60);
  }

  private updatePowerUps(): void {
    const now = this.time.now;

    // Update bribe effect
    if (this.cannonsBribed) {
      if (now >= this.bribeEndTime) {
        this.cannonsBribed = false;
        if (this.bribeGraphics) {
          this.bribeGraphics.clear();
        }
      } else {
        // Draw dollar sign indicator above shuttle
        if (this.bribeGraphics) {
          this.bribeGraphics.clear();
          const timeLeft = this.bribeEndTime - now;
          const alpha = timeLeft < 2000 ? (Math.sin(now * 0.02) * 0.3 + 0.5) : 0.8;

          // Pulsing green aura
          this.bribeGraphics.lineStyle(3, 0x228B22, alpha * 0.5);
          this.bribeGraphics.strokeCircle(this.shuttle.x, this.shuttle.y, 30 + Math.sin(now * 0.008) * 5);
        }
      }
    }

    // Update speed boost
    if (this.hasSpeedBoost) {
      if (now >= this.speedBoostEndTime) {
        this.hasSpeedBoost = false;
        this.shuttle.setThrustMultiplier(1.0);
        if (this.speedBoostTrail) {
          this.speedBoostTrail.clear();
        }
      } else {
        // Draw speed trail
        if (this.speedBoostTrail) {
          this.speedBoostTrail.clear();
          const timeLeft = this.speedBoostEndTime - now;
          const alpha = timeLeft < 2000 ? (Math.sin(now * 0.02) * 0.3 + 0.4) : 0.6;

          // Red speed lines behind shuttle
          const vel = this.shuttle.getVelocity();
          if (Math.abs(vel.x) > 1 || Math.abs(vel.y) > 1) {
            for (let i = 0; i < 5; i++) {
              const offsetX = -vel.x * (i * 3) + (Math.random() - 0.5) * 10;
              const offsetY = -vel.y * (i * 3) + (Math.random() - 0.5) * 10;
              this.speedBoostTrail.fillStyle(0xDC143C, alpha * (1 - i * 0.15));
              this.speedBoostTrail.fillCircle(this.shuttle.x + offsetX, this.shuttle.y + offsetY, 5 - i);
            }
          }
        }
      }
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

  private getElapsedTime(): number {
    return this.time.now - this.gameStartTime;
  }

  private checkSittingDuck(): void {
    // Check if shuttle is on the ground with no fuel
    if (!this.fuelSystem.isEmpty()) {
      this.isSittingDuck = false;
      this.sittingDuckStartTime = 0;
      return;
    }

    // Check if shuttle is stationary (on ground)
    const velocity = this.shuttle.getVelocity();
    const isStationary = velocity.total < 0.5;

    // Check if shuttle is near terrain (not floating in air)
    const terrainY = this.terrain.getHeightAt(this.shuttle.x);
    const shuttleBottom = this.shuttle.y + 18;
    const isOnGround = Math.abs(terrainY - shuttleBottom) < 20;

    // Check if NOT on a landing pad
    const onLandingPad = this.landingPads.some(pad => {
      const horizontalDist = Math.abs(this.shuttle.x - pad.x);
      return horizontalDist < pad.width / 2 && Math.abs(pad.y - shuttleBottom) < 20;
    });

    if (isStationary && isOnGround && !onLandingPad) {
      if (!this.isSittingDuck) {
        // Start the sitting duck timer
        this.isSittingDuck = true;
        this.sittingDuckStartTime = this.time.now;
      } else {
        // Check if 2 seconds have passed
        const sittingTime = this.time.now - this.sittingDuckStartTime;
        if (sittingTime >= 2000) {
          this.triggerSittingDuckGameOver();
        }
      }
    } else {
      this.isSittingDuck = false;
      this.sittingDuckStartTime = 0;
    }
  }

  private triggerSittingDuckGameOver(): void {
    if (this.gameState !== 'playing') return;

    this.gameState = 'crashed';

    // Taunting messages - all duck-themed!
    const tauntMessages = [
      "You're a sitting duck! Quack quack!",
      "SITTING DUCK! The cannons thank you!",
      "Quack! Sitting duck spotted! Quack!",
      "A sitting duck! How embarrassing!",
      "🦆 SITTING DUCK ALERT! 🦆",
      "Duck, duck... BOOM! You were a sitting duck!",
      "Sitting duck! Even the ducks are laughing!",
      "What a sitting duck! Tremendous failure!",
    ];
    const message = tauntMessages[Math.floor(Math.random() * tauntMessages.length)];

    this.shuttle.explode();

    this.time.delayedCall(500, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        victory: false,
        message: message,
        score: 0,
      });
    });
  }

  update(time: number): void {
    if (this.gameState !== 'playing') return;

    // Update terrain (for animated ocean waves)
    this.terrain.update();

    // Update shuttle
    this.shuttle.update(this.cursors);

    // Update peace medal graphics if carrying
    this.updatePeaceMedalGraphics();

    // Update power-up effects
    this.updatePowerUps();

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

    // Check for sitting duck (out of fuel on ground)
    this.checkSittingDuck();

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
