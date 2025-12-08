import Phaser from 'phaser';
import { Shuttle } from '../objects/Shuttle';
import { Terrain } from '../objects/Terrain';
import { LandingPad } from '../objects/LandingPad';
import { Cannon } from '../objects/Cannon';
import { Collectible, spawnCollectibles } from '../objects/Collectible';
import { CountryDecoration, getCountryAssetPrefix } from '../objects/CountryDecoration';
import { MedalHouse } from '../objects/MedalHouse';
import { Bomb } from '../objects/Bomb';
import { FisherBoat } from '../objects/FisherBoat';
import { GolfCart } from '../objects/GolfCart';
import { FuelSystem } from '../systems/FuelSystem';
import { InventorySystem } from '../systems/InventorySystem';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  WORLD_WIDTH,
  WORLD_START_X,
  COUNTRIES,
  LANDING_PADS,
  BOMB_DROPPABLE_TYPES,
  FOOD_PICKUP_AMOUNT,
} from '../constants';

type GameState = 'playing' | 'landed' | 'crashed' | 'victory';

export class GameScene extends Phaser.Scene {
  private shuttle!: Shuttle;
  private terrain!: Terrain;
  private landingPads: LandingPad[] = [];
  private cannons: Cannon[] = [];
  private collectibles: Collectible[] = [];
  private decorations: (CountryDecoration | MedalHouse)[] = [];
  private medalHouse: MedalHouse | null = null;
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

  // Bomb system
  private bombs: Bomb[] = [];
  private bombCooldown: boolean = false;
  private destructionScore: number = 0;
  private destroyedBuildings: { name: string; points: number; textureKey: string; country: string }[] = [];

  // Fisherboat in Atlantic
  private fisherBoat: FisherBoat | null = null;

  // Golf cart in USA
  private golfCart: GolfCart | null = null;
  private epsteinFiles: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.gameState = 'playing';
    this.gameStartTime = Date.now(); // Use Date.now() for reliable timing across scene restarts

    // Reset all game object arrays (Phaser may reuse scene instances)
    this.landingPads = [];
    this.cannons = [];
    this.collectibles = [];
    this.decorations = [];
    this.medalHouse = null;
    this.bombs = [];

    // Initialize systems
    this.fuelSystem = new FuelSystem();
    this.inventorySystem = new InventorySystem();

    // Create starfield background
    this.createStarfield();

    // Create terrain (including Washington DC area to the left)
    this.terrain = new Terrain(this, WORLD_START_X, WORLD_WIDTH);

    // Create fisherboat in Atlantic Ocean (center of Atlantic at x ~3500)
    this.fisherBoat = new FisherBoat(this, 3500);

    // Create golf cart in USA section (patrols x: 800-1200) - 1/3 chance to spawn
    if (Math.random() < 0.33) {
      this.golfCart = new GolfCart(this, 1000, 800, 1200);
    }

    // Create cannons first (so decorations can avoid them)
    this.createCannons();

    // Create country decorations (buildings and landmarks) - skips areas near cannons
    this.createDecorations();

    // Reset peace medal state
    this.hasPeaceMedal = false;
    this.peaceMedalGraphics = null;

    // Reset score and destroyed buildings
    this.destructionScore = 0;
    this.destroyedBuildings = [];

    // Reset power-up states (Phaser may reuse scene instances)
    this.cannonsBribed = false;
    this.bribeEndTime = 0;
    this.hasSpeedBoost = false;
    this.speedBoostEndTime = 0;
    this.bribeGraphics = null;
    this.speedBoostTrail = null;

    // Reset other state
    this.medalAngle = 0;
    this.medalAngularVelocity = 0;
    this.lastShuttleVelX = 0;
    this.lastShuttleVelY = 0;
    this.sittingDuckStartTime = 0;
    this.isSittingDuck = false;
    this.bombCooldown = false;

    // Create landing pads
    this.createLandingPads();

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
    // Position shuttle on the pad - adjust so feet visually touch the platform (with legs down)
    const shuttleStartY = startPad.y - 20;
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

    // Stop rocket sound when scene shuts down
    this.events.on('shutdown', () => {
      this.shuttle.stopRocketSound();
    });
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

    // Draw some clouds with parallax and shading
    const cloudGraphics = this.add.graphics();
    cloudGraphics.setScrollFactor(0.02);
    cloudGraphics.setDepth(-90);

    for (let i = 0; i < 20; i++) {
      const x = Math.random() * GAME_WIDTH * 5;
      const y = 50 + Math.random() * 200;
      const scale = 0.5 + Math.random() * 0.8;

      // Shadow layer (grey, offset down)
      cloudGraphics.fillStyle(0xCCCCCC, 0.5);
      cloudGraphics.fillCircle(x, y + 4 * scale, 25 * scale);
      cloudGraphics.fillCircle(x + 20 * scale, y - 8 * scale + 4 * scale, 20 * scale);
      cloudGraphics.fillCircle(x + 40 * scale, y + 4 * scale, 28 * scale);
      cloudGraphics.fillCircle(x + 20 * scale, y + 8 * scale + 4 * scale, 18 * scale);

      // Main white layer
      cloudGraphics.fillStyle(0xFFFFFF, 0.85);
      cloudGraphics.fillCircle(x, y, 25 * scale);
      cloudGraphics.fillCircle(x + 20 * scale, y - 8 * scale, 20 * scale);
      cloudGraphics.fillCircle(x + 40 * scale, y, 28 * scale);
      cloudGraphics.fillCircle(x + 20 * scale, y + 8 * scale, 18 * scale);

      // Highlight layer (brighter, offset up, smaller)
      cloudGraphics.fillStyle(0xFFFFFF, 0.4);
      cloudGraphics.fillCircle(x + 5 * scale, y - 5 * scale, 12 * scale);
      cloudGraphics.fillCircle(x + 25 * scale, y - 12 * scale, 10 * scale);
    }

    // Add gentle cloud drift animation
    this.tweens.add({
      targets: cloudGraphics,
      x: 30,
      duration: 15000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Sun with multi-layer corona
    const sunX = 100;
    const sunY = 80;

    // Outer glow layers (drawn first, behind)
    const sunGlow = this.add.graphics();
    sunGlow.setScrollFactor(0);
    sunGlow.setDepth(-96);
    sunGlow.fillStyle(0xFFAA44, 0.12);
    sunGlow.fillCircle(sunX, sunY, 75);
    sunGlow.fillStyle(0xFFBB55, 0.18);
    sunGlow.fillCircle(sunX, sunY, 62);
    sunGlow.fillStyle(0xFFCC66, 0.25);
    sunGlow.fillCircle(sunX, sunY, 52);

    // Sun core
    const sun = this.add.graphics();
    sun.setScrollFactor(0);
    sun.setDepth(-95);
    sun.fillStyle(0xFFEE88, 0.6);
    sun.fillCircle(sunX, sunY, 45);
    sun.fillStyle(0xFFFF99, 0.8);
    sun.fillCircle(sunX, sunY, 38);
    sun.fillStyle(0xFFFFCC, 1);
    sun.fillCircle(sunX, sunY, 30);

    // Pulsing glow animation
    this.tweens.add({
      targets: sunGlow,
      scaleX: 1.12,
      scaleY: 1.12,
      alpha: 0.8,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
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
        const cannon = new Cannon(this, x, y, country.name);
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

      // Skip if too close to any cannon (within 80 pixels - check 2D distance)
      const decorationY = this.terrain.getHeightAt(area.x);
      const tooCloseToCannon = this.cannons.some((cannon) => {
        const dx = cannon.x - area.x;
        const dy = cannon.y - decorationY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 80;
      });
      if (tooCloseToCannon) continue;

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

    // Create the medal house near the Washington DC landing pad
    // Position it to the left of the landing pad
    const washingtonPad = LANDING_PADS.find(p => p.isWashington);
    if (washingtonPad) {
      const medalHouseX = washingtonPad.x - 120; // To the left of the pad
      const medalHouseY = this.terrain.getHeightAt(medalHouseX);
      this.medalHouse = new MedalHouse(this, medalHouseX, medalHouseY);
      this.decorations.push(this.medalHouse);
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
    // But NOT if we're near a landing pad
    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
    const isOverWater = this.shuttle.x >= atlanticStart && this.shuttle.x < atlanticEnd;

    // Check if near a landing pad (don't splash if on a pad)
    const nearLandingPad = this.landingPads.some(pad => {
      const horizontalDist = Math.abs(this.shuttle.x - pad.x);
      return horizontalDist < pad.width / 2 + 30; // Some tolerance
    });

    if (isOverWater && !nearLandingPad) {
      console.log('CRASH: Splashed into the Atlantic Ocean at', { x: this.shuttle.x, y: this.shuttle.y });

      this.gameState = 'crashed';
      this.shuttle.stopRocketSound();
      this.sound.play('water_splash');

      // Play bubbles sound after splash, fade out after 3 seconds
      this.time.delayedCall(500, () => {
        const bubbles = this.sound.add('water_bubbles');
        bubbles.play();
        // Fade out over 1 second, starting at 2 seconds
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: bubbles,
            volume: 0,
            duration: 1000,
            onComplete: () => bubbles.stop(),
          });
        });
      });

      this.handleWaterSplash();
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
    this.sound.play('car_crash', { volume: 0.8 });

    this.time.delayedCall(500, () => {
      if (this.gameState !== 'crashed') return; // Don't show if we landed successfully
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        victory: false,
        message: 'You crashed into the terrain!',
        score: this.destructionScore,
        debugModeUsed: this.shuttle.wasDebugModeUsed(),
        destroyedBuildings: this.destroyedBuildings,
      });
    });
  }

  private handleWaterSplash(): void {
    const splashX = this.shuttle.x;
    const splashY = this.shuttle.y;
    const waterLevel = this.terrain.getHeightAt(splashX);

    // Capture velocity before stopping (for splash direction)
    const velocity = this.shuttle.getVelocity();
    const impactAngle = Math.atan2(-velocity.y, -velocity.x); // Opposite of travel direction
    const impactSpeed = velocity.total;

    // Stop shuttle physics and thrusters, make it sink
    this.shuttle.setVelocity(0, 0);
    this.shuttle.setAngularVelocity(0);
    this.shuttle.setStatic(true);
    this.shuttle.stopThrusters();

    // Create water splash effect - splash goes opposite to direction ship came from!

    // Main splash - large water droplets going in impact direction (opposite of travel)
    for (let i = 0; i < 40; i++) {
      // Spread around the impact angle with bias upward
      const baseAngle = impactAngle * 0.5 - Math.PI / 2 * 0.5; // Blend impact angle with upward
      const angle = baseAngle + (Math.random() - 0.5) * 1.2;
      const speed = 6 + Math.random() * 12 + impactSpeed * 0.5;
      const droplet = this.add.graphics();
      droplet.fillStyle(0x4169E1, 0.8); // Royal blue water
      droplet.fillCircle(0, 0, 4 + Math.random() * 8);
      droplet.setPosition(splashX + (Math.random() - 0.5) * 50, waterLevel);
      droplet.setDepth(101);

      this.tweens.add({
        targets: droplet,
        x: droplet.x + Math.cos(angle) * speed * 18,
        y: droplet.y + Math.sin(angle) * speed * 20 + 70, // Gravity pulls down
        alpha: 0,
        scale: 0.3,
        duration: 900 + Math.random() * 600,
        ease: 'Quad.easeOut',
        onComplete: () => droplet.destroy(),
      });
    }

    // Secondary spray - smaller droplets more in impact direction
    for (let i = 0; i < 30; i++) {
      const baseAngle = impactAngle * 0.7 - Math.PI / 2 * 0.3; // More toward impact direction
      const angle = baseAngle + (Math.random() - 0.5) * 0.8;
      const speed = 10 + Math.random() * 15 + impactSpeed * 0.3;
      const droplet = this.add.graphics();
      droplet.fillStyle(0x87CEEB, 0.7); // Lighter blue
      droplet.fillCircle(0, 0, 2 + Math.random() * 4);
      droplet.setPosition(splashX + (Math.random() - 0.5) * 30, waterLevel);
      droplet.setDepth(102);

      this.tweens.add({
        targets: droplet,
        x: droplet.x + Math.cos(angle) * speed * 12,
        y: droplet.y + Math.sin(angle) * speed * 18 + 90,
        alpha: 0,
        scale: 0.2,
        duration: 1100 + Math.random() * 500,
        ease: 'Quad.easeOut',
        onComplete: () => droplet.destroy(),
      });
    }

    // Big splash column - offset in impact direction
    const columnOffsetX = Math.cos(impactAngle) * 20;
    for (let i = 0; i < 20; i++) {
      const columnDrop = this.add.graphics();
      columnDrop.fillStyle(0xADD8E6, 0.9);
      columnDrop.fillEllipse(0, 0, 8 + Math.random() * 6, 18 + Math.random() * 12);
      columnDrop.setPosition(splashX + columnOffsetX + (Math.random() - 0.5) * 35, waterLevel);
      columnDrop.setDepth(103);

      this.tweens.add({
        targets: columnDrop,
        y: waterLevel - 100 - Math.random() * 120,
        x: columnDrop.x + Math.cos(impactAngle) * 30,
        alpha: 0,
        scaleY: 2.5,
        duration: 600 + Math.random() * 400,
        ease: 'Quad.easeOut',
        onComplete: () => columnDrop.destroy(),
      });
    }

    // Splash rings expanding outward on water surface
    for (let i = 0; i < 5; i++) {
      const ring = this.add.graphics();
      ring.lineStyle(4 - i * 0.5, 0x87CEEB, 0.8);
      ring.strokeCircle(splashX, waterLevel, 15);
      ring.setDepth(99);

      this.tweens.add({
        targets: ring,
        scaleX: 5 + i * 2,
        scaleY: 0.4,
        alpha: 0,
        duration: 1000 + i * 300,
        delay: i * 100,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    }

    // Big white foam splash
    const foam = this.add.graphics();
    foam.fillStyle(0xFFFFFF, 0.95);
    foam.fillEllipse(splashX, waterLevel, 100, 35);
    foam.setDepth(100);

    this.tweens.add({
      targets: foam,
      scaleX: 3,
      scaleY: 0.4,
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => foam.destroy(),
    });

    // Secondary foam burst
    const foam2 = this.add.graphics();
    foam2.fillStyle(0xE0FFFF, 0.8);
    foam2.fillEllipse(splashX, waterLevel - 10, 70, 25);
    foam2.setDepth(100);

    this.tweens.add({
      targets: foam2,
      scaleX: 2.5,
      y: waterLevel - 30,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => foam2.destroy(),
    });

    // Animate shuttle sinking deeper
    this.tweens.add({
      targets: this.shuttle,
      y: waterLevel + 180, // Sink deep below water
      alpha: 0.15,
      duration: 3500,
      ease: 'Quad.easeIn',
    });

    // If player has the peace medal, make it sink with the shuttle
    if (this.hasPeaceMedal && this.peaceMedalGraphics) {
      this.tweens.add({
        targets: this.peaceMedalGraphics,
        y: waterLevel + 200, // Sink slightly deeper than shuttle
        alpha: 0.15,
        duration: 3500,
        ease: 'Quad.easeIn',
      });
    }

    // Bubbles rising as shuttle sinks (more bubbles over longer time)
    for (let i = 0; i < 25; i++) {
      this.time.delayedCall(200 + i * 150, () => {
        if (this.gameState !== 'crashed') return;
        const bubble = this.add.graphics();
        bubble.fillStyle(0xADD8E6, 0.6);
        bubble.fillCircle(0, 0, 2 + Math.random() * 3);
        bubble.setPosition(
          splashX + (Math.random() - 0.5) * 30,
          waterLevel + 20 + Math.random() * 40
        );
        bubble.setDepth(98);

        this.tweens.add({
          targets: bubble,
          y: bubble.y - 50 - Math.random() * 30,
          alpha: 0,
          duration: 500 + Math.random() * 300,
          ease: 'Quad.easeOut',
          onComplete: () => bubble.destroy(),
        });
      });
    }

    // Go to game over after sinking animation
    this.time.delayedCall(4000, () => {
      if (this.gameState !== 'crashed') return; // Don't show if we landed successfully
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        victory: false,
        message: 'You splashed into the Atlantic Ocean!',
        score: this.destructionScore,
        debugModeUsed: this.shuttle.wasDebugModeUsed(),
        noShake: true, // Water death is peaceful, no shake
        destroyedBuildings: this.destroyedBuildings,
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
        if (this.gameState !== 'crashed') return; // Don't show if we landed successfully
        this.scene.stop('UIScene');
        this.scene.start('GameOverScene', {
          victory: false,
          message: `Crash landing! ${landingResult.reason}`,
          score: this.destructionScore,
          debugModeUsed: this.shuttle.wasDebugModeUsed(),
          destroyedBuildings: this.destroyedBuildings,
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

      // Add peace medal bonus to score (5000 points!)
      if (this.hasPeaceMedal) {
        this.destructionScore += 5000;
        this.events.emit('destructionScore', this.destructionScore);
      }

      // Special message if carrying peace medal - Putino speaks!
      const putinoPhrases = [
        '"Ochen khorosho! Very good, my friend! This medal, it is... how you say... TREMENDOUS!"',
        '"Spasibo! Thank you! Putino is most impressed with shiny peace medal, da!"',
        '"Bozhe moy! My God! Such beautiful medal! We make great deal together, yes?"',
        '"Prekrasno! Wonderful! This medal bigger than all of Europe medals combined!"',
        '"Ura! Hooray! Putino knew you would bring medal. We have best chemistry, da?"',
        '"Zamechatelno! Magnificent! Medal so shiny, can see reflection of great Russia!"',
        '"Otlichno! Excellent work! Putino will put medal next to his other... trophies."',
      ];
      const victoryMessage = this.hasPeaceMedal
        ? putinoPhrases[Math.floor(Math.random() * putinoPhrases.length)]
        : '"Ah, my friend! Putino is happy to see you, but... something is missing, da?"';

      // Check if debug mode was used (disqualifies from high score)
      const debugModeUsed = this.shuttle.wasDebugModeUsed();

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
          score: this.destructionScore,
          debugModeUsed: debugModeUsed,
          destroyedBuildings: this.destroyedBuildings,
        });
      });
    } else if (pad.isWashington && !this.hasPeaceMedal) {
      // Pick up the Peace Medal at Washington!
      this.hasPeaceMedal = true;

      // Hide the medal model on the landing pad
      pad.hidePeaceMedal();

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
      this.scene.pause();
      this.scene.launch('TradingScene', {
        inventorySystem: this.inventorySystem,
        fuelSystem: this.fuelSystem,
        padName: pad.name,
        landingQuality: landingResult.quality,
        onScoreChange: (delta: number) => {
          this.destructionScore += delta;
          this.events.emit('destructionScore', this.destructionScore);
        },
        onComplete: () => {
          this.scene.resume();
          this.gameState = 'playing';
        },
      });
    } else {
      // Open trading scene
      this.scene.pause();
      this.scene.launch('TradingScene', {
        inventorySystem: this.inventorySystem,
        fuelSystem: this.fuelSystem,
        padName: pad.name,
        landingQuality: landingResult.quality,
        onScoreChange: (delta: number) => {
          this.destructionScore += delta;
          this.events.emit('destructionScore', this.destructionScore);
        },
        onComplete: () => {
          this.scene.resume();
          this.gameState = 'playing';
        },
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

    const velocity = this.shuttle.getVelocity();
    const shuttleRotation = this.shuttle.rotation;

    // Calculate shuttle acceleration (change in velocity per frame)
    const accelX = velocity.x - this.lastShuttleVelX;
    const accelY = velocity.y - this.lastShuttleVelY;

    this.lastShuttleVelX = velocity.x;
    this.lastShuttleVelY = velocity.y;

    // Pendulum physics constants
    const wireLength = 45;
    const gravity = 0.5;
    const damping = 0.97;

    // EFFECTIVE GRAVITY: real gravity minus shuttle acceleration
    // This is the key physics - vertical thrust affects pendulum behavior
    // When thrusting up (accelY negative), effective gravity increases
    // When falling freely, effective gravity approaches zero (floaty)
    const effectiveGravityX = -accelX;  // Horizontal pseudo-force
    const effectiveGravityY = gravity - accelY;  // Vertical: gravity minus thrust

    // Calculate effective gravity magnitude and direction
    const effGravMagnitude = Math.sqrt(effectiveGravityX * effectiveGravityX + effectiveGravityY * effectiveGravityY);
    const effGravAngle = Math.atan2(effectiveGravityX, effectiveGravityY);  // Angle from world "down"

    // Medal's world angle = shuttle rotation + local medal angle
    const medalWorldAngle = shuttleRotation + this.medalAngle;

    // Angle between medal and effective "down" direction
    const angleFromEffectiveDown = medalWorldAngle - effGravAngle;

    // Restoring torque: stronger when effective gravity is higher (more thrust)
    const restoreFactor = effGravMagnitude / wireLength;
    const gravityTorque = -restoreFactor * Math.sin(angleFromEffectiveDown);

    // Shuttle rotation imparts momentum to medal through the wire
    const shuttleAngularVel = (this.shuttle.body as MatterJS.BodyType).angularVelocity;
    const rotationTorque = -shuttleAngularVel * 0.8;

    // Update angular velocity
    this.medalAngularVelocity += gravityTorque + rotationTorque;
    this.medalAngularVelocity *= damping;
    this.medalAngle += this.medalAngularVelocity;

    // Soft clamp - bounce back at extreme angles
    const maxAngle = Math.PI * 0.6;
    if (Math.abs(this.medalAngle) > maxAngle) {
      this.medalAngle = Math.sign(this.medalAngle) * maxAngle;
      this.medalAngularVelocity *= -0.3;
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

  private handleProjectileHit(projectileSpriteKey?: string): void {
    if (this.gameState !== 'playing') return;
    // Note: Bribed cannons stand down and don't fire, but existing projectiles can still hit!

    console.log('CRASH: Hit by projectile at', { x: this.shuttle.x, y: this.shuttle.y }, 'type:', projectileSpriteKey);

    this.gameState = 'crashed';
    this.shuttle.explode();

    // Play crash and explosion sounds
    this.sound.play('car_crash', { volume: 0.8 });
    const explosionNum = Math.floor(Math.random() * 3) + 1;
    this.sound.play(`explosion${explosionNum}`, { volume: 0.5 });

    // Generate death message based on projectile type
    const message = this.getProjectileDeathMessage(projectileSpriteKey);

    this.time.delayedCall(500, () => {
      if (this.gameState !== 'crashed') return; // Don't show if we landed successfully
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        victory: false,
        message: message,
        score: this.destructionScore,
        debugModeUsed: this.shuttle.wasDebugModeUsed(),
        destroyedBuildings: this.destroyedBuildings,
      });
    });
  }

  private getProjectileDeathMessage(spriteKey?: string): string {
    // Map sprite keys to friendly names
    const projectileNames: { [key: string]: string } = {
      'teacup': 'a flying teacup',
      'doubledecker': 'a double-decker bus',
      'blackcab': 'a black cab',
      'guardhat': 'a royal guard hat',
      'baguette': 'a baguette',
      'wine': 'a wine bottle',
      'croissant': 'a croissant',
      'pretzel': 'a pretzel',
      'beer': 'a beer stein',
      'pierogi': 'a pierogi',
      'pottery': 'Polish pottery',
      'proj_matryoshka': 'a matryoshka doll',
      'balalaika': 'a balalaika',
      'borscht': 'a bowl of borscht',
      'samovar': 'a samovar',
      'cannonball': 'a cannonball',
    };

    // USA arms dealer quips
    const usaQuips = [
      'Probably made in USA.',
      'That weapon was likely sold by an American arms dealer.',
      'Made with American military-industrial love.',
      'USA: Making war profitable since 1776.',
      'Another satisfied customer of US defense contractors!',
      'Lockheed Martin sends their regards.',
      '"Peace through superior firepower" - USA',
      'Sponsored by the Pentagon.',
    ];

    const projectileName = spriteKey ? (projectileNames[spriteKey] || 'something weird') : 'enemy fire';
    const quip = usaQuips[Math.floor(Math.random() * usaQuips.length)];

    return `Taken out by ${projectileName}! ${quip}`;
  }

  private handleCollectiblePickup(collectible: Collectible): void {
    if (collectible.collected) return;

    // Play pickup sound based on collectible type
    this.playPickupSound(collectible.collectibleType);

    // Add score based on fuel value (points for collecting)
    const pointsGained = collectible.fuelValue;
    if (pointsGained > 0) {
      this.destructionScore += pointsGained;
      this.events.emit('destructionScore', this.destructionScore);
    }

    // Check for special power-ups
    if (collectible.special === 'bribe_cannons') {
      this.activateBribeCannons();
    } else if (collectible.special === 'speed_boost') {
      this.activateSpeedBoost();
    } else if (collectible.collectibleType === 'COVFEFE') {
      // Covfefe gives instant 10% fuel
      const fuelToAdd = this.fuelSystem.getMaxFuel() * 0.1;
      this.fuelSystem.add(fuelToAdd);

      // Show "+10% FUEL" popup
      const fuelText = this.add.text(this.shuttle.x, this.shuttle.y - 50, '+10% FUEL!', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '20px',
        color: '#8B4513',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      });
      fuelText.setOrigin(0.5, 0.5);

      this.tweens.add({
        targets: fuelText,
        y: fuelText.y - 40,
        alpha: 0,
        duration: 1500,
        onComplete: () => fuelText.destroy(),
      });
    } else if (BOMB_DROPPABLE_TYPES.includes(collectible.collectibleType)) {
      // Food items give +10 to inventory
      this.inventorySystem.add(collectible.collectibleType, FOOD_PICKUP_AMOUNT);

      // Show "+10" popup
      const amountText = this.add.text(this.shuttle.x, this.shuttle.y - 50, `+${FOOD_PICKUP_AMOUNT}!`, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '18px',
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      });
      amountText.setOrigin(0.5, 0.5);

      this.tweens.add({
        targets: amountText,
        y: amountText.y - 30,
        alpha: 0,
        duration: 1000,
        onComplete: () => amountText.destroy(),
      });
    } else {
      // Regular collectible - add 1 to inventory
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

    // Sound is played by playPickupSound()

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

    // Sound is played by playPickupSound()

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

  private dropBomb(): void {
    // Find a droppable food item in inventory
    let foodType: string | null = null;

    for (const type of BOMB_DROPPABLE_TYPES) {
      const count = this.inventorySystem.getCount(type as any);
      if (count > 0) {
        foodType = type;
        break;
      }
    }

    if (!foodType) {
      // No food to drop
      return;
    }

    // Play random bomb quote (only if not already playing)
    const bombQuoteNum = Math.floor(Math.random() * 8) + 1;
    this.playSoundIfNotPlaying(`bomb${bombQuoteNum}`);

    // Consume 1 from inventory
    this.inventorySystem.remove(foodType as any, 1);

    // Create bomb at shuttle position
    const bomb = new Bomb(this, this.shuttle.x, this.shuttle.y + 20, foodType);

    // Give it the shuttle's velocity plus some downward motion
    const shuttleVel = this.shuttle.getVelocity();
    bomb.setVelocity(shuttleVel.x * 0.5, shuttleVel.y + 2);

    this.bombs.push(bomb);
  }

  // Play a sound only if it's not already playing (prevents overlap of same sound)
  private playSoundIfNotPlaying(key: string): void {
    // Check if this sound is already playing
    const isPlaying = this.sound.getAllPlaying().some(
      (sound) => sound.key === key
    );
    if (!isPlaying) {
      this.sound.play(key);
    }
  }

  // Generate and play a "boing" sound using Web Audio API
  private playBoingSound(): void {
    const audioContext = (this.sound as Phaser.Sound.WebAudioSoundManager).context;
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start at higher frequency and sweep down for "boing" effect
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.15);
    // Bounce back up slightly
    oscillator.frequency.exponentialRampToValueAtTime(250, audioContext.currentTime + 0.2);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);

    // Volume envelope
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }

  private playPickupSound(collectibleType: string): void {
    // Power-ups have special voice sounds
    const powerUpSounds: Record<string, string> = {
      'TRUMP_TOWER': 'bribe1',
      'RED_TIE': 'speedboost',
      'COVFEFE': 'covfefe',
    };

    const soundKey = powerUpSounds[collectibleType];
    if (soundKey) {
      this.playSoundIfNotPlaying(soundKey);
    } else {
      // Regular collectibles get a "boing" sound
      this.playBoingSound();
    }
  }

  private updateBombs(): void {
    // Check bomb collisions with buildings, cannons, and terrain
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];

      if (bomb.hasExploded || !bomb.active) {
        this.bombs.splice(i, 1);
        continue;
      }

      const bombX = bomb.x;
      const bombY = bomb.y;
      let bombDestroyed = false;

      // Check collision with buildings FIRST (before terrain, since buildings sit on terrain)
      for (let j = this.decorations.length - 1; j >= 0; j--) {
        const decoration = this.decorations[j];
        if (decoration.isDestroyed || !decoration.visible) continue;

        // Check if bomb is within horizontal range first (optimization)
        if (Math.abs(bombX - decoration.x) > 150) continue;

        const bounds = decoration.getCollisionBounds();

        if (
          bombX >= bounds.x &&
          bombX <= bounds.x + bounds.width &&
          bombY >= bounds.y &&
          bombY <= bounds.y + bounds.height
        ) {
          // Hit a building!
          const explosionX = bombX;
          const explosionY = bombY;
          bomb.explode(this);

          // Play explosion SFX (can overlap) and bomb hit quote (delayed 1.5s, no overlap)
          const explosionNum = Math.floor(Math.random() * 3) + 1;
          this.sound.play(`explosion${explosionNum}`, { volume: 0.5 });
          const bombHitNum = Math.floor(Math.random() * 5) + 1;
          this.time.delayedCall(1500, () => {
            this.playSoundIfNotPlaying(`bombhit${bombHitNum}`);
          });

          // Apply shockwave to shuttle
          this.applyExplosionShockwave(explosionX, explosionY);

          // Get building info and destroy it
          const { name, points, textureKey, country } = decoration.explode();
          this.destructionScore += points;
          this.destroyedBuildings.push({ name, points, textureKey, country });

          // Play special sound for FIFA Kennedy Center
          if (decoration instanceof MedalHouse) {
            this.time.delayedCall(500, () => {
              this.sound.play('sorry_johnny');
            });
          }

          // Show points popup
          this.showDestructionPoints(decoration.x, decoration.y - 50, points, name);

          // Remove decoration from array
          this.decorations.splice(j, 1);

          this.bombs.splice(i, 1);
          bombDestroyed = true;
          break;
        }
      }

      if (bombDestroyed) continue;

      // Check collision with cannons
      for (let j = this.cannons.length - 1; j >= 0; j--) {
        const cannon = this.cannons[j];

        // Skip already destroyed cannons
        if (!cannon.isActive()) continue;

        const bounds = cannon.getCollisionBounds();

        if (
          bombX >= bounds.x &&
          bombX <= bounds.x + bounds.width &&
          bombY >= bounds.y &&
          bombY <= bounds.y + bounds.height
        ) {
          // Hit a cannon!
          const explosionX = bombX;
          const explosionY = bombY;
          bomb.explode(this);
          cannon.explode();

          // Play explosion SFX (can overlap) and bomb hit quote (no overlap)
          const cannonExplosionNum = Math.floor(Math.random() * 3) + 1;
          this.sound.play(`explosion${cannonExplosionNum}`, { volume: 0.5 });
          const cannonHitNum = Math.floor(Math.random() * 5) + 1;
          this.playSoundIfNotPlaying(`bombhit${cannonHitNum}`);

          // Apply shockwave to shuttle
          this.applyExplosionShockwave(explosionX, explosionY);

          // Show points popup
          this.destructionScore += 200;
          this.showDestructionPoints(cannon.x, cannon.y - 30, 200, 'Cannon');

          // Don't remove cannon from array yet - let its projectiles finish
          // The cannon.explode() already hides it and stops firing

          this.bombs.splice(i, 1);
          bombDestroyed = true;
          break;
        }
      }

      if (bombDestroyed) continue;

      // Check collision with fisherboat
      if (this.fisherBoat && !this.fisherBoat.isDestroyed) {
        const bounds = this.fisherBoat.getCollisionBounds();

        if (
          bombX >= bounds.x &&
          bombX <= bounds.x + bounds.width &&
          bombY >= bounds.y &&
          bombY <= bounds.y + bounds.height
        ) {
          // Hit the fisherboat!
          const explosionX = bombX;
          const explosionY = bombY;
          bomb.explode(this);

          // Play explosion sound
          const explosionNum = Math.floor(Math.random() * 3) + 1;
          this.sound.play(`explosion${explosionNum}`, { volume: 0.5 });

          // Apply shockwave to shuttle
          this.applyExplosionShockwave(explosionX, explosionY);

          // Get boat info and destroy it
          const { name, points } = this.fisherBoat.explode();
          this.destructionScore += points;

          // Show special destruction message
          this.showFisherBoatDestroyed(this.fisherBoat.x, this.fisherBoat.y - 50, points);

          this.bombs.splice(i, 1);
          bombDestroyed = true;
        }
      }

      if (bombDestroyed) continue;

      // Check collision with golf cart
      if (this.golfCart && !this.golfCart.isDestroyed) {
        const bounds = this.golfCart.getCollisionBounds();

        if (
          bombX >= bounds.x &&
          bombX <= bounds.x + bounds.width &&
          bombY >= bounds.y &&
          bombY <= bounds.y + bounds.height
        ) {
          // Hit the golf cart!
          const explosionX = bombX;
          const explosionY = bombY;
          bomb.explode(this);

          // Apply shockwave to shuttle
          this.applyExplosionShockwave(explosionX, explosionY);

          // Get cart info and destroy it
          const { name, points, filePositions } = this.golfCart.explode();
          this.destructionScore += points;

          // Show special destruction message
          this.showGolfCartDestroyed(this.golfCart.x, this.golfCart.y - 50, points);

          // Spawn Epstein Files
          this.spawnEpsteinFiles(filePositions);

          this.bombs.splice(i, 1);
          bombDestroyed = true;
        }
      }

      if (bombDestroyed) continue;

      // Check collision with terrain (LAST, after checking buildings and cannons)
      const terrainY = this.terrain.getHeightAt(bombX);
      if (bombY >= terrainY - 5) {
        // Check if over water (Atlantic Ocean)
        const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
        const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
        const isOverWater = bombX >= atlanticStart && bombX < atlanticEnd;

        if (isOverWater) {
          // Bomb sinks in water instead of exploding
          this.sinkBombInWater(bomb, terrainY);
          this.bombs.splice(i, 1);
          continue;
        }

        // Normal terrain - explode
        const explosionX = bombX;
        const explosionY = bombY;
        bomb.explode(this);

        // Apply shockwave to shuttle
        this.applyExplosionShockwave(explosionX, explosionY);

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

  private sinkBombInWater(bomb: Bomb, waterLevel: number): void {
    const bombX = bomb.x;

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
      const droplet = this.add.graphics();
      droplet.fillStyle(0x4169E1, 0.7);
      droplet.fillCircle(0, 0, 2 + Math.random() * 3);
      droplet.setPosition(bombX + (Math.random() - 0.5) * 20, waterLevel);
      droplet.setDepth(101);

      this.tweens.add({
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
    const ripple = this.add.graphics();
    ripple.lineStyle(2, 0x87CEEB, 0.6);
    ripple.strokeCircle(bombX, waterLevel, 5);
    ripple.setDepth(99);

    this.tweens.add({
      targets: ripple,
      scaleX: 3,
      scaleY: 0.4,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => ripple.destroy(),
    });

    // Create a sinking visual using the actual food sprite
    const sinkingFood = this.add.sprite(bombX, waterLevel, spriteKey);
    sinkingFood.setScale(0.06); // Same scale as bomb
    sinkingFood.setDepth(50);

    // Sink slowly to the bottom and stay there
    this.tweens.add({
      targets: sinkingFood,
      y: waterLevel + 120, // Sink to bottom
      alpha: 0.5,
      angle: sinkingFood.angle + 30, // Slight rotation as it sinks
      duration: 2000,
      ease: 'Quad.easeOut',
      // Don't destroy - let it stay at the bottom
    });

    // Small bubbles as it sinks
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(200 + i * 200, () => {
        const bubble = this.add.graphics();
        bubble.fillStyle(0xADD8E6, 0.5);
        bubble.fillCircle(0, 0, 2);
        bubble.setPosition(bombX + (Math.random() - 0.5) * 10, waterLevel + 30 + i * 15);
        bubble.setDepth(98);

        this.tweens.add({
          targets: bubble,
          y: bubble.y - 40,
          alpha: 0,
          duration: 400,
          ease: 'Quad.easeOut',
          onComplete: () => bubble.destroy(),
        });
      });
    }

    // Destroy the original bomb object
    bomb.destroy();
  }

  private showDestructionPoints(x: number, y: number, points: number, name: string): void {
    // Show building name
    const nameText = this.add.text(x, y - 20, name, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '16px',
      color: '#FF6600',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    nameText.setOrigin(0.5, 0.5);
    nameText.setDepth(150);

    // Show points
    const pointsText = this.add.text(x, y + 10, `+${points} POINTS!`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '24px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    pointsText.setOrigin(0.5, 0.5);
    pointsText.setDepth(150);

    // Animate both texts - stay visible longer then fade
    this.tweens.add({
      targets: [nameText, pointsText],
      y: '-=80',
      alpha: 0,
      duration: 3500,
      delay: 500, // Hold for half a second before starting to fade
      ease: 'Power1',
      onComplete: () => {
        nameText.destroy();
        pointsText.destroy();
      },
    });

    // Emit event to UIScene to update score display
    this.events.emit('destructionScore', this.destructionScore);
  }

  private showFisherBoatDestroyed(x: number, y: number, points: number): void {
    // Show "Drug Kingpin dinghy destroyed!" message
    const nameText = this.add.text(x, y - 20, 'Drug Kingpin dinghy destroyed!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '20px',
      color: '#FF4500', // Orange-red
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    nameText.setOrigin(0.5, 0.5);
    nameText.setDepth(150);

    // Show points
    const pointsText = this.add.text(x, y + 15, `+${points} POINTS!`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '28px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    pointsText.setOrigin(0.5, 0.5);
    pointsText.setDepth(150);

    // Animate both texts - stay visible longer then fade
    this.tweens.add({
      targets: [nameText, pointsText],
      y: '-=100',
      alpha: 0,
      duration: 4000,
      delay: 800, // Hold longer for this special message
      ease: 'Power1',
      onComplete: () => {
        nameText.destroy();
        pointsText.destroy();
      },
    });

    // Emit event to UIScene to update score display
    this.events.emit('destructionScore', this.destructionScore);
  }

  private showGolfCartDestroyed(x: number, y: number, points: number): void {
    // Show "Presidential Getaway destroyed!" message
    const nameText = this.add.text(x, y - 20, 'Presidential Getaway destroyed!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '20px',
      color: '#FF4500', // Orange-red
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    nameText.setOrigin(0.5, 0.5);
    nameText.setDepth(150);

    // Show points
    const pointsText = this.add.text(x, y + 15, `+${points} POINTS!`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '28px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    pointsText.setOrigin(0.5, 0.5);
    pointsText.setDepth(150);

    // Animate both texts - stay visible longer then fade
    this.tweens.add({
      targets: [nameText, pointsText],
      y: '-=100',
      alpha: 0,
      duration: 4000,
      delay: 800,
      ease: 'Power1',
      onComplete: () => {
        nameText.destroy();
        pointsText.destroy();
      },
    });

    // Emit event to UIScene to update score display
    this.events.emit('destructionScore', this.destructionScore);
  }

  private spawnEpsteinFiles(positions: { x: number; y: number }[]): void {
    // Spawn collectible Epstein Files at the given positions
    for (const pos of positions) {
      // Create a file document graphic
      const file = this.add.container(pos.x, pos.y);
      file.setDepth(50);
      file.setData('collected', false);

      // File folder graphic
      const folder = this.add.graphics();
      // Folder tab
      folder.fillStyle(0xDEB887, 1); // Burlywood (manila)
      folder.fillRoundedRect(-12, -18, 10, 5, 2);
      // Main folder
      folder.fillStyle(0xF5DEB3, 1); // Wheat (manila folder)
      folder.fillRoundedRect(-15, -15, 30, 22, 3);
      // Folder outline
      folder.lineStyle(1, 0xCD853F, 1);
      folder.strokeRoundedRect(-15, -15, 30, 22, 3);
      // "CLASSIFIED" text line
      folder.fillStyle(0x8B0000, 1);
      folder.fillRect(-10, -8, 20, 3);
      // Document lines
      folder.fillStyle(0x333333, 0.3);
      folder.fillRect(-10, -2, 18, 2);
      folder.fillRect(-10, 2, 15, 2);

      file.add(folder);

      // "EPSTEIN" label
      const label = this.add.text(0, -5, 'EPSTEIN', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '6px',
        color: '#8B0000',
        fontStyle: 'bold',
      });
      label.setOrigin(0.5, 0.5);
      file.add(label);

      // Track this file for pickup detection
      this.epsteinFiles.push(file);

      // Animate file scattering then floating down to terrain
      const scatterX = pos.x + (Math.random() - 0.5) * 100;
      const scatterY = pos.y - 50 - Math.random() * 30;
      const terrainY = this.terrain.getHeightAt(scatterX) - 15; // Land on terrain

      // First scatter upward
      this.tweens.add({
        targets: file,
        x: scatterX,
        y: scatterY,
        angle: (Math.random() - 0.5) * 60,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => {
          // Then float down to terrain level
          this.tweens.add({
            targets: file,
            y: terrainY,
            angle: file.angle + (Math.random() - 0.5) * 20,
            duration: 2000,
            ease: 'Bounce.easeOut',
            onComplete: () => {
              // File is now on the ground - stay there for a while
              file.setData('grounded', true);

              // Fade out after 10 seconds if not collected
              this.time.delayedCall(10000, () => {
                if (file && file.active && !file.getData('collected')) {
                  // Remove from tracking and fade out
                  const idx = this.epsteinFiles.indexOf(file);
                  if (idx >= 0) {
                    this.epsteinFiles.splice(idx, 1);
                  }

                  this.tweens.add({
                    targets: file,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => file.destroy(),
                  });
                }
              });
            },
          });
        },
      });
    }
  }

  private updateEpsteinFiles(): void {
    // Check for shuttle proximity to collect files - must be landed!
    const pickupRadius = 60; // Must be close to pick up

    // Check if shuttle is landed (very low velocity and on ground)
    const velocity = this.shuttle.getVelocity();
    const isLanded = velocity.total < 0.5;

    for (let i = this.epsteinFiles.length - 1; i >= 0; i--) {
      const file = this.epsteinFiles[i];
      if (!file || !file.active || file.getData('collected')) continue;

      const dx = this.shuttle.x - file.x;
      const dy = this.shuttle.y - file.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < pickupRadius && isLanded) {
        // Mark as collected
        file.setData('collected', true);

        // Play boing sound
        this.playBoingSound();

        // Add to cargo inventory
        this.inventorySystem.add('EPSTEIN_FILES');

        // Show pickup text
        const pickupText = this.add.text(file.x, file.y - 20, '+1 EPSTEIN FILES', {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '12px',
          color: '#8B0000',
          fontStyle: 'bold',
          stroke: '#FFFFFF',
          strokeThickness: 2,
        });
        pickupText.setOrigin(0.5, 0.5);
        pickupText.setDepth(150);

        this.tweens.add({
          targets: pickupText,
          y: '-=30',
          alpha: 0,
          duration: 1500,
          onComplete: () => pickupText.destroy(),
        });

        // Quick collect animation - file flies to shuttle
        this.tweens.killTweensOf(file); // Stop floating
        this.tweens.add({
          targets: file,
          x: this.shuttle.x,
          y: this.shuttle.y,
          scale: 0,
          alpha: 0,
          duration: 300,
          ease: 'Quad.easeIn',
          onComplete: () => {
            const idx = this.epsteinFiles.indexOf(file);
            if (idx >= 0) {
              this.epsteinFiles.splice(idx, 1);
            }
            file.destroy();
          },
        });
      }
    }
  }

  private applyExplosionShockwave(explosionX: number, explosionY: number): void {
    if (!this.shuttle || !this.shuttle.body) return;

    const shuttleX = this.shuttle.x;
    const shuttleY = this.shuttle.y;

    // Calculate distance from explosion to shuttle
    const dx = shuttleX - explosionX;
    const dy = shuttleY - explosionY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Shockwave radius and strength
    const maxRadius = 300; // Max distance for shockwave effect
    const maxForce = 8; // Maximum force at epicenter

    if (distance < maxRadius) {
      // Force decreases with distance (inverse square-ish falloff)
      const falloff = 1 - (distance / maxRadius);
      const force = maxForce * falloff * falloff;

      // Normalize direction and apply force
      const dirX = dx / (distance || 1);
      const dirY = dy / (distance || 1);

      // Apply velocity change to shuttle
      const currentVelocity = this.shuttle.body.velocity as { x: number; y: number };
      this.shuttle.setVelocity(
        currentVelocity.x + dirX * force,
        currentVelocity.y + dirY * force - force * 0.5 // Add slight upward boost
      );

      // Add some angular velocity for tumble effect
      const angularForce = (Math.random() - 0.5) * force * 0.02;
      this.shuttle.setAngularVelocity(
        (this.shuttle.body as MatterJS.BodyType).angularVelocity + angularForce
      );
    }
  }

  private updatePowerUps(): void {
    const now = this.time.now;

    // Update bribe effect - subtle green outline when cannons are standing down
    if (this.cannonsBribed) {
      if (now >= this.bribeEndTime) {
        this.cannonsBribed = false;
        if (this.bribeGraphics) {
          this.bribeGraphics.clear();
        }
      } else {
        // Draw subtle glow outline around shuttle
        if (this.bribeGraphics) {
          this.bribeGraphics.clear();
          const timeLeft = this.bribeEndTime - now;
          const pulseSpeed = timeLeft < 2000 ? 0.015 : 0.006;
          const baseAlpha = timeLeft < 2000 ? 0.3 : 0.5;
          const alpha = baseAlpha + Math.sin(now * pulseSpeed) * 0.15;

          // Simple thin green outline around shuttle
          this.bribeGraphics.lineStyle(2, 0x32CD32, alpha);
          this.bribeGraphics.strokeCircle(this.shuttle.x, this.shuttle.y, 32 + Math.sin(now * 0.008) * 2);
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
    return Date.now() - this.gameStartTime;
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
      if (this.gameState !== 'crashed') return; // Don't show if we landed successfully
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        victory: false,
        message: message,
        score: this.destructionScore,
        debugModeUsed: this.shuttle.wasDebugModeUsed(),
        destroyedBuildings: this.destroyedBuildings,
      });
    });
  }

  private checkProjectileCollisions(): void {
    // Collect all projectiles from all cannons
    const allProjectiles: { projectile: any; cannonIndex: number }[] = [];
    for (let i = 0; i < this.cannons.length; i++) {
      for (const projectile of this.cannons[i].getProjectiles()) {
        allProjectiles.push({ projectile, cannonIndex: i });
      }
    }

    // Check each pair of projectiles for collision
    const collisionRadius = 15; // Collision detection radius
    const toDestroy: Set<any> = new Set();

    for (let i = 0; i < allProjectiles.length; i++) {
      for (let j = i + 1; j < allProjectiles.length; j++) {
        const p1 = allProjectiles[i].projectile;
        const p2 = allProjectiles[j].projectile;

        // Skip if already marked for destruction
        if (toDestroy.has(p1) || toDestroy.has(p2)) continue;

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < collisionRadius) {
          // Collision! Mark both for destruction
          toDestroy.add(p1);
          toDestroy.add(p2);

          // Create small explosion at midpoint
          this.createProjectileExplosion((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        }
      }
    }

    // Remove destroyed projectiles from their cannons
    for (const cannon of this.cannons) {
      const projectiles = cannon.getProjectiles();
      for (let i = projectiles.length - 1; i >= 0; i--) {
        if (toDestroy.has(projectiles[i])) {
          projectiles[i].destroy();
          projectiles.splice(i, 1);
        }
      }
    }
  }

  private createProjectileExplosion(x: number, y: number): void {
    // Big explosion flash - projectiles colliding creates a satisfying boom
    const flash = this.add.graphics();
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

    this.tweens.add({
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
      const debris = this.add.graphics();
      const colors = [0xFF6600, 0xFFAA00, 0x888888, 0xFFFF00];
      debris.fillStyle(colors[Math.floor(Math.random() * colors.length)], 1);
      debris.fillCircle(0, 0, 2 + Math.random() * 3);
      debris.setPosition(x, y);

      this.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 400 + Math.random() * 200,
        onComplete: () => debris.destroy(),
      });
    }
  }

  update(time: number): void {
    if (this.gameState !== 'playing') return;

    // Update terrain (for animated ocean waves)
    this.terrain.update();

    // Update fisherboat (bob with waves)
    if (this.fisherBoat && !this.fisherBoat.isDestroyed) {
      this.fisherBoat.update(this.terrain.getWaveOffset());
    }

    // Update golf cart (patrol and flee)
    if (this.golfCart && !this.golfCart.isDestroyed) {
      this.golfCart.update(this.terrain, this.shuttle.x, this.shuttle.y, time);
    }

    // Update Epstein Files (check for pickup)
    this.updateEpsteinFiles();

    // Update shuttle
    this.shuttle.update(this.cursors);

    // Handle bomb drop (arrow down)
    if (this.cursors.down.isDown && !this.bombCooldown) {
      this.dropBomb();
      this.bombCooldown = true;
      this.time.delayedCall(300, () => {
        this.bombCooldown = false;
      });
    }

    // Update bombs
    this.updateBombs();

    // Update peace medal graphics if carrying
    this.updatePeaceMedalGraphics();

    // Update power-up effects
    this.updatePowerUps();

    // Update cannons
    for (const cannon of this.cannons) {
      const cameraLeft = this.cameras.main.scrollX - 200;
      const cameraRight = this.cameras.main.scrollX + GAME_WIDTH + 200;
      const isOnScreen = cannon.x >= cameraLeft && cannon.x <= cameraRight;
      const hasProjectiles = cannon.getProjectiles().length > 0;

      // Only set target and allow firing if cannon is on-screen, active, AND not bribed
      // Bribed cannons stand down completely - they won't fire new projectiles
      if (isOnScreen && cannon.isActive() && !this.cannonsBribed) {
        cannon.setTarget({ x: this.shuttle.x, y: this.shuttle.y });
      } else if (this.cannonsBribed) {
        // Clear target so cannons stop aiming/firing
        cannon.setTarget(null as any);
      }

      // ALWAYS update cannons that have projectiles in flight, even if off-screen
      // This ensures projectiles keep moving after player scrolls away from cannon
      if (isOnScreen || hasProjectiles) {
        cannon.update(time);

        // Check projectile collisions manually
        for (const projectile of cannon.getProjectiles()) {
          const dx = projectile.x - this.shuttle.x;
          const dy = projectile.y - this.shuttle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 25) {
            this.handleProjectileHit(projectile.getSpriteKey());
          }
        }
      }
    }

    // Check projectile-to-projectile collisions
    this.checkProjectileCollisions();

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
        score: this.destructionScore,
        destroyedBuildings: this.destroyedBuildings,
      });
    }
  }
}
