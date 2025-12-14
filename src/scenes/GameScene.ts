import Phaser from 'phaser';
import { Shuttle, ShuttleControls } from '../objects/Shuttle';
import { Terrain } from '../objects/Terrain';
import { LandingPad } from '../objects/LandingPad';
import { Cannon } from '../objects/Cannon';
import { Collectible, spawnCollectibles, CollectibleType } from '../objects/Collectible';
import { CountryDecoration, getCountryAssetPrefix } from '../objects/CountryDecoration';
import { MedalHouse } from '../objects/MedalHouse';
import { Bomb } from '../objects/Bomb';
import { FisherBoat } from '../objects/FisherBoat';
import { GolfCart } from '../objects/GolfCart';
import { OilTower } from '../objects/OilTower';
import { Biplane } from '../objects/Biplane';
import { Shark } from '../objects/Shark';
import { GreenlandIce } from '../objects/GreenlandIce';
import { FuelSystem } from '../systems/FuelSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { getAchievementSystem, AchievementSystem } from '../systems/AchievementSystem';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  WORLD_WIDTH,
  WORLD_START_X,
  COUNTRIES,
  LANDING_PADS,
  BOMB_DROPPABLE_TYPES,
  FOOD_PICKUP_AMOUNT,
  COLLECTIBLE_TYPES,
} from '../constants';

type GameState = 'playing' | 'landed' | 'crashed' | 'victory';
type CauseOfDeath = 'water' | 'terrain' | 'landing' | 'duck' | 'void' | 'fuel' | string;

export class GameScene extends Phaser.Scene {
  private shuttle!: Shuttle; // Primary shuttle (P1) - kept for compatibility
  private shuttle2: Shuttle | null = null; // Secondary shuttle (P2)
  private shuttles: Shuttle[] = []; // All active shuttles
  private playerCount: number = 1;
  private terrain!: Terrain;
  private landingPads: LandingPad[] = [];
  private cannons: Cannon[] = [];
  private collectibles: Collectible[] = [];
  private decorations: (CountryDecoration | MedalHouse)[] = [];
  private medalHouse: MedalHouse | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private p1Controls!: ShuttleControls;
  private p2Controls: ShuttleControls | null = null;
  private p2BombKey: Phaser.Input.Keyboard.Key | null = null;
  private fuelSystem!: FuelSystem;
  private fuelSystem2: FuelSystem | null = null; // P2's fuel system
  private inventorySystem!: InventorySystem;
  private inventorySystem2: InventorySystem | null = null; // P2's inventory
  private gameState: GameState = 'playing';
  private starfield!: Phaser.GameObjects.Graphics;
  private currentCountryText!: Phaser.GameObjects.Text;
  private startPadId: number = 1; // Track which pad we started on (NYC is now index 1)
  private invulnerable: boolean = true; // Brief invulnerability at start
  private gameStartTime: number = 0; // Track when game started for timer
  private hasPeaceMedal: boolean = false; // Whether player picked up the peace medal
  private peaceMedalGraphics: Phaser.GameObjects.Graphics | null = null; // Medal hanging under shuttle
  private medalCarrier: Shuttle | null = null; // Which shuttle is carrying the medal

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
  private speedBoostPlayer: number = 1; // Which player has the speed boost
  private bribeGraphics: Phaser.GameObjects.Graphics | null = null;
  private speedBoostTrail: Phaser.GameObjects.Graphics | null = null;
  private tieSegments: { x: number; y: number }[] = []; // For floppy tie physics

  // Sitting duck detection
  private sittingDuckStartTime: number = 0;
  private isSittingDuck: boolean = false;

  // Prevent splash sounds during initial load
  private gameInitialized: boolean = false;

  // Bomb system
  private bombs: Bomb[] = [];
  private bombCooldown: boolean = false;
  private bombCooldown2: boolean = false;
  private destructionScore: number = 0;
  private destroyedBuildings: { name: string; points: number; textureKey: string; country: string }[] = [];

  // Player vs player kill tracking (2-player mode)
  private p1Kills: number = 0;
  private p2Kills: number = 0;

  // Death messages for 2-player mode
  private p1DeathMessage: string = '';
  private p2DeathMessage: string = '';

  // Fisherboat in Atlantic
  private fisherBoat: FisherBoat | null = null;
  private shuttleOnBoat: boolean = false; // Track if shuttle has landed on boat

  // Sharks in Atlantic
  private sharks: Shark[] = [];
  private sunkenFood: { x: number; y: number; sprite: Phaser.GameObjects.Sprite }[] = [];

  // Greenland ice block
  private greenlandIce: GreenlandIce | null = null;
  private hasGreenlandIce: boolean = false;
  private iceAngle: number = 0;
  private iceAngularVelocity: number = 0;
  private iceCarrier: Shuttle | null = null;
  private greenlandIceGraphics: Phaser.GameObjects.Graphics | null = null;
  private lastIceVelX: number = 0;
  private lastIceVelY: number = 0;

  // Landing pad debounce (prevent re-triggering trade after closing)
  private lastLandingTime: number = 0;
  private lastTradedPad: LandingPad | null = null; // Track pad we just traded at

  // Golf cart in USA
  private golfCart: GolfCart | null = null;
  private epsteinFiles: Phaser.GameObjects.Container[] = [];

  // Propaganda biplane
  private biplane: Biplane | null = null;
  private propagandaBanners: Phaser.GameObjects.Container[] = [];
  private biplaneTargetCountry: string | null = null; // Country where biplane will spawn when player enters
  private biplaneSpawned: boolean = false;

  // Oil towers at fuel depots
  private oilTowers: OilTower[] = [];

  // Scorch marks from thrust
  private scorchMarks: Phaser.GameObjects.Graphics | null = null;
  private lastScorchTime: number = 0;
  private scorchMarkData: { x: number; y: number; width: number; height: number; type: 'thrust' | 'crater'; seed: number; distance?: number }[] = [];

  // Water pollution from thrust/bombs
  private waterPollution: Phaser.GameObjects.Graphics | null = null;
  private waterPollutionLevel: number = 0; // 0-1, how dark the water is
  private totalWaterPollutionParticles: number = 0; // Total particles ever added
  private sinkingScorchParticles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; rotation: number; rotSpeed: number; shape: number }[] = [];

  // Debug monitoring display
  private debugText: Phaser.GameObjects.Text | null = null;

  // Tombstones for death locations (persistent across restarts)
  private tombstoneGraphics: Phaser.GameObjects.Container[] = [];
  private tombstoneBodies: MatterJS.BodyType[] = [];
  private static readonly TOMBSTONE_STORAGE_KEY = 'peaceShuttle_tombstones';

  // Achievement system
  private achievementSystem!: AchievementSystem;
  private cannonsDestroyedThisGame: number = 0;
  private tombstoneBounceCount: number = 0;
  private juggledTombstoneId: number | null = null; // Track which tombstone is being juggled
  private lastTombstoneBounceTime: number = 0; // Debounce multiple collision events

  // Weather system
  private weatherState: 'clear' | 'cloudy' | 'stormy' = 'clear';
  private cloudData: { x: number; y: number; scale: number; type: 'cumulus' | 'stratus' | 'alto' | 'storm'; isStormCloud: boolean; lastLightningTime: number }[] = [];
  private cloudGraphics: Phaser.GameObjects.Graphics | null = null;
  private lightningGraphics: Phaser.GameObjects.Graphics | null = null;
  private rainGraphics: Phaser.GameObjects.Graphics | null = null;
  private rainDrops: { x: number; y: number; speed: number; length: number }[] = [];
  private rainIntensity: 'none' | 'light' | 'medium' | 'heavy' = 'none';
  private rainSplashes: { x: number; y: number; particles: { dx: number; dy: number; vy: number }[]; age: number }[] = [];
  private lastLightningCheck: number = 0;
  private pendingLightningStrike: { cloud: { x: number; y: number; scale: number; type: 'cumulus' | 'stratus' | 'alto' | 'storm'; isStormCloud: boolean; lastLightningTime: number }; shuttle: Shuttle; warningStart: number; strikeDelay: number } | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(data?: { playerCount?: number }): void {
    this.gameState = 'playing';
    this.gameStartTime = Date.now(); // Use Date.now() for reliable timing across scene restarts
    this.playerCount = data?.playerCount ?? 1;

    // Reset all game object arrays (Phaser may reuse scene instances)
    this.landingPads = [];
    this.cannons = [];
    this.collectibles = [];
    this.decorations = [];
    this.medalHouse = null;
    this.bombs = [];
    this.oilTowers = [];
    this.scorchMarkData = [];
    this.waterPollutionLevel = 0;
    this.totalWaterPollutionParticles = 0;
    this.sinkingScorchParticles = [];
    this.shuttles = [];
    this.shuttle2 = null;
    this.fuelSystem2 = null;
    this.inventorySystem2 = null;
    this.p2Controls = null;
    this.tombstoneGraphics = [];
    this.tombstoneBodies = [];
    this.fisherBoat = null;
    this.shuttleOnBoat = false;
    this.sharks = [];
    this.sunkenFood = [];
    this.gameInitialized = false; // Reset to prevent splash effects on load
    // Note: p1Kills and p2Kills persist across restarts within a session
    // Reset death messages for new game
    this.p1DeathMessage = '';
    this.p2DeathMessage = '';

    // Initialize systems
    this.fuelSystem = new FuelSystem();
    this.inventorySystem = new InventorySystem();
    this.cannonsDestroyedThisGame = 0;

    // Initialize achievement system
    this.achievementSystem = getAchievementSystem();
    this.achievementSystem.startSession();
    // Note: Achievement popup is created in UIScene so it appears on top of all UI elements

    // Initialize P2 systems if 2-player mode
    if (this.playerCount === 2) {
      this.fuelSystem2 = new FuelSystem();
      this.inventorySystem2 = new InventorySystem();
    }

    // Create starfield background
    this.createStarfield();

    // Create terrain (including Washington DC area to the left)
    this.terrain = new Terrain(this, WORLD_START_X, WORLD_WIDTH);

    // Load tombstones from previous deaths (persistent across restarts)
    this.loadTombstones();

    // Create scorch marks graphics layer (behind buildings, on top of terrain)
    this.scorchMarks = this.add.graphics();
    this.scorchMarks.setDepth(2);

    // Create water pollution graphics layer (for sinking scorch particles in ocean)
    this.waterPollution = this.add.graphics();
    this.waterPollution.setDepth(100); // Above water surface

    // Create fisherboat in Atlantic Ocean (center of Atlantic at x ~3500)
    this.fisherBoat = new FisherBoat(this, 3500);
    // 15% chance the boat has a "fish" package
    this.fisherBoat.hasFishPackage = Math.random() < 0.15;

    // Create sharks in Atlantic Ocean
    this.spawnSharks();

    // Create Greenland ice block in Atlantic Ocean
    this.spawnGreenlandIce();

    // Create golf cart in USA section (patrols x: 800-1200) - 1/3 chance to spawn
    if (Math.random() < 0.33) {
      this.golfCart = new GolfCart(this, 1000, 800, 1200);
    }

    // Pick biplane type: 30% chance for info plane, 70% for country propaganda
    if (Math.random() < 0.3) {
      this.biplaneTargetCountry = 'GAME_INFO';
    } else {
      const biplaneCountries = ['USA', 'United Kingdom', 'France', 'Germany', 'Poland', 'Russia'];
      this.biplaneTargetCountry = biplaneCountries[Math.floor(Math.random() * biplaneCountries.length)];
    }
    this.biplaneSpawned = false;

    // Create cannons first (so decorations can avoid them)
    this.createCannons();

    // Create country decorations (buildings and landmarks) - skips areas near cannons
    this.createDecorations();

    // Reset peace medal state
    this.hasPeaceMedal = false;
    this.peaceMedalGraphics = null;
    this.medalCarrier = null;

    // Reset Greenland ice state (note: greenlandIce object is created in spawnGreenlandIce above)
    this.hasGreenlandIce = false;
    this.iceAngle = 0;
    this.iceAngularVelocity = 0;
    this.iceCarrier = null;
    this.greenlandIceGraphics = null;
    this.lastIceVelX = 0;
    this.lastIceVelY = 0;

    // Reset score and destroyed buildings
    this.destructionScore = 0;
    this.destroyedBuildings = [];

    // Reset power-up states (Phaser may reuse scene instances)
    this.cannonsBribed = false;
    this.bribeEndTime = 0;
    this.hasSpeedBoost = false;
    this.speedBoostEndTime = 0;
    this.speedBoostPlayer = 1;
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

    // Create shuttle(s) - start landed on NYC pad (index 1, since Washington is now index 0)
    const startPad = this.landingPads[1]; // NYC Fuel Stop
    this.startPadId = 1; // Remember we started on pad 1
    // Position shuttle on the pad - adjust so feet visually touch the platform (with legs down)
    const shuttleStartY = startPad.y - 20;

    // Create Player 1 shuttle
    const p1X = this.playerCount === 2 ? startPad.x - 30 : startPad.x; // Offset left if 2 players, stay on pad
    this.shuttle = new Shuttle(this, p1X, shuttleStartY, 0);
    this.shuttle.setFuelSystem(this.fuelSystem);
    this.shuttle.setVelocity(0, 0);
    this.shuttle.setStatic(true);
    this.shuttles.push(this.shuttle);

    // Create Player 2 shuttle if 2-player mode
    if (this.playerCount === 2 && this.fuelSystem2) {
      const p2X = startPad.x + 30; // Offset right, stay on pad
      this.shuttle2 = new Shuttle(this, p2X, shuttleStartY, 1);
      this.shuttle2.setFuelSystem(this.fuelSystem2);
      this.shuttle2.setVelocity(0, 0);
      this.shuttle2.setStatic(true);
      this.shuttles.push(this.shuttle2);
    }

    // Invulnerability at start - prevents crashes until player launches
    this.invulnerable = true;

    // Set up camera - allow space for flying high and Washington to the left
    this.cameras.main.setBounds(WORLD_START_X, -300, WORLD_WIDTH - WORLD_START_X, GAME_HEIGHT + 300);
    // IMPORTANT: Center camera on shuttle FIRST before enabling follow
    this.cameras.main.centerOn(this.shuttle.x, this.shuttle.y);
    // For 2-player mode, we'll update camera manually in the update loop
    if (this.playerCount === 1) {
      this.cameras.main.startFollow(this.shuttle, true, 0.1, 0.1);
    }
    this.cameras.main.setDeadzone(200, 100);

    // Removed bloom effect - was causing visual issues

    // Set up input - create cursor keys for P1
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Set up custom controls for both players
    this.p1Controls = {
      thrust: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      rotateLeft: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      rotateRight: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      gear: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    };
    this.shuttle.setControls(this.p1Controls);

    // Set up P2 controls if 2-player mode
    if (this.playerCount === 2 && this.shuttle2) {
      this.p2Controls = {
        thrust: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        rotateLeft: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        rotateRight: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        gear: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      };
      this.shuttle2.setControls(this.p2Controls);
      // P2 bomb key (S)
      this.p2BombKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    }

    // Set up 1/2 keys to restart game with different player counts
    const key1 = this.input.keyboard!.addKey(49); // '1' key
    key1.on('down', () => {
      this.restartWithPlayerCount(1);
    });
    const key2 = this.input.keyboard!.addKey(50); // '2' key
    key2.on('down', () => {
      this.restartWithPlayerCount(2);
    });

    // Set up collision detection
    this.setupCollisions();

    // Start UI scene
    this.scene.launch('UIScene', {
      fuelSystem: this.fuelSystem,
      inventorySystem: this.inventorySystem,
      getShuttleVelocity: () => this.shuttle?.getVelocity() ?? { x: 0, y: 0, total: 0 },
      getProgress: () => this.getProgress(),
      getCurrentCountry: () => this.getCurrentCountry(),
      getLegsExtended: () => this.shuttle?.areLandingLegsExtended() ?? false,
      getElapsedTime: () => this.getElapsedTime(),
      hasPeaceMedal: () => this.hasPeaceMedal,
      // P2 data for 2-player mode
      playerCount: this.playerCount,
      fuelSystem2: this.fuelSystem2,
      inventorySystem2: this.inventorySystem2,
      getP2Velocity: () => this.shuttle2?.getVelocity() ?? { x: 0, y: 0, total: 0 },
      getP2LegsExtended: () => this.shuttle2?.areLandingLegsExtended() ?? false,
      isP2Active: () => this.shuttle2?.active ?? false,
      getKillCounts: () => ({ p1Kills: this.p1Kills, p2Kills: this.p2Kills }),
    });

    // Country indicator
    this.currentCountryText = this.add.text(GAME_WIDTH / 2, 20, '', {
      fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.currentCountryText.setOrigin(0.5, 0);

    // Debug monitoring display (bottom-right corner)
    this.debugText = this.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 10, '', {
      fontFamily: 'monospace', fontSize: '14px',
      color: '#00ff00',
      backgroundColor: '#000000aa',
      padding: { x: 5, y: 5 },
    });
    this.debugText.setOrigin(1, 1);
    this.debugText.setScrollFactor(0);
    this.debugText.setDepth(1000);

    // Handle first thrust - enable physics and collisions
    let hasLaunched = false;
    const launchHandler = () => {
      // Check if either player presses thrust
      const p1Thrust = this.p1Controls.thrust.isDown;
      const p2Thrust = this.p2Controls?.thrust.isDown ?? false;

      if (!hasLaunched && (p1Thrust || p2Thrust)) {
        hasLaunched = true;
        console.log('Launching shuttle(s) - enabling physics');
        // Enable physics on all shuttles
        this.shuttles.forEach(shuttle => shuttle.setStatic(false));
        // Short delay before enabling collision damage (let players get away from start)
        this.time.delayedCall(800, () => {
          console.log('Invulnerability ended');
          this.invulnerable = false;
          this.gameInitialized = true; // Enable splash sounds after initial load
        });
      }
    };
    this.events.on('update', launchHandler);
    this.currentCountryText.setScrollFactor(0);
    // Removed postFX glow - was causing black screen issues

    // Stop rocket sound when scene shuts down
    this.events.on('shutdown', () => {
      this.shuttles.forEach(shuttle => shuttle.stopRocketSound());
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

    // Initialize weather state (60% clear, 25% cloudy, 15% stormy)
    const weatherRoll = Math.random();
    if (weatherRoll < 0.15) {
      this.weatherState = 'stormy';
    } else if (weatherRoll < 0.40) {
      this.weatherState = 'cloudy';
    } else {
      this.weatherState = 'clear';
    }
    console.log(`[Weather] ${this.weatherState.toUpperCase()}${this.weatherState === 'stormy' ? ' - watch out for lightning!' : ''}`);

    // Determine cloud count based on weather
    const cloudCounts = { clear: 15, cloudy: 25, stormy: 35 };
    const cloudCount = cloudCounts[this.weatherState];

    // Determine storm cloud chance based on weather
    const stormCloudChance = { clear: 0, cloudy: 0.15, stormy: 0.4 };
    const stormChance = stormCloudChance[this.weatherState];

    // Generate varied cloud data
    this.cloudData = [];
    for (let i = 0; i < cloudCount; i++) {
      // Decide cloud type
      const typeRoll = Math.random();
      let type: 'cumulus' | 'stratus' | 'alto' | 'storm';
      let y: number;
      let scale: number;

      // Check if this should be a storm cloud first
      if (Math.random() < stormChance) {
        type = 'storm';
        y = 80 + Math.random() * 120; // Storm clouds at mid-height
        scale = 1.0 + Math.random() * 1.0; // Larger scale
      } else if (typeRoll < 0.15) {
        type = 'alto';
        y = 30 + Math.random() * 50; // High clouds
        scale = 0.3 + Math.random() * 0.3; // Smaller
      } else if (typeRoll < 0.35) {
        type = 'stratus';
        y = 60 + Math.random() * 150; // Mid-level
        scale = 0.5 + Math.random() * 0.6;
      } else {
        type = 'cumulus';
        y = 50 + Math.random() * 200; // Various heights
        scale = 0.5 + Math.random() * 0.8;
      }

      this.cloudData.push({
        x: Math.random() * GAME_WIDTH * 5,
        y,
        scale,
        type,
        isStormCloud: type === 'storm',
        lastLightningTime: 0
      });
    }

    // Draw clouds with parallax and shading
    this.cloudGraphics = this.add.graphics();
    this.cloudGraphics.setScrollFactor(0.02);
    this.cloudGraphics.setDepth(-90);

    for (const cloud of this.cloudData) {
      this.drawCloud(this.cloudGraphics, cloud);
    }

    // Add gentle cloud drift animation
    this.tweens.add({
      targets: this.cloudGraphics,
      x: 30,
      duration: 15000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Create lightning graphics layer (above clouds)
    this.lightningGraphics = this.add.graphics();
    this.lightningGraphics.setScrollFactor(0.02);
    this.lightningGraphics.setDepth(-85);

    // Create rain graphics layer (in front of clouds but behind UI)
    this.rainGraphics = this.add.graphics();
    this.rainGraphics.setScrollFactor(0);
    this.rainGraphics.setDepth(-80);

    // Initialize rain (intensity depends on weather state)
    this.initializeRain();

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

  private drawCloud(graphics: Phaser.GameObjects.Graphics, cloud: typeof this.cloudData[0]): void {
    const { x, y, scale: s, type } = cloud;

    switch (type) {
      case 'cumulus':
        // Very fluffy cumulus cloud with many soft overlapping puffs
        // Outer soft shadow/glow
        graphics.fillStyle(0xE8E8E8, 0.3);
        graphics.fillCircle(x - 25 * s, y + 8 * s, 30 * s);
        graphics.fillCircle(x + 15 * s, y + 10 * s, 35 * s);
        graphics.fillCircle(x + 55 * s, y + 8 * s, 28 * s);
        // Shadow layer
        graphics.fillStyle(0xDDDDDD, 0.6);
        graphics.fillCircle(x - 20 * s, y + 5 * s, 26 * s);
        graphics.fillCircle(x + 8 * s, y + 8 * s, 30 * s);
        graphics.fillCircle(x + 38 * s, y + 6 * s, 28 * s);
        graphics.fillCircle(x + 60 * s, y + 5 * s, 22 * s);
        // Main white layer - many overlapping puffs for fluffy cotton look
        graphics.fillStyle(0xFFFFFF, 0.92);
        graphics.fillCircle(x - 25 * s, y - 2 * s, 28 * s);
        graphics.fillCircle(x - 5 * s, y - 8 * s, 32 * s);
        graphics.fillCircle(x + 25 * s, y - 12 * s, 30 * s);
        graphics.fillCircle(x + 55 * s, y - 5 * s, 26 * s);
        graphics.fillCircle(x + 10 * s, y + 3 * s, 24 * s);
        graphics.fillCircle(x + 40 * s, y + 2 * s, 22 * s);
        graphics.fillCircle(x - 12 * s, y + 6 * s, 20 * s);
        // Top billowy puffs for extra fluffiness
        graphics.fillStyle(0xFFFFFF, 0.97);
        graphics.fillCircle(x - 10 * s, y - 18 * s, 20 * s);
        graphics.fillCircle(x + 12 * s, y - 22 * s, 22 * s);
        graphics.fillCircle(x + 35 * s, y - 18 * s, 18 * s);
        graphics.fillCircle(x + 5 * s, y - 12 * s, 16 * s);
        graphics.fillCircle(x + 48 * s, y - 10 * s, 14 * s);
        // Bright highlights on top edges
        graphics.fillStyle(0xFFFFFF, 0.6);
        graphics.fillCircle(x - 5 * s, y - 25 * s, 12 * s);
        graphics.fillCircle(x + 18 * s, y - 28 * s, 10 * s);
        graphics.fillCircle(x + 40 * s, y - 22 * s, 11 * s);
        break;

      case 'stratus':
        // Wispy elongated cloud
        // Shadow layer
        graphics.fillStyle(0xCCCCCC, 0.4);
        graphics.fillEllipse(x, y + 3 * s, 70 * s, 15 * s);
        graphics.fillEllipse(x + 50 * s, y + 5 * s, 50 * s, 12 * s);
        // Main layer
        graphics.fillStyle(0xFFFFFF, 0.7);
        graphics.fillEllipse(x, y, 70 * s, 15 * s);
        graphics.fillEllipse(x + 50 * s, y + 2 * s, 50 * s, 12 * s);
        graphics.fillEllipse(x - 30 * s, y + 3 * s, 40 * s, 10 * s);
        // Soft highlight
        graphics.fillStyle(0xFFFFFF, 0.3);
        graphics.fillEllipse(x - 10 * s, y - 3 * s, 40 * s, 8 * s);
        break;

      case 'alto':
        // Small high-altitude cloud
        // Shadow
        graphics.fillStyle(0xDDDDDD, 0.4);
        graphics.fillCircle(x, y + 2 * s, 15 * s);
        graphics.fillCircle(x + 15 * s, y + 2 * s, 12 * s);
        // Main layer
        graphics.fillStyle(0xFFFFFF, 0.6);
        graphics.fillCircle(x, y, 15 * s);
        graphics.fillCircle(x + 15 * s, y, 12 * s);
        graphics.fillCircle(x + 8 * s, y - 5 * s, 10 * s);
        break;

      case 'storm':
        // Dark menacing storm cloud
        // Deep shadow layer
        graphics.fillStyle(0x333333, 0.6);
        graphics.fillCircle(x, y + 12 * s, 40 * s);
        graphics.fillCircle(x - 38 * s, y + 10 * s, 32 * s);
        graphics.fillCircle(x + 42 * s, y + 10 * s, 35 * s);

        // Main dark body - upper puffs
        graphics.fillStyle(0x555555, 0.9);
        graphics.fillCircle(x, y - 5 * s, 40 * s);
        graphics.fillCircle(x - 38 * s, y - 8 * s, 32 * s);
        graphics.fillCircle(x + 42 * s, y - 6 * s, 35 * s);
        graphics.fillCircle(x + 12 * s, y - 22 * s, 30 * s);
        graphics.fillCircle(x - 22 * s, y - 15 * s, 27 * s);

        // Bottom belly - overlapping dark circles instead of rectangle
        graphics.fillStyle(0x444444, 0.95);
        graphics.fillCircle(x - 30 * s, y + 18 * s, 25 * s);
        graphics.fillCircle(x, y + 20 * s, 28 * s);
        graphics.fillCircle(x + 32 * s, y + 18 * s, 26 * s);
        // Darker underbelly shading
        graphics.fillStyle(0x3A3A3A, 0.9);
        graphics.fillCircle(x - 15 * s, y + 25 * s, 20 * s);
        graphics.fillCircle(x + 18 * s, y + 24 * s, 22 * s);

        // Slight internal glow hint (pre-lightning charge)
        if (this.weatherState === 'stormy') {
          graphics.fillStyle(0xFFFFAA, 0.1 + Math.random() * 0.08);
          graphics.fillCircle(x + 5 * s, y + 8 * s, 20 * s);
        }
        break;
    }
  }

  private initializeRain(): void {
    // Set rain intensity based on weather
    if (this.weatherState === 'stormy') {
      // Stormy: random between medium and heavy
      this.rainIntensity = Math.random() < 0.5 ? 'medium' : 'heavy';
    } else if (this.weatherState === 'cloudy') {
      // Cloudy: random chance of light rain
      this.rainIntensity = Math.random() < 0.3 ? 'light' : 'none';
    } else {
      this.rainIntensity = 'none';
    }

    if (this.rainIntensity === 'none') {
      this.rainDrops = [];
      return;
    }

    // Rain parameters based on intensity
    const params = {
      light: { count: 150, speedMin: 7, speedRange: 5, lengthMin: 10, lengthRange: 12, alpha: 0.45 },
      medium: { count: 300, speedMin: 10, speedRange: 8, lengthMin: 15, lengthRange: 20, alpha: 0.6 },
      heavy: { count: 500, speedMin: 14, speedRange: 10, lengthMin: 20, lengthRange: 30, alpha: 0.75 }
    }[this.rainIntensity];

    // Create initial rain drops spread across the screen
    this.rainDrops = [];
    for (let i = 0; i < params.count; i++) {
      this.rainDrops.push({
        x: Math.random() * (GAME_WIDTH + 200) - 100,
        y: Math.random() * GAME_HEIGHT,
        speed: params.speedMin + Math.random() * params.speedRange,
        length: params.lengthMin + Math.random() * params.lengthRange
      });
    }

    console.log(`[Weather] Rain intensity: ${this.rainIntensity}`);
  }

  private updateRain(): void {
    if (this.rainIntensity === 'none' || this.rainDrops.length === 0) return;

    // Destroy old graphics and create fresh one each frame to prevent memory buildup
    if (this.rainGraphics) {
      this.rainGraphics.destroy();
    }
    this.rainGraphics = this.add.graphics();
    this.rainGraphics.setScrollFactor(0);
    this.rainGraphics.setDepth(-80);

    // Rain parameters based on intensity
    const params = {
      light: { alpha: 0.45, thickness: 1, speedMin: 7, speedRange: 5, lengthMin: 10, lengthRange: 12 },
      medium: { alpha: 0.6, thickness: 1, speedMin: 10, speedRange: 8, lengthMin: 15, lengthRange: 20 },
      heavy: { alpha: 0.75, thickness: 2, speedMin: 14, speedRange: 10, lengthMin: 20, lengthRange: 30 }
    }[this.rainIntensity];

    // Get water bounds (Atlantic Ocean) in screen space
    const cameraX = this.cameras.main.scrollX;
    const cameraY = this.cameras.main.scrollY;
    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 5000;
    const waterScreenStart = atlanticStart - cameraX;
    const waterScreenEnd = atlanticEnd - cameraX;
    // Water surface is at terrain height in the ocean area (around y=500 in world coords)
    const waterWorldY = this.terrain ? this.terrain.getHeightAt(atlanticStart + 500) : 500;
    const waterY = waterWorldY - cameraY;

    // Rain color - slightly blue-grey - use single path for all drops
    this.rainGraphics.lineStyle(params.thickness, 0x8899AA, params.alpha);
    this.rainGraphics.beginPath();

    for (const drop of this.rainDrops) {
      // Draw rain drop as angled line (slight wind effect)
      this.rainGraphics.moveTo(drop.x, drop.y);
      this.rainGraphics.lineTo(drop.x - 2, drop.y + drop.length);

      // Move drop down
      drop.y += drop.speed;

      // Check if drop hits water surface - spawn upward splash
      if (drop.y > waterY && drop.y < waterY + drop.speed + 10) {
        if (drop.x > waterScreenStart && drop.x < waterScreenEnd) {
          // Splash parameters vary by intensity
          const splashParams = {
            light: { maxSplashes: 25, particleCount: [2, 3], spread: 5, velocityMin: 1.5, velocityRange: 2, spawnChance: 0.3 },
            medium: { maxSplashes: 40, particleCount: [3, 4], spread: 7, velocityMin: 2, velocityRange: 3, spawnChance: 0.5 },
            heavy: { maxSplashes: 60, particleCount: [4, 6], spread: 10, velocityMin: 2.5, velocityRange: 4, spawnChance: 0.7 }
          }[this.rainIntensity] || { maxSplashes: 40, particleCount: [3, 4], spread: 7, velocityMin: 2, velocityRange: 3, spawnChance: 0.5 };

          // Spawn splash particles at this location (limit total for performance)
          if (this.rainSplashes.length < splashParams.maxSplashes && Math.random() < splashParams.spawnChance) {
            // Create particles that shoot upward
            const numParticles = splashParams.particleCount[0] + Math.floor(Math.random() * (splashParams.particleCount[1] - splashParams.particleCount[0] + 1));
            const particles: { dx: number; dy: number; vy: number }[] = [];
            for (let p = 0; p < numParticles; p++) {
              particles.push({
                dx: (Math.random() - 0.5) * splashParams.spread, // Spread horizontally
                dy: 0, // Start at water surface
                vy: -(splashParams.velocityMin + Math.random() * splashParams.velocityRange) // Upward velocity
              });
            }
            this.rainSplashes.push({
              x: drop.x + cameraX, // Store in world coords
              y: waterWorldY,
              particles,
              age: 0
            });
          }
        }
      }

      // Reset drop when it falls off screen
      if (drop.y > GAME_HEIGHT + 20) {
        drop.y = -drop.length;
        drop.x = Math.random() * (GAME_WIDTH + 200) - 100;
        drop.speed = params.speedMin + Math.random() * params.speedRange;
        drop.length = params.lengthMin + Math.random() * params.lengthRange;
      }
    }

    this.rainGraphics.strokePath();

    // Update and draw splashes
    this.updateRainSplashes();
  }

  private updateRainSplashes(): void {
    if (this.rainSplashes.length === 0 || !this.rainGraphics) return;

    const cameraX = this.cameras.main.scrollX;
    const cameraY = this.cameras.main.scrollY;

    // Collect all particles to draw, then batch them
    const particlesToDraw: { x: number; y: number; alpha: number }[] = [];

    // Update splashes - particles rise then fall
    for (let i = this.rainSplashes.length - 1; i >= 0; i--) {
      const splash = this.rainSplashes[i];
      splash.age++;

      // Remove old splashes
      if (splash.age > 20) {
        this.rainSplashes.splice(i, 1);
        continue;
      }

      // Calculate screen position
      const screenX = splash.x - cameraX;
      const screenY = splash.y - cameraY;

      if (screenX > -50 && screenX < GAME_WIDTH + 50 && screenY > 0 && screenY < GAME_HEIGHT) {
        const alpha = (1 - (splash.age / 20)) * 0.8;

        for (const particle of splash.particles) {
          // Update particle physics
          particle.dy += particle.vy;
          particle.vy += 0.3; // Gravity pulls back down

          // Only collect if above or near water surface
          if (particle.dy <= 2) {
            particlesToDraw.push({
              x: screenX + particle.dx,
              y: screenY + particle.dy,
              alpha
            });
          }
        }
      }
    }

    // Draw all particles as short vertical lines (batched)
    if (particlesToDraw.length > 0) {
      this.rainGraphics.lineStyle(2, 0xCCDDEE, 0.7);
      this.rainGraphics.beginPath();
      for (const p of particlesToDraw) {
        this.rainGraphics.moveTo(p.x, p.y);
        this.rainGraphics.lineTo(p.x, p.y - 3); // Short upward line
      }
      this.rainGraphics.strokePath();
    }
  }

  private getCloudScreenX(cloud: typeof this.cloudData[0]): number {
    // Clouds are drawn with scrollFactor 0.02
    // Screen position = cloud.x - cameraX * 0.02 + graphics.x (drift from tween)
    const cameraX = this.cameras.main.scrollX;
    const driftX = this.cloudGraphics ? this.cloudGraphics.x : 0;
    return cloud.x - cameraX * 0.02 + driftX;
  }

  private getVisibleStormClouds(): typeof this.cloudData {
    // Find storm clouds currently visible on screen (with some margin)
    const margin = 100;
    return this.cloudData.filter(c => {
      if (!c.isStormCloud) return false;
      const screenX = this.getCloudScreenX(c);
      return screenX > -margin && screenX < GAME_WIDTH + margin;
    });
  }

  private checkLightningStrikes(time: number): void {
    // Only check in stormy weather
    if (this.weatherState !== 'stormy') return;

    // Check every 500ms
    if (time - this.lastLightningCheck < 500) return;
    this.lastLightningCheck = time;

    // Handle pending lightning strike (warning flash has been shown)
    if (this.pendingLightningStrike) {
      const elapsed = time - this.pendingLightningStrike.warningStart;
      if (elapsed >= this.pendingLightningStrike.strikeDelay) {
        // 2 seconds passed - check if shuttle is STILL in danger zone
        const shuttle = this.pendingLightningStrike.shuttle;
        const cloud = this.pendingLightningStrike.cloud;

        if (shuttle.active) {
          const cameraX = this.cameras.main.scrollX;
          const cameraY = this.cameras.main.scrollY;
          const shuttleScreenX = shuttle.x - cameraX;
          const shuttleScreenY = shuttle.y - cameraY;
          const cloudScreenX = this.getCloudScreenX(cloud);
          const cloudScreenY = cloud.y - cameraY * 0.02;
          const cloudVisualCenterY = cloudScreenY + 5 * cloud.scale;
          const dx = Math.abs(shuttleScreenX - cloudScreenX);
          // Check if shuttle is grounded (close to terrain)
          const terrainY = this.terrain.getHeightAt(shuttle.x);
          const distanceFromGround = terrainY - shuttle.y;
          const isGrounded = distanceFromGround < 50; // Within 50px of ground = safe

          // Lightning strikes if NOT grounded
          if (!isGrounded) {
            this.triggerLightningStrike(cloud, shuttle);
          }
          // If shuttle is grounded, lightning misses (hits ground nearby)
          else {
            this.triggerAmbientLightning(cloud);
          }
        }
        this.pendingLightningStrike = null;
      }
      return; // Don't check for new strikes while one is pending
    }

    // Get storm clouds that are visible on screen
    const visibleStormClouds = this.getVisibleStormClouds();
    if (visibleStormClouds.length === 0) return;

    // Check for targeted strikes at shuttles
    const cameraX = this.cameras.main.scrollX;
    const cameraY = this.cameras.main.scrollY;
    for (const shuttle of this.shuttles) {
      if (!shuttle.active) continue;

      const shuttleScreenX = shuttle.x - cameraX;
      const shuttleScreenY = shuttle.y - cameraY;

      // Find clouds near this shuttle (in screen space)
      for (const cloud of visibleStormClouds) {
        // Cooldown per cloud (5-10 seconds between strikes)
        if (time - cloud.lastLightningTime < 5000 + Math.random() * 5000) continue;

        const cloudScreenX = this.getCloudScreenX(cloud);
        const cloudScreenY = cloud.y - cameraY * 0.02;
        const cloudVisualCenterY = cloudScreenY + 5 * cloud.scale;
        const dx = Math.abs(shuttleScreenX - cloudScreenX);
        const dy = shuttleScreenY - cloudVisualCenterY;
        const collisionRadius = cloud.scale * 35;
        const warningStartY = collisionRadius + 10; // Warning zone starts below collision radius

        // Shuttle must be in warning zone - within 100px horizontally, below collision radius
        if (dx < 100 && dy > warningStartY && dy < warningStartY + 120) {
          // Chance to strike shuttle if in range
          if (Math.random() < 0.3) {
            // Show warning first
            this.showLightningWarning(cloud, shuttle);
            this.pendingLightningStrike = { cloud, shuttle, warningStart: time, strikeDelay: 2000 + Math.random() * 1000 };
            cloud.lastLightningTime = time;
            return;
          }
        }
      }
    }

    // Random ambient lightning from a visible storm cloud
    for (const cloud of visibleStormClouds) {
      if (time - cloud.lastLightningTime < 5000 + Math.random() * 5000) continue;

      if (Math.random() < 0.02) {
        this.triggerAmbientLightning(cloud);
        cloud.lastLightningTime = time;
        return; // Only one ambient strike per check
      }
    }
  }

  private showLightningWarning(cloud: typeof this.cloudData[0], shuttle: Shuttle): void {
    console.log('[Lightning] WARNING FLASH! Get to safety!');
    // Warning sky flash - gives player 2 seconds to get to safety
    // Make the whole sky flash bright white/yellow
    const flash = this.add.graphics();
    flash.fillStyle(0xFFFFAA, 1);
    flash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    flash.setScrollFactor(0);
    flash.setDepth(600);
    flash.setAlpha(0.6);

    // Flash then fade over 400ms
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy()
    });

    // Also make the storm cloud glow brighter as warning - pulsing for 2 seconds
    const cloudScreenX = this.getCloudScreenX(cloud);
    const glowGraphics = this.add.graphics();
    glowGraphics.setScrollFactor(0);
    glowGraphics.setDepth(500);
    glowGraphics.fillStyle(0xFFFF00, 1);
    glowGraphics.fillCircle(cloudScreenX, cloud.y, cloud.scale * 60);
    glowGraphics.setAlpha(0.5);

    // Pulse the cloud glow for 2 seconds
    this.tweens.add({
      targets: glowGraphics,
      alpha: 0.15,
      duration: 400,
      yoyo: true,
      repeat: 2,
      onComplete: () => glowGraphics.destroy()
    });
  }

  private triggerLightningStrike(cloud: typeof this.cloudData[0], shuttle: Shuttle): void {
    console.log('[Lightning] STRIKE! Hitting shuttle after warning');
    // Get screen coordinates
    const cameraX = this.cameras.main.scrollX;
    const cameraY = this.cameras.main.scrollY;
    const cloudScreenX = this.getCloudScreenX(cloud);
    const cloudScreenY = cloud.y - cameraY * 0.02; // Cloud has scrollFactor 0.02
    const shuttleScreenX = shuttle.x - cameraX;
    const shuttleScreenY = shuttle.y - cameraY;

    // Generate bolt path in screen space (from cloud bottom to shuttle)
    const segments = this.generateLightningPath(cloudScreenX, cloudScreenY + 40 * cloud.scale, shuttleScreenX, shuttleScreenY);

    // Draw the lightning bolt
    this.drawLightningBoltScreen(segments);

    // Screen flash
    this.createLightningFlash();

    // Kill the shuttle with electrical death
    this.handleElectricalDeath(shuttle);
  }

  private triggerAmbientLightning(cloud: typeof this.cloudData[0]): void {
    // Random ground strike (visual only) - all in screen space
    const cameraY = this.cameras.main.scrollY;
    const cloudScreenX = this.getCloudScreenX(cloud);
    const cloudScreenY = cloud.y - cameraY * 0.02; // Cloud has scrollFactor 0.02

    // Strike random point below cloud (in screen space)
    const targetX = cloudScreenX + (Math.random() - 0.5) * 150;
    const targetY = cloudScreenY + 250 + Math.random() * 250;

    const segments = this.generateLightningPath(cloudScreenX, cloudScreenY + 40 * cloud.scale, targetX, targetY);
    this.drawLightningBoltScreen(segments);
    this.createLightningFlash();
  }

  private generateLightningPath(startX: number, startY: number, endX: number, endY: number): { x: number; y: number }[] {
    const segments: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const numSegments = 8 + Math.floor(Math.random() * 6);

    for (let i = 1; i < numSegments; i++) {
      const progress = i / numSegments;
      const baseX = startX + (endX - startX) * progress;
      const baseY = startY + (endY - startY) * progress;

      // Add jag/offset (more variation in middle, less at ends)
      const variationFactor = Math.sin(progress * Math.PI) * 50;
      const offsetX = (Math.random() - 0.5) * variationFactor;

      segments.push({ x: baseX + offsetX, y: baseY });
    }

    segments.push({ x: endX, y: endY });
    return segments;
  }

  private drawLightningBoltScreen(screenSegments: { x: number; y: number }[]): void {
    // Create a fresh graphics object for this bolt (screen-space, no scroll)
    const bolt = this.add.graphics();
    bolt.setScrollFactor(0);
    bolt.setDepth(500); // High depth to be visible above most things

    // Outer glow (blue-white)
    bolt.lineStyle(12, 0x8888FF, 0.5);
    bolt.beginPath();
    bolt.moveTo(screenSegments[0].x, screenSegments[0].y);
    for (let i = 1; i < screenSegments.length; i++) {
      bolt.lineTo(screenSegments[i].x, screenSegments[i].y);
    }
    bolt.strokePath();

    // Middle glow
    bolt.lineStyle(6, 0xCCCCFF, 0.8);
    bolt.beginPath();
    bolt.moveTo(screenSegments[0].x, screenSegments[0].y);
    for (let i = 1; i < screenSegments.length; i++) {
      bolt.lineTo(screenSegments[i].x, screenSegments[i].y);
    }
    bolt.strokePath();

    // Core (bright white)
    bolt.lineStyle(3, 0xFFFFFF, 1);
    bolt.beginPath();
    bolt.moveTo(screenSegments[0].x, screenSegments[0].y);
    for (let i = 1; i < screenSegments.length; i++) {
      bolt.lineTo(screenSegments[i].x, screenSegments[i].y);
    }
    bolt.strokePath();

    // Add branch (already in screen space)
    if (screenSegments.length > 4 && Math.random() < 0.7) {
      const branchPoint = Math.floor(screenSegments.length * 0.4);
      const branchEnd = {
        x: screenSegments[branchPoint].x + (Math.random() - 0.5) * 100,
        y: screenSegments[branchPoint].y + 50 + Math.random() * 80
      };
      const branchSegments = this.generateLightningPath(
        screenSegments[branchPoint].x,
        screenSegments[branchPoint].y,
        branchEnd.x,
        branchEnd.y
      ).slice(0, 5);

      bolt.lineStyle(4, 0xCCCCFF, 0.6);
      bolt.beginPath();
      bolt.moveTo(branchSegments[0].x, branchSegments[0].y);
      for (let i = 1; i < branchSegments.length; i++) {
        bolt.lineTo(branchSegments[i].x, branchSegments[i].y);
      }
      bolt.strokePath();
    }

    // Destroy bolt after visible time
    this.time.delayedCall(200, () => {
      bolt.destroy();
    });
  }

  private createLightningFlash(): void {
    const flash = this.add.graphics();
    flash.fillStyle(0xFFFFFF, 0.35);
    flash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    flash.setScrollFactor(0);
    flash.setDepth(1000);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 120,
      onComplete: () => flash.destroy()
    });
  }

  private handleElectricalDeath(shuttle: Shuttle): void {
    if (this.gameState !== 'playing') return;

    const playerNum = shuttle === this.shuttle2 ? 2 : 1;

    // Track achievement
    this.achievementSystem.onDeath('lightning');

    // Use electrical death animation
    shuttle.electrocute();

    // Screen shake
    this.cameras.main.shake(200, 0.012);

    // Spawn tombstone at shuttle position after death animation completes (650ms flash + 400ms skeleton fade)
    const deathX = shuttle.x;
    const deathY = shuttle.y;
    this.time.delayedCall(1050, () => {
      this.spawnTombstone(deathX, deathY, 'lightning');
    });

    // Handle game state
    if (this.playerCount === 2) {
      // In 2-player mode, handle as a regular death
      if (playerNum === 1) {
        this.p1DeathMessage = 'Struck by lightning!';
      } else {
        this.p2DeathMessage = 'Struck by lightning!';
      }

      // Check if game should end
      this.time.delayedCall(1000, () => {
        this.checkGameOverAfterCrash();
      });
    } else {
      // Single player - game over
      this.gameState = 'crashed';

      this.transitionToGameOver({
        victory: false,
        message: 'Struck by lightning!',
        score: this.destructionScore,
        debugModeUsed: shuttle.wasDebugModeUsed(),
        destroyedBuildings: this.destroyedBuildings,
      });
    }
  }

  private createLandingPads(): void {
    for (let i = 0; i < LANDING_PADS.length; i++) {
      const padData = LANDING_PADS[i] as { x: number; width: number; name: string; isWashington?: boolean; isOilPlatform?: boolean };
      const terrainY = this.terrain.getHeightAt(padData.x);
      const isFinal = i === LANDING_PADS.length - 1;
      const isWashington = padData.isWashington === true;
      const isOilPlatform = padData.isOilPlatform === true;

      const pad = new LandingPad(
        this,
        padData.x,
        terrainY,
        padData.width,
        padData.name,
        isFinal,
        isWashington,
        isOilPlatform
      );
      this.landingPads.push(pad);

      // Create oil tower for fuel depots and oil platform
      const isFuelDepot = !isOilPlatform && (padData.name.includes('Fuel') || padData.name.includes('Gas') || padData.name.includes('Depot') || padData.name.includes('Station'));
      if (isFuelDepot || isOilPlatform) {
        // Get the country name based on location
        let countryName = 'Atlantic Ocean';
        for (const country of COUNTRIES) {
          if (padData.x >= country.startX) {
            countryName = country.name;
          }
        }

        // Position tower to the right of landing pad
        const towerX = padData.x + padData.width / 2 + 35;
        const oilTower = new OilTower(this, towerX, terrainY, countryName);
        this.oilTowers.push(oilTower);
      }
    }
  }

  private spawnSharks(): void {
    const atlanticStart = 2000;
    const atlanticEnd = 5000;
    const sharkCount = 2 + Math.floor(Math.random() * 2); // 2-3 sharks

    // Divide Atlantic into zones to spread sharks out
    const zoneWidth = (atlanticEnd - atlanticStart) / sharkCount;

    for (let i = 0; i < sharkCount; i++) {
      const zoneStart = atlanticStart + i * zoneWidth;
      const zoneEnd = zoneStart + zoneWidth;

      // Spawn in center of zone with some randomness
      const x = zoneStart + zoneWidth * 0.5 + (Math.random() - 0.5) * zoneWidth * 0.3;

      // Patrol within zone (with some overlap allowed)
      const patrolMinX = zoneStart + 50;
      const patrolMaxX = zoneEnd - 50;

      const shark = new Shark(this, x, patrolMinX, patrolMaxX);
      this.sharks.push(shark);
    }
  }

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
    this.greenlandIce = new GreenlandIce(this, x);
  }

  private getFoodTargetsInOcean(): { x: number; y: number }[] {
    const targets: { x: number; y: number }[] = [];
    const waterSurface = GAME_HEIGHT * 0.75;

    // Add sunken food positions
    for (const food of this.sunkenFood) {
      targets.push({ x: food.x, y: food.y });
    }

    // Add currently falling bombs that are in Atlantic Ocean and underwater
    for (const bomb of this.bombs) {
      if (bomb.x >= 2000 && bomb.x <= 5000 && bomb.y > waterSurface) {
        targets.push({ x: bomb.x, y: bomb.y });
      }
    }

    return targets;
  }

  private checkSharkEatsSunkenFood(shark: Shark): void {
    if (!shark.canEatBomb()) return;

    const eatingBounds = shark.getEatingBounds();

    for (let i = this.sunkenFood.length - 1; i >= 0; i--) {
      const food = this.sunkenFood[i];
      if (
        food.x >= eatingBounds.x &&
        food.x <= eatingBounds.x + eatingBounds.width &&
        food.y >= eatingBounds.y &&
        food.y <= eatingBounds.y + eatingBounds.height
      ) {
        // Shark eats the food!
        shark.eatBomb();
        food.sprite.destroy();
        this.sunkenFood.splice(i, 1);
        break; // Only eat one at a time
      }
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
        // Skip Washington building indices 12 (Union Station) and 13 (Kennedy Center)
        if (assetPrefix === 'Washington' && typeStr === 'building' && (i === 12 || i === 13)) continue;
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

    // Medal house (FIFA Kennedy Center) - special building spawned near Washington DC
    const washingtonPad = LANDING_PADS.find(p => p.isWashington);
    if (washingtonPad) {
      const medalHouseX = washingtonPad.x - 120;
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
          const shuttleBody = bodyA.label === 'terrain' ? bodyB : bodyA;
          const isP2 = this.shuttle2 && shuttleBody.id === (this.shuttle2.body as MatterJS.BodyType).id;
          this.handleTerrainCollision(isP2 ? 2 : 1);
        }

        // Check shuttle collision with landing pad
        if (this.isShuttleCollision(bodyA, bodyB, 'landingPad')) {
          const padBody = bodyA.label === 'landingPad' ? bodyA : bodyB;
          const shuttleBody = bodyA.label === 'landingPad' ? bodyB : bodyA;
          const pad = (padBody as unknown as { landingPadRef: LandingPad }).landingPadRef;
          if (pad) {
            const isP2 = this.shuttle2 && shuttleBody.id === (this.shuttle2.body as MatterJS.BodyType).id;
            this.handleLandingPadCollision(pad, isP2 ? 2 : 1);
          }
        }

        // Check shuttle collision with boat deck
        if (this.isShuttleCollision(bodyA, bodyB, 'boatDeck')) {
          const shuttleBody = bodyA.label === 'boatDeck' ? bodyB : bodyA;
          const isP2 = this.shuttle2 && shuttleBody.id === (this.shuttle2.body as MatterJS.BodyType).id;
          this.handleBoatDeckCollision(isP2 ? 2 : 1);
        }

        // Check shuttle collision with projectile
        if (this.isShuttleCollision(bodyA, bodyB, 'projectile')) {
          const shuttleBody = bodyA.label === 'projectile' ? bodyB : bodyA;
          const isP2 = this.shuttle2 && shuttleBody.id === (this.shuttle2.body as MatterJS.BodyType).id;
          this.handleProjectileHit(isP2 ? 2 : 1);
        }

        // Check shuttle collision with collectible
        if (this.isShuttleCollision(bodyA, bodyB, 'collectible')) {
          const collectibleBody = bodyA.label === 'collectible' ? bodyA : bodyB;
          const shuttleBody = bodyA.label === 'collectible' ? bodyB : bodyA;
          const collectible = (collectibleBody as unknown as { collectibleRef: Collectible }).collectibleRef;
          if (collectible) {
            // Determine which shuttle picked it up
            const isP2 = this.shuttle2 && shuttleBody.id === (this.shuttle2.body as MatterJS.BodyType).id;
            this.handleCollectiblePickup(collectible, isP2 ? 2 : 1);
          }
        }

        // Check shuttle collision with tombstone (for Puskás Award)
        if (this.isShuttleCollision(bodyA, bodyB, 'tombstone')) {
          const tombstoneBody = bodyA.label === 'tombstone' ? bodyA : bodyB;
          this.handleTombstoneBounce(tombstoneBody.id);
        }

        // Check shuttle collision with brick wall
        if (this.isShuttleCollision(bodyA, bodyB, 'brick_wall')) {
          const shuttleBody = bodyA.label === 'brick_wall' ? bodyB : bodyA;
          const isP2 = this.shuttle2 && shuttleBody.id === (this.shuttle2.body as MatterJS.BodyType).id;
          this.handleBrickWallCollision(isP2 ? 2 : 1);
        }

        // Check tombstone collision with terrain (resets juggle count)
        if ((bodyA.label === 'tombstone' && bodyB.label === 'terrain') ||
            (bodyB.label === 'tombstone' && bodyA.label === 'terrain')) {
          const tombstoneBody = bodyA.label === 'tombstone' ? bodyA : bodyB;
          if (tombstoneBody.id === this.juggledTombstoneId) {
            // Tombstone hit ground - reset juggle
            this.tombstoneBounceCount = 0;
            this.juggledTombstoneId = null;
          }
        }
      }
    });
  }

  private handleTombstoneBounce(tombstoneId: number): void {
    const now = Date.now();

    // Debounce - ignore if same tombstone collision within 200ms (physics fires multiple events)
    if (tombstoneId === this.juggledTombstoneId && now - this.lastTombstoneBounceTime < 200) {
      return;
    }

    // If different tombstone, reset count
    if (this.juggledTombstoneId !== tombstoneId) {
      this.tombstoneBounceCount = 0;
      this.juggledTombstoneId = tombstoneId;
    }

    this.lastTombstoneBounceTime = now;
    this.tombstoneBounceCount++;

    console.log(`Tombstone bounce #${this.tombstoneBounceCount} (tombstone ${tombstoneId})`);

    // Award achievement for 3 bounces in a row without hitting ground
    if (this.tombstoneBounceCount >= 3) {
      this.achievementSystem.unlock('puskas_award');
    }
  }

  private isShuttleCollision(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType, label: string): boolean {
    const isShuttleA = bodyA.label === 'Body' || bodyA.label === 'Rectangle Body';
    const isShuttleB = bodyB.label === 'Body' || bodyB.label === 'Rectangle Body';

    return (isShuttleA && bodyB.label === label) || (isShuttleB && bodyA.label === label);
  }

  private handleTerrainCollision(playerNum: number = 1): void {
    if (this.gameState !== 'playing') return;
    if (this.invulnerable) return; // Ignore collisions during invulnerability

    // Get the correct shuttle
    const shuttle = playerNum === 2 && this.shuttle2 ? this.shuttle2 : this.shuttle;
    if (!shuttle || !shuttle.active) return;

    // Get the actual terrain height at shuttle position
    const terrainHeight = this.terrain.getHeightAt(shuttle.x);
    const shuttleBottom = shuttle.y + 18; // Shuttle's bottom edge

    // Only count as terrain collision if shuttle is actually near the terrain surface
    // Allow 30 pixel tolerance for physics body imprecision
    if (shuttleBottom < terrainHeight - 30) {
      console.log(`Ignoring terrain collision P${playerNum} - shuttle too high. shuttleBottom:`, shuttleBottom.toFixed(1), 'terrainHeight:', terrainHeight.toFixed(1));
      return;
    }

    // Check if we're over the Atlantic Ocean - always crash in water!
    // But NOT if we're near a landing pad or on the fishing boat
    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
    const isOverWater = shuttle.x >= atlanticStart && shuttle.x < atlanticEnd;

    // Check if near a landing pad (don't splash if on a pad)
    const nearLandingPad = this.landingPads.some(pad => {
      const horizontalDist = Math.abs(shuttle.x - pad.x);
      return horizontalDist < pad.width / 2 + 30; // Some tolerance
    });

    // Check if over the fishing boat (don't splash if landing on boat)
    let overFisherBoat = false;
    if (this.fisherBoat && !this.fisherBoat.isDestroyed) {
      const deckBounds = this.fisherBoat.getLandingBounds();
      overFisherBoat = shuttle.x >= deckBounds.x && shuttle.x <= deckBounds.x + deckBounds.width;
    }

    if (isOverWater && !nearLandingPad && !overFisherBoat) {
      console.log(`CRASH P${playerNum}: Splashed into the Atlantic Ocean at`, { x: shuttle.x, y: shuttle.y });

      // In 2-player mode, only destroy this shuttle
      if (this.playerCount === 2) {
        this.handleShuttleCrash(playerNum, 'Splashed into the Atlantic!', 'water');
        return;
      }

      this.gameState = 'crashed';
      shuttle.stopRocketSound();
      this.sound.play('water_splash');

      // Track death achievement
      this.achievementSystem.onDeath('water');

      // Spawn tombstone at water crash location (will appear after ship sinks)
      this.spawnTombstone(shuttle.x, shuttle.y, 'water');

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
    const velocity = shuttle.getVelocity();
    const TERRAIN_CRASH_VELOCITY = 8.0; // Only crash if hitting terrain really hard

    if (velocity.total < TERRAIN_CRASH_VELOCITY) {
      // Just a bounce, not a crash - the physics engine will handle the bounce
      console.log(`Terrain bounce P${playerNum} at velocity:`, velocity.total.toFixed(2));
      return;
    }

    // Check if out of fuel - special cause and message
    const fuelSys = playerNum === 2 && this.fuelSystem2 ? this.fuelSystem2 : this.fuelSystem;
    const outOfFuel = fuelSys.isEmpty();
    const cause: CauseOfDeath = outOfFuel ? 'fuel' : 'terrain';
    const message = outOfFuel ? 'Ran out of fuel!' : 'Crashed into terrain!';

    console.log(`CRASH P${playerNum}: Terrain collision at`, { x: shuttle.x, y: shuttle.y }, 'terrainHeight:', terrainHeight.toFixed(1), 'velocity:', velocity.total.toFixed(2), 'outOfFuel:', outOfFuel);

    // In 2-player mode, only destroy this shuttle
    if (this.playerCount === 2) {
      this.handleShuttleCrash(playerNum, message, cause);
      return;
    }

    this.gameState = 'crashed';
    shuttle.stopRocketSound();

    // Track death achievement
    this.achievementSystem.onDeath(cause);

    // Spawn tombstone at terrain crash location
    this.spawnTombstone(shuttle.x, shuttle.y, cause);

    shuttle.explode();
    this.sound.play('car_crash', { volume: 0.8 });

    this.transitionToGameOver({
      victory: false,
      message: outOfFuel ? 'You ran out of fuel!' : 'You crashed into the terrain!',
      score: this.destructionScore,
      debugModeUsed: shuttle.wasDebugModeUsed(),
      destroyedBuildings: this.destroyedBuildings,
    });
  }

  private handleBrickWallCollision(playerNum: number = 1): void {
    if (this.gameState !== 'playing') return;
    if (this.invulnerable) return;

    const shuttle = playerNum === 2 && this.shuttle2 ? this.shuttle2 : this.shuttle;
    if (!shuttle || !shuttle.active) return;

    const velocity = shuttle.getVelocity();
    const WALL_CRASH_VELOCITY = 6.0; // Crash threshold for wall impact

    if (velocity.total < WALL_CRASH_VELOCITY) {
      // Bounce off the wall - physics engine handles it
      console.log(`Wall bounce P${playerNum} at velocity:`, velocity.total.toFixed(2));
      return;
    }

    console.log(`CRASH P${playerNum}: Hit brick wall at velocity:`, velocity.total.toFixed(2));

    // In 2-player mode, only destroy this shuttle
    if (this.playerCount === 2) {
      this.handleShuttleCrash(playerNum, 'Crashed into the wall!', 'terrain');
      return;
    }

    this.gameState = 'crashed';
    shuttle.stopRocketSound();

    this.achievementSystem.onDeath('terrain');
    this.spawnTombstone(shuttle.x, shuttle.y, 'terrain');

    shuttle.explode();
    this.sound.play('car_crash', { volume: 0.8 });

    this.transitionToGameOver({
      victory: false,
      message: 'You crashed into the wall!',
      score: this.destructionScore,
      debugModeUsed: shuttle.wasDebugModeUsed(),
      destroyedBuildings: this.destroyedBuildings,
    });
  }

  private handleWaterSplash(shuttle?: Shuttle, message?: string, playerNum?: number): void {
    const targetShuttle = shuttle || this.shuttle;
    const is2PlayerMode = this.playerCount === 2;
    const splashX = targetShuttle.x;
    const splashY = targetShuttle.y;
    const waterLevel = this.terrain.getHeightAt(splashX);

    // Capture velocity before stopping (for splash direction)
    const velocity = targetShuttle.getVelocity();
    const impactAngle = Math.atan2(-velocity.y, -velocity.x); // Opposite of travel direction
    const impactSpeed = velocity.total;

    // Stop shuttle physics and thrusters, make it sink
    targetShuttle.setVelocity(0, 0);
    targetShuttle.setAngularVelocity(0);
    targetShuttle.setStatic(true);
    targetShuttle.stopThrusters();

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
    const sinkTween = this.tweens.add({
      targets: targetShuttle,
      y: waterLevel + 180, // Sink deep below water
      alpha: 0.15,
      duration: 3500,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // In 2-player mode, check game over after sinking
        if (is2PlayerMode) {
          console.log('Water sink complete, checking game over. Shuttles remaining:', this.shuttles.length);
          // Hide shuttle after sinking animation completes
          if (targetShuttle) {
            targetShuttle.setVisible(false);
          }
          this.checkGameOverAfterCrash();
        }
      },
    });

    // If the sinking shuttle has the peace medal, make it sink too
    if (this.hasPeaceMedal && this.peaceMedalGraphics && this.medalCarrier === targetShuttle) {
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
        if (!is2PlayerMode && this.gameState !== 'crashed') return;
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

    // In 2-player mode, don't do fade/game over - that's handled by finalizeShuttleCrash
    if (is2PlayerMode) return;

    // Go to game over after sinking animation (3s sink + 1s fade) - single player only
    // Create fade overlay
    const fadeOverlay = this.add.rectangle(
      this.cameras.main.scrollX + this.cameras.main.width / 2,
      this.cameras.main.scrollY + this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0
    );
    fadeOverlay.setDepth(1000);
    fadeOverlay.setScrollFactor(0);

    this.time.delayedCall(3000, () => {
      if (this.gameState !== 'crashed') return;

      this.tweens.add({
        targets: fadeOverlay,
        alpha: 1,
        duration: 1000,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.scene.stop('UIScene');
          this.scene.start('GameOverScene', {
            victory: false,
            message: 'You splashed into the Atlantic Ocean!',
            score: this.destructionScore,
            debugModeUsed: this.shuttle.wasDebugModeUsed(),
            noShake: true, // Water death is peaceful, no shake
            destroyedBuildings: this.destroyedBuildings,
          });
        },
      });
    });
  }

  private handleLandingPadCollision(pad: LandingPad, playerNum: number = 1): void {
    if (this.gameState !== 'playing') return;
    if (this.invulnerable) return; // Ignore collisions during invulnerability

    // Debounce - prevent re-triggering trade immediately after closing
    const now = Date.now();
    if (now - this.lastLandingTime < 1000) return;

    // Don't trigger trade again on the same pad until shuttle leaves
    if (this.lastTradedPad === pad) return;

    // Get the correct shuttle
    const shuttle = playerNum === 2 && this.shuttle2 ? this.shuttle2 : this.shuttle;
    if (!shuttle || !shuttle.active) return;

    // Shuttle must be very close to the pad surface to count as a landing
    // The shuttle's bottom is about 18 pixels below its center
    const shuttleBottom = shuttle.y + 18;
    const distanceFromPad = pad.y - shuttleBottom;

    // Check horizontal alignment - shuttle must be centered over the pad
    const halfPadWidth = pad.width / 2;
    const horizontalDistance = Math.abs(shuttle.x - pad.x);
    if (horizontalDistance > halfPadWidth) {
      console.log(`Ignoring pad collision P${playerNum} - shuttle not horizontally aligned. shuttle.x:`, shuttle.x.toFixed(1), 'pad.x:', pad.x, 'distance:', horizontalDistance.toFixed(1));
      return;
    }

    // Only count as landing if shuttle bottom is within 10 pixels of the pad surface
    // distanceFromPad > 0 means shuttle is above pad, < 0 means below
    // Tighter check: must be very close to pad surface
    if (distanceFromPad < -5 || distanceFromPad > 10) {
      console.log(`Ignoring pad collision P${playerNum} - shuttle not on pad surface. shuttleBottom:`, shuttleBottom.toFixed(1), 'pad.y:', pad.y.toFixed(1), 'distance:', distanceFromPad.toFixed(1));
      return;
    }

    // Ignore collision with the start pad until we've left it
    const padIndex = this.landingPads.indexOf(pad);
    if (padIndex === this.startPadId) {
      // Check if we've moved away from start pad before (velocity check)
      const velocity = shuttle.getVelocity();
      if (velocity.total < 0.5) {
        // Still on start pad, haven't really taken off yet
        return;
      }
      // We've returned to start pad after flying, allow landing
      this.startPadId = -1; // Clear so future landings work
    }

    const velocity = shuttle.getVelocity();
    console.log(`Valid pad collision P${playerNum} detected. shuttleBottom:`, shuttleBottom.toFixed(1), 'pad.y:', pad.y.toFixed(1), 'distance:', distanceFromPad.toFixed(1), 'velocity:', velocity.total.toFixed(2));

    const landingResult = shuttle.checkLandingSafety();

    if (!landingResult.safe) {
      console.log(`CRASH P${playerNum}: Bad landing on pad`, pad.name, 'at', { x: shuttle.x, y: shuttle.y }, 'pad.y:', pad.y, 'reason:', landingResult.reason);

      // In 2-player mode, only destroy this shuttle
      if (this.playerCount === 2) {
        this.handleShuttleCrash(playerNum, `Crash landing! ${landingResult.reason}`, 'landing');
        return;
      }

      this.gameState = 'crashed';
      shuttle.stopRocketSound();

      // Spawn tombstone at crash landing location
      this.spawnTombstone(shuttle.x, shuttle.y, 'landing');

      shuttle.explode();

      this.transitionToGameOver({
        victory: false,
        message: `Crash landing! ${landingResult.reason}`,
        score: this.destructionScore,
        debugModeUsed: shuttle.wasDebugModeUsed(),
        destroyedBuildings: this.destroyedBuildings,
      });
      return;
    }

    // Successful landing
    this.gameState = 'landed';
    this.lastLandingTime = Date.now();
    this.lastTradedPad = pad;

    // Track landing achievement
    this.achievementSystem.onLanding(landingResult.quality);

    // Play landing sound based on quality (louder volumes for better audibility)
    if (landingResult.quality === 'perfect') {
      this.sound.play('landing_perfect', { volume: 1.0 });
    } else if (landingResult.quality === 'good') {
      this.sound.play('landing_good', { volume: 1.0 });
    } else {
      this.sound.play('landing_rough', { volume: 1.0 });
    }

    // Stop shuttle and auto-align upright
    shuttle.setVelocity(0, 0);
    shuttle.setAngularVelocity(0);
    shuttle.setRotation(0);

    if (pad.isFinalDestination) {
      // Victory!
      const elapsedTime = this.getElapsedTime();
      const inventory = this.inventorySystem.getAllItems();

      // Add peace medal bonus to score (5000 points!)
      if (this.hasPeaceMedal) {
        this.destructionScore += 5000;
        this.events.emit('destructionScore', this.destructionScore);
      }

      // Add Greenland ice bonus if carrying (2500 points!)
      if (this.hasGreenlandIce) {
        this.destructionScore += 2500;
        this.events.emit('destructionScore', this.destructionScore);
        this.achievementSystem.onGreenlandDeliveredToRussia();

        // Show bonus message
        const iceBonus = this.add.text(shuttle.x, shuttle.y - 150, '+2500 VODKA ON THE ROCKS!', {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '24px',
          color: '#87CEEB',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3,
        });
        iceBonus.setOrigin(0.5, 0.5);
        iceBonus.setDepth(100);

        this.tweens.add({
          targets: iceBonus,
          y: iceBonus.y - 50,
          alpha: 0,
          duration: 2500,
          onComplete: () => iceBonus.destroy(),
        });

        // Clean up ice
        this.hasGreenlandIce = false;
        this.iceCarrier = null;
        this.greenlandIceGraphics?.destroy();
        this.greenlandIceGraphics = null;
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

      // Track victory achievements
      this.achievementSystem.onVictory(this.hasPeaceMedal, this.destroyedBuildings.length);

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
    } else if (pad.isWashington && this.hasGreenlandIce) {
      // Deliver Greenland ice to Washington!
      this.destructionScore += 2500;
      this.events.emit('destructionScore', this.destructionScore);

      // Trigger achievement
      this.achievementSystem.onGreenlandDeliveredToWashington();

      // Show bonus message
      const bonusText = this.add.text(shuttle.x, shuttle.y - 120, '+2500 GREENLAND DEAL!', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '24px',
        color: '#87CEEB',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      });
      bonusText.setOrigin(0.5, 0.5);
      bonusText.setDepth(100);

      this.tweens.add({
        targets: bonusText,
        y: bonusText.y - 50,
        alpha: 0,
        duration: 2500,
        onComplete: () => bonusText.destroy(),
      });

      // Remove ice and reset shuttle mass
      this.hasGreenlandIce = false;
      this.iceCarrier = null;
      this.greenlandIceGraphics?.destroy();
      this.greenlandIceGraphics = null;

      // Also pick up the Peace Medal if not already carried
      if (!this.hasPeaceMedal) {
        this.hasPeaceMedal = true;
        pad.hidePeaceMedal();
        this.createPeaceMedalGraphics(shuttle);
        shuttle.setMass(8); // Medal weight
        this.medalAngle = 0;
        this.medalAngularVelocity = 0;

        // Show medal pickup message (slightly delayed so it appears after ice message)
        this.time.delayedCall(500, () => {
          const medalText = this.add.text(shuttle.x, shuttle.y - 80, 'PEACE MEDAL ACQUIRED!', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '20px',
            color: '#FFD700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
          });
          medalText.setOrigin(0.5, 0.5);
          medalText.setDepth(100);

          this.tweens.add({
            targets: medalText,
            y: medalText.y - 50,
            alpha: 0,
            duration: 2000,
            onComplete: () => medalText.destroy(),
          });
        });
      } else {
        shuttle.setMass(5); // Reset to normal mass (no medal)
      }

      // In debug mode, show trading dialogue. Otherwise auto-trade
      if (shuttle.wasDebugModeUsed()) {
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
        const invSys = playerNum === 2 && this.inventorySystem2 ? this.inventorySystem2 : this.inventorySystem;
        const fuelSys = playerNum === 2 && this.fuelSystem2 ? this.fuelSystem2 : this.fuelSystem;
        const quality = landingResult.quality as 'perfect' | 'good' | 'rough';
        this.performAutoTrade(shuttle, invSys, fuelSys, quality, playerNum);
        this.gameState = 'playing';
      }
    } else if (pad.isWashington && !this.hasPeaceMedal) {
      // Pick up the Peace Medal at Washington!
      this.hasPeaceMedal = true;

      // Hide the medal model on the landing pad
      pad.hidePeaceMedal();

      // Create the medal graphics that will hang under the shuttle
      this.createPeaceMedalGraphics(shuttle);

      // Make shuttle heavier
      shuttle.setMass(8); // Heavier with medal

      // Reset medal physics
      this.medalAngle = 0;
      this.medalAngularVelocity = 0;

      // Show pickup message
      const pickupText = this.add.text(shuttle.x, shuttle.y - 80, 'PEACE MEDAL ACQUIRED!', {
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

      // In debug mode, show trading dialogue. Otherwise auto-trade (like 2-player mode)
      if (shuttle.wasDebugModeUsed()) {
        // Open trading scene at Washington too (debug mode)
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
        // Auto-trade without pausing (normal single-player and 2-player)
        const invSys = playerNum === 2 && this.inventorySystem2 ? this.inventorySystem2 : this.inventorySystem;
        const fuelSys = playerNum === 2 && this.fuelSystem2 ? this.fuelSystem2 : this.fuelSystem;
        const quality = landingResult.quality as 'perfect' | 'good' | 'rough';
        this.performAutoTrade(shuttle, invSys, fuelSys, quality, playerNum);
        this.gameState = 'playing';
      }
    } else {
      // In debug mode, show trading dialogue. Otherwise auto-trade (like 2-player mode)
      if (shuttle.wasDebugModeUsed()) {
        // Open trading scene (debug mode)
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
        // Auto-trade without pausing (normal single-player and 2-player)
        const invSys = playerNum === 2 && this.inventorySystem2 ? this.inventorySystem2 : this.inventorySystem;
        const fuelSys = playerNum === 2 && this.fuelSystem2 ? this.fuelSystem2 : this.fuelSystem;
        const quality = landingResult.quality as 'perfect' | 'good' | 'rough';
        this.performAutoTrade(shuttle, invSys, fuelSys, quality, playerNum);
        this.gameState = 'playing';
      }
    }
  }

  private checkBoatProximity(): void {
    if (!this.fisherBoat || this.fisherBoat.isDestroyed) return;

    // Check if any shuttle is close to the boat (within 150px horizontally and 100px vertically)
    let shuttleNearby = false;
    for (const shuttle of this.shuttles) {
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

  private handleBoatDeckCollision(playerNum: number = 1): void {
    if (this.gameState !== 'playing') return;
    if (!this.fisherBoat || this.fisherBoat.isDestroyed) return;

    // Debounce
    const now = Date.now();
    if (now - this.lastLandingTime < 1000) return;
    if (this.shuttleOnBoat) return;

    const shuttle = playerNum === 2 && this.shuttle2 ? this.shuttle2 : this.shuttle;
    if (!shuttle || !shuttle.active) return;

    const landingResult = shuttle.checkLandingSafety();

    if (!landingResult.safe) {
      console.log('CRASH: Bad landing on boat deck');

      if (this.playerCount === 2) {
        this.handleShuttleCrash(playerNum, `Crash landing on boat! ${landingResult.reason}`, 'landing');
        return;
      }

      this.gameState = 'crashed';
      shuttle.stopRocketSound();
      this.spawnTombstone(shuttle.x, shuttle.y, 'landing');
      shuttle.explode();

      this.transitionToGameOver({
        victory: false,
        message: `Crash landing on boat! ${landingResult.reason}`,
        score: this.destructionScore,
        debugModeUsed: shuttle.wasDebugModeUsed(),
        destroyedBuildings: this.destroyedBuildings,
      });
      return;
    }

    // Successful landing on boat!
    console.log('Successful landing on fishing boat!');
    this.shuttleOnBoat = true;
    this.lastLandingTime = now;

    // Unlock achievement
    this.achievementSystem.onBoatLanding();

    // Check for "fish" package pickup (15% chance boat has it)
    if (this.fisherBoat.hasFishPackage && !this.fisherBoat.fishPackageCollected) {
      this.fisherBoat.fishPackageCollected = true;

      const invSys = playerNum === 2 && this.inventorySystem2 ? this.inventorySystem2 : this.inventorySystem;
      invSys.add('FISH_PACKAGE');

      const fishText = this.add.text(shuttle.x, shuttle.y - 90, '"Fish" acquired!', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '16px',
        color: '#FFFFFF',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      });
      fishText.setOrigin(0.5, 0.5);
      fishText.setDepth(101);

      this.tweens.add({
        targets: fishText,
        y: fishText.y - 30,
        alpha: 0,
        duration: 2500,
        onComplete: () => fishText.destroy(),
      });

      this.playBoingSound();
    }

    // Play landing sound
    if (landingResult.quality === 'perfect') {
      this.sound.play('landing_perfect', { volume: 1.0 });
    } else if (landingResult.quality === 'good') {
      this.sound.play('landing_good', { volume: 1.0 });
    } else {
      this.sound.play('landing_rough', { volume: 1.0 });
    }

    // Stop shuttle and auto-align upright
    shuttle.setVelocity(0, 0);
    shuttle.setAngularVelocity(0);
    shuttle.setRotation(0);

    // Show boat landing message
    const landingText = this.add.text(shuttle.x, shuttle.y - 60, 'BOAT LANDING!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    landingText.setOrigin(0.5, 0.5);
    landingText.setDepth(100);

    this.tweens.add({
      targets: landingText,
      y: landingText.y - 40,
      alpha: 0,
      duration: 2000,
      onComplete: () => landingText.destroy(),
    });

    // Reset flag when shuttle leaves (detected by velocity)
    const checkLeave = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (!shuttle.active || this.fisherBoat?.isDestroyed) {
          this.shuttleOnBoat = false;
          checkLeave.destroy();
          return;
        }
        const velocity = shuttle.getVelocity();
        if (velocity.total > 1) {
          this.shuttleOnBoat = false;
          checkLeave.destroy();
        }
      },
    });
  }

  private createPeaceMedalGraphics(shuttle: Shuttle): void {
    // Create graphics object for the peace medal that hangs under the shuttle
    this.peaceMedalGraphics = this.add.graphics();
    this.peaceMedalGraphics.setDepth(50); // Above terrain, below UI
    this.medalCarrier = shuttle; // Track which shuttle carries the medal
  }

  private updateMedalPhysics(): void {
    if (!this.hasPeaceMedal || !this.medalCarrier) return;

    const carrier = this.medalCarrier;
    const velocity = carrier.getVelocity();
    const shuttleRotation = carrier.rotation;

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
    const shuttleAngularVel = (carrier.body as MatterJS.BodyType).angularVelocity;
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
    if (!this.peaceMedalGraphics || !this.hasPeaceMedal || !this.medalCarrier) return;

    // Update physics first
    this.updateMedalPhysics();

    // Destroy and recreate graphics each frame to prevent Phaser internal state accumulation
    if (this.peaceMedalGraphics) {
      this.peaceMedalGraphics.destroy();
    }
    this.peaceMedalGraphics = this.add.graphics();
    this.peaceMedalGraphics.setDepth(100);

    const carrier = this.medalCarrier;
    const shuttleX = carrier.x;
    const shuttleY = carrier.y;
    const shuttleRotation = carrier.rotation;

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

  private checkGreenlandIcePickup(): void {
    // Don't pick up if already have ice OR if carrying Peace Medal
    if (!this.greenlandIce) {
      return;
    }
    if (this.hasGreenlandIce) {
      return;
    }
    if (this.hasPeaceMedal) {
      return;
    }
    if (this.greenlandIce.isDestroyed) {
      return;
    }

    // Use main shuttle directly - shuttles array may have inactive entries
    const shuttle = this.shuttle;
    if (!shuttle || !shuttle.active) return;

    // Check distance to the iceberg center (not just top)
    // Ice bobs around y = GAME_HEIGHT * 0.75 = 540
    // Sign is ~70px above water, ice peak is ~42px above water
    const dist = Phaser.Math.Distance.Between(
      shuttle.x, shuttle.y,
      this.greenlandIce.x, this.greenlandIce.y - 40  // Check against ice peak area
    );

    // Pickup range: 140px - generous range to make pickup easier
    if (dist < 140) {
      this.pickupGreenlandIce(shuttle);
    }
  }

  private pickupGreenlandIce(shuttle: Shuttle): void {
    this.hasGreenlandIce = true;
    this.iceCarrier = shuttle;
    this.iceAngle = 0;
    this.iceAngularVelocity = 0;
    this.lastIceVelX = 0;
    this.lastIceVelY = 0;

    // Make shuttle heavier (more than medal: 8 → 10)
    shuttle.setMass(10);

    // Hide the floating ice
    this.greenlandIce?.attach();

    // Create hanging ice graphics
    this.greenlandIceGraphics = this.add.graphics();
    this.greenlandIceGraphics.setDepth(50);

    // Show pickup message
    const pickupText = this.add.text(shuttle.x, shuttle.y - 80, 'GREENLAND ACQUIRED!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '20px',
      color: '#87CEEB',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    pickupText.setOrigin(0.5, 0.5);
    pickupText.setDepth(100);

    this.tweens.add({
      targets: pickupText,
      y: pickupText.y - 50,
      alpha: 0,
      duration: 2000,
      onComplete: () => pickupText.destroy(),
    });
  }

  private updateGreenlandIcePhysics(): void {
    if (!this.hasGreenlandIce || !this.iceCarrier) return;

    const carrier = this.iceCarrier;
    const velocity = carrier.getVelocity();
    const shuttleRotation = carrier.rotation;

    // Calculate shuttle acceleration (change in velocity per frame)
    const accelX = velocity.x - this.lastIceVelX;
    const accelY = velocity.y - this.lastIceVelY;

    this.lastIceVelX = velocity.x;
    this.lastIceVelY = velocity.y;

    // Pendulum physics constants (heavier than medal)
    const wireLength = 55; // Longer than medal's 45
    const gravity = 0.5;
    const damping = 0.95; // More damping than medal's 0.97 (heavier = swings less)

    // EFFECTIVE GRAVITY: real gravity minus shuttle acceleration
    const effectiveGravityX = -accelX;
    const effectiveGravityY = gravity - accelY;

    // Calculate effective gravity magnitude and direction
    const effGravMagnitude = Math.sqrt(effectiveGravityX * effectiveGravityX + effectiveGravityY * effectiveGravityY);
    const effGravAngle = Math.atan2(effectiveGravityX, effectiveGravityY);

    // Ice's world angle = shuttle rotation + local ice angle
    const iceWorldAngle = shuttleRotation + this.iceAngle;

    // Angle between ice and effective "down" direction
    const angleFromEffectiveDown = iceWorldAngle - effGravAngle;

    // Restoring torque
    const restoreFactor = effGravMagnitude / wireLength;
    const gravityTorque = -restoreFactor * Math.sin(angleFromEffectiveDown);

    // Shuttle rotation imparts momentum to ice through the wire
    const shuttleAngularVel = (carrier.body as MatterJS.BodyType).angularVelocity;
    const rotationTorque = -shuttleAngularVel * 0.6; // Less responsive than medal (heavier)

    // Update angular velocity
    this.iceAngularVelocity += gravityTorque + rotationTorque;
    this.iceAngularVelocity *= damping;
    this.iceAngle += this.iceAngularVelocity;

    // Soft clamp - bounce back at extreme angles (smaller max than medal due to weight)
    const maxAngle = Math.PI * 0.5;
    if (Math.abs(this.iceAngle) > maxAngle) {
      this.iceAngle = Math.sign(this.iceAngle) * maxAngle;
      this.iceAngularVelocity *= -0.2;
    }
  }

  private updateGreenlandIceGraphics(): void {
    if (!this.greenlandIceGraphics || !this.hasGreenlandIce || !this.iceCarrier) return;

    // Update physics first
    this.updateGreenlandIcePhysics();

    // Destroy and recreate graphics each frame to prevent Phaser internal state accumulation
    if (this.greenlandIceGraphics) {
      this.greenlandIceGraphics.destroy();
    }
    this.greenlandIceGraphics = this.add.graphics();
    this.greenlandIceGraphics.setDepth(100);

    const carrier = this.iceCarrier;
    const shuttleX = carrier.x;
    const shuttleY = carrier.y;
    const shuttleRotation = carrier.rotation;

    // Attachment point at bottom of shuttle
    const attachOffsetY = 18;
    const attachX = shuttleX + Math.sin(shuttleRotation) * attachOffsetY;
    const attachY = shuttleY + Math.cos(shuttleRotation) * attachOffsetY;

    // Wire length for ice (longer than medal)
    const wireLength = 55;

    // Ice position: hanging from attachment point at the pendulum angle
    const iceX = attachX + Math.sin(this.iceAngle) * wireLength;
    const iceY = attachY + Math.cos(this.iceAngle) * wireLength;

    // Draw wires (two wires from shuttle bottom to ice top)
    this.greenlandIceGraphics.lineStyle(2, 0x555555, 1);

    // Wire attachment points on shuttle
    const wireSpread = 8;
    const leftAttachX = attachX - wireSpread * Math.cos(shuttleRotation);
    const leftAttachY = attachY + wireSpread * Math.sin(shuttleRotation);
    const rightAttachX = attachX + wireSpread * Math.cos(shuttleRotation);
    const rightAttachY = attachY - wireSpread * Math.sin(shuttleRotation);

    // Wire endpoints on ice (scaled 1.5x)
    const s = 1.5;
    const iceTopY = iceY - 45;  // 30 * 1.5

    // Left wire
    this.greenlandIceGraphics.lineBetween(leftAttachX, leftAttachY, iceX - 15, iceTopY);
    // Right wire
    this.greenlandIceGraphics.lineBetween(rightAttachX, rightAttachY, iceX + 15, iceTopY);

    // Draw ice block (rotates slightly with swing)
    const iceTilt = this.iceAngle * 0.4;

    // Ice colors
    const iceLight = 0xE0FFFF;
    const iceMid = 0xAFEEEE;
    const iceDark = 0x87CEEB;

    // Main ice block shape
    this.greenlandIceGraphics.fillStyle(iceMid, 1);
    this.greenlandIceGraphics.beginPath();

    // Create rotated ice block polygon (scaled 1.5x to match floating ice)
    const points = [
      { x: -25 * s, y: -20 * s },  // Top left
      { x: -20 * s, y: -30 * s },  // Upper left peak
      { x: 0, y: -35 * s },        // Top center peak
      { x: 15 * s, y: -25 * s },   // Upper right
      { x: 22 * s, y: -15 * s },   // Right upper
      { x: 20 * s, y: 10 * s },    // Right lower
      { x: -5 * s, y: 15 * s },    // Bottom center
      { x: -22 * s, y: 8 * s },    // Left lower
    ];

    // Transform points for rotation and position
    const cos = Math.cos(iceTilt);
    const sin = Math.sin(iceTilt);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const rx = p.x * cos - p.y * sin + iceX;
      const ry = p.x * sin + p.y * cos + iceY;
      if (i === 0) {
        this.greenlandIceGraphics.moveTo(rx, ry);
      } else {
        this.greenlandIceGraphics.lineTo(rx, ry);
      }
    }
    this.greenlandIceGraphics.closePath();
    this.greenlandIceGraphics.fillPath();

    // Ice highlights
    this.greenlandIceGraphics.fillStyle(iceLight, 0.8);
    const highlightPoints = [
      { x: -18 * s, y: -22 * s },
      { x: -5 * s, y: -30 * s },
      { x: 5 * s, y: -25 * s },
      { x: -5 * s, y: -18 * s },
    ];
    this.greenlandIceGraphics.beginPath();
    for (let i = 0; i < highlightPoints.length; i++) {
      const p = highlightPoints[i];
      const rx = p.x * cos - p.y * sin + iceX;
      const ry = p.x * sin + p.y * cos + iceY;
      if (i === 0) {
        this.greenlandIceGraphics.moveTo(rx, ry);
      } else {
        this.greenlandIceGraphics.lineTo(rx, ry);
      }
    }
    this.greenlandIceGraphics.closePath();
    this.greenlandIceGraphics.fillPath();

    // White shine spots
    this.greenlandIceGraphics.fillStyle(0xFFFFFF, 0.7);
    const shineX1 = -10 * s * cos - (-20 * s) * sin + iceX;
    const shineY1 = -10 * s * sin + (-20 * s) * cos + iceY;
    this.greenlandIceGraphics.fillCircle(shineX1, shineY1, 4);
  }

  private handleProjectileHit(playerNum: number = 1): void {
    // Legacy method for backwards compatibility
    const shuttle = playerNum === 2 && this.shuttle2 ? this.shuttle2 : this.shuttle;
    this.handleProjectileHitOnShuttle(undefined, shuttle);
  }

  // Generic handler for shuttle crashes in 2-player mode
  private handleShuttleCrash(playerNum: number, message: string, cause: CauseOfDeath): void {
    const shuttle = playerNum === 2 ? this.shuttle2 : this.shuttle;
    if (!shuttle || !shuttle.active) return;

    // Mark shuttle inactive immediately to prevent duplicate collision handling
    shuttle.setActive(false);

    console.log(`P${playerNum} crashed: ${message}`);

    // Store death message for this player
    if (playerNum === 1) {
      this.p1DeathMessage = message;
    } else {
      this.p2DeathMessage = message;
    }

    // Track death achievement
    this.achievementSystem.onDeath(cause);

    // Spawn tombstone at crash location
    this.spawnTombstone(shuttle.x, shuttle.y, cause);

    // Stop thrust sound
    shuttle.stopRocketSound();

    // Remove from active shuttles immediately (before animation)
    const idx = this.shuttles.indexOf(shuttle);
    if (idx >= 0) {
      this.shuttles.splice(idx, 1);
    }

    // Handle water crash differently - sink instead of explode
    if (cause === 'water') {
      this.sound.play('water_splash');
      this.handleWaterSplash(shuttle, message, playerNum);
    } else {
      // Normal explosion for terrain/other crashes
      shuttle.explode();
      this.sound.play('car_crash', { volume: 0.8 });
      this.checkGameOverAfterCrash();
    }
  }

  // Check if game should end after a crash (2-player mode)
  private checkGameOverAfterCrash(): void {
    const remainingActive = this.shuttles.filter(s => s.active);
    if (remainingActive.length === 0) {
      // All shuttles dead - game over
      this.gameState = 'crashed';

      // Build combined message for 2-player mode
      let message = '';
      if (this.playerCount === 2) {
        message = `P1: ${this.p1DeathMessage}\nP2: ${this.p2DeathMessage}`;
      } else {
        message = this.p1DeathMessage || 'Mission failed!';
      }

      this.transitionToGameOver({
        victory: false,
        message: message,
        score: this.destructionScore,
        debugModeUsed: this.shuttle.wasDebugModeUsed(),
        destroyedBuildings: this.destroyedBuildings,
      });
    }
    // Otherwise, surviving player continues
  }

  
  private handleProjectileHitOnShuttle(projectileSpriteKey: string | undefined, shuttle: Shuttle): void {
    if (this.gameState !== 'playing') return;
    if (!shuttle.active) return; // Already dead
    // Note: Bribed cannons stand down and don't fire, but existing projectiles can still hit!

    const playerNum = shuttle.getPlayerIndex();
    console.log('CRASH: Hit by projectile at', { x: shuttle.x, y: shuttle.y }, 'player:', playerNum, 'type:', projectileSpriteKey);

    // Generate and store death message
    const message = this.getProjectileDeathMessage(projectileSpriteKey);
    if (playerNum === 1) {
      this.p1DeathMessage = message;
    } else {
      this.p2DeathMessage = message;
    }

    // Spawn tombstone at crash location with projectile type as cause
    this.spawnTombstone(shuttle.x, shuttle.y, projectileSpriteKey || 'cannonball');

    // Stop thrust sound and explode the hit shuttle
    shuttle.stopRocketSound();
    shuttle.explode();

    // Play crash and explosion sounds
    this.sound.play('car_crash', { volume: 0.8 });
    const explosionNum = Math.floor(Math.random() * 3) + 1;
    this.sound.play(`explosion${explosionNum}`, { volume: 0.5 });

    // Remove from active shuttles
    const idx = this.shuttles.indexOf(shuttle);
    if (idx >= 0) {
      this.shuttles.splice(idx, 1);
    }

    // Check if game over
    this.checkGameOverAfterCrash();
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

  private handleCollectiblePickup(collectible: Collectible, playerNum: number = 1): void {
    if (collectible.collected) return;

    // Get the correct shuttle, fuel system, and inventory for the player
    const shuttle = playerNum === 2 && this.shuttle2 ? this.shuttle2 : this.shuttle;
    const fuelSys = playerNum === 2 && this.fuelSystem2 ? this.fuelSystem2 : this.fuelSystem;
    const invSys = playerNum === 2 && this.inventorySystem2 ? this.inventorySystem2 : this.inventorySystem;

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
      this.activateSpeedBoost(playerNum);
    } else if (collectible.special === 'fuel_boost') {
      // Covfefe gives instant 10% fuel
      const fuelToAdd = fuelSys.getMaxFuel() * 0.1;
      fuelSys.add(fuelToAdd);

      // Show "+10% FUEL" popup
      const fuelText = this.add.text(shuttle.x, shuttle.y - 50, '+10% FUEL!', {
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
      invSys.add(collectible.collectibleType, FOOD_PICKUP_AMOUNT);

      // Show "+10" popup
      const amountText = this.add.text(shuttle.x, shuttle.y - 50, `+${FOOD_PICKUP_AMOUNT}!`, {
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
      invSys.add(collectible.collectibleType);

      // Track casino chip achievement (check total value after adding)
      if (collectible.collectibleType === 'CASINO_CHIP') {
        const chipValues = invSys.getCasinoChipValues();
        const lastValue = chipValues[chipValues.length - 1] || 0;
        this.achievementSystem.onCasinoChipCollected(lastValue);
      }
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

  private activateSpeedBoost(playerNum: number = 1): void {
    const duration = 6000; // 6 seconds of speed boost
    const shuttle = playerNum === 2 && this.shuttle2 ? this.shuttle2 : this.shuttle;

    this.hasSpeedBoost = true;
    this.speedBoostEndTime = this.time.now + duration;
    this.speedBoostPlayer = playerNum; // Track which player has the boost

    // Sound is played by playPickupSound()

    // Modify shuttle thrust temporarily
    shuttle.setThrustMultiplier(1.8);

    // Create speed trail effect (floppy tie)
    if (!this.speedBoostTrail) {
      this.speedBoostTrail = this.add.graphics();
      this.speedBoostTrail.setDepth(45);
    }

    // Initialize tie segments at shuttle position
    this.tieSegments = [];
    for (let i = 0; i < 8; i++) {
      this.tieSegments.push({ x: shuttle.x, y: shuttle.y + i * 6 });
    }

    // Show "SPEED BOOST" text
    const speedText = this.add.text(shuttle.x, shuttle.y - 60, 'RED TIE POWER!', {
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

  private dropBomb(shuttle: Shuttle, inventory: InventorySystem, playerNum: number = 1): void {
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
      // No food to drop
      return;
    }

    // Play random bomb quote (only if not already playing)
    const bombQuoteNum = Math.floor(Math.random() * 8) + 1;
    this.playSoundIfNotPlaying(`bomb${bombQuoteNum}`);

    // Consume 1 from inventory
    inventory.remove(foodType as any, 1);

    // Create bomb at shuttle position, tracking which player dropped it
    const bomb = new Bomb(this, shuttle.x, shuttle.y + 20, foodType, playerNum);

    // Give it the shuttle's velocity plus some downward motion
    const shuttleVel = shuttle.getVelocity();
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

  // Dedicated pickup sounds mapping
  private static readonly PICKUP_SOUNDS: Record<string, string> = {
    'BURGER': 'pickup_burger', 'HAMBERDER': 'pickup_burger',
    'DIET_COKE': 'pickup_dietcoke', 'TRUMP_STEAK': 'pickup_steak',
    'DOLLAR': 'pickup_dollar', 'HAIR_SPRAY': 'pickup_hairspray',
    'TWITTER': 'pickup_twitter', 'CASINO_CHIP': 'pickup_casinochip',
    'MAGA_HAT': 'pickup_magahat', 'NFT': 'pickup_nft',
    'BITCOIN': 'pickup_bitcoin', 'CLASSIFIED_DOCS': 'pickup_classifieddocs',
    'GOLDEN_TOILET': 'pickup_goldentoilet', 'VODKA': 'pickup_vodka',
    'MATRYOSHKA': 'pickup_russian', 'OLIGARCH_GOLD': 'pickup_russian',
    'TAN_SUIT': 'pickup_tansuit',
  };

  private playPickupSound(collectibleType: string): void {
    // Power-ups have special voice sounds (always play, no boing)
    const powerUpSounds: Record<string, string> = {
      'TRUMP_TOWER': 'bribe1',
      'RED_TIE': 'speedboost',
      'COVFEFE': 'covfefe',
    };

    const soundKey = powerUpSounds[collectibleType];
    if (soundKey) {
      this.playSoundIfNotPlaying(soundKey);
      return;
    }

    // Regular collectibles: always play boing
    this.playBoingSound();

    // 20% chance to also play dedicated sound
    const dedicatedSound = GameScene.PICKUP_SOUNDS[collectibleType];
    if (dedicatedSound && Math.random() < 0.2) {
      this.playSoundIfNotPlaying(dedicatedSound);
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

      // Check collision with OTHER player's shuttle (2-player mode only)
      if (this.playerCount === 2) {
        const targetShuttle = bomb.droppedByPlayer === 1 ? this.shuttle2 : this.shuttle;
        if (targetShuttle && targetShuttle.active) {
          const dx = bombX - targetShuttle.x;
          const dy = bombY - targetShuttle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const hitRadius = 25; // Shuttle is roughly 32x40, so 25px radius is good

          if (dist < hitRadius) {
            // Direct hit on enemy shuttle!
            bomb.explode(this);
            this.bombs.splice(i, 1);
            bombDestroyed = true;

            // Track the kill
            const killerPlayer = bomb.droppedByPlayer;
            const victimPlayer = killerPlayer === 1 ? 2 : 1;
            if (killerPlayer === 1) {
              this.p1Kills++;
            } else {
              this.p2Kills++;
            }

            // Track kill achievement
            this.achievementSystem.onPlayerKill(killerPlayer);

            // Emit event for UI to update kill tally
            this.events.emit('playerKill', { killer: killerPlayer, victim: victimPlayer, p1Kills: this.p1Kills, p2Kills: this.p2Kills });

            // Play gotcha sound after 1 second (killer's sound)
            this.time.delayedCall(1000, () => {
              const gotchaSound = killerPlayer === 1 ? 'p1_gotcha' : 'p2_gotcha';
              this.sound.play(gotchaSound);
            });

            // Kill the target shuttle with friendly fire cause
            const causeEmoji = victimPlayer === 1 ? 'p1_bombed' : 'p2_bombed';
            this.handleShuttleCrash(victimPlayer, `Bombed by P${killerPlayer}!`, causeEmoji);
          }
        }
      }

      if (bombDestroyed) continue;

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
          // Hit a building! Use decoration.explode() for visual (fixes drift issue)
          this.cameras.main.shake(200, 0.01);
          bomb.hasExploded = true;
          bomb.destroy();

          // Play explosion SFX (can overlap) and bomb hit quote (delayed 1.5s, no overlap)
          const explosionNum = Math.floor(Math.random() * 3) + 1;
          this.sound.play(`explosion${explosionNum}`, { volume: 0.5 });
          const bombHitNum = Math.floor(Math.random() * 5) + 1;
          this.time.delayedCall(1500, () => {
            this.playSoundIfNotPlaying(`bombhit${bombHitNum}`);
          });

          // Apply shockwave to shuttle (use decoration position, not bomb position)
          this.applyExplosionShockwave(decoration.x, decoration.y);

          // Get building info and destroy it (this creates the explosion visual)
          const { name, points, textureKey, country } = decoration.explode();
          this.destructionScore += points;
          this.destroyedBuildings.push({ name, points, textureKey, country });

          // Track building destruction achievement
          this.achievementSystem.onBuildingDestroyed();

          // Clear any scorch marks that were on the destroyed building
          this.clearScorchMarksInArea(bounds);

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

          // Track cannon destruction achievement
          this.cannonsDestroyedThisGame++;
          this.achievementSystem.onCannonDestroyed();

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

          // Track fisherboat destruction achievement
          this.achievementSystem.onFisherBoatDestroyed();

          // Show special destruction message
          this.showFisherBoatDestroyed(this.fisherBoat.x, this.fisherBoat.y - 50, points);

          this.bombs.splice(i, 1);
          bombDestroyed = true;
        }
      }

      if (bombDestroyed) continue;

      // Check collision with sharks
      for (let j = this.sharks.length - 1; j >= 0; j--) {
        const shark = this.sharks[j];
        if (shark.isDestroyed) continue;

        const bounds = shark.getCollisionBounds();

        if (
          bombX >= bounds.x &&
          bombX <= bounds.x + bounds.width &&
          bombY >= bounds.y &&
          bombY <= bounds.y + bounds.height
        ) {
          // Hit a shark!
          const explosionX = bombX;
          const explosionY = bombY;
          bomb.explode(this);

          // Play underwater explosion sound (quieter)
          const explosionNum = Math.floor(Math.random() * 3) + 1;
          this.sound.play(`explosion${explosionNum}`, { volume: 0.3 });

          // Apply shockwave to shuttle (reduced underwater)
          this.applyExplosionShockwave(explosionX, explosionY);

          // Get shark info and destroy it
          const { name, points, wasDead } = shark.explode();
          this.destructionScore += points;

          // Track shark destruction achievement
          this.achievementSystem.onSharkKill();

          // Show destruction message
          this.showDestructionPoints(
            shark.x,
            shark.y - 30,
            points,
            wasDead ? 'Dead Shark' : 'Shark'
          );

          this.bombs.splice(i, 1);
          bombDestroyed = true;
          break;
        }
      }

      if (bombDestroyed) continue;

      // Check collision with Greenland ice
      if (this.greenlandIce && !this.greenlandIce.isDestroyed && !this.hasGreenlandIce) {
        const bounds = this.greenlandIce.getCollisionBounds();

        if (
          bombX >= bounds.x &&
          bombX <= bounds.x + bounds.width &&
          bombY >= bounds.y &&
          bombY <= bounds.y + bounds.height
        ) {
          // Hit the ice!
          const explosionX = bombX;
          const explosionY = bombY;
          bomb.explode(this);

          // Play explosion sound
          const explosionNum = Math.floor(Math.random() * 3) + 1;
          this.sound.play(`explosion${explosionNum}`, { volume: 0.4 });

          // Apply shockwave to shuttle
          this.applyExplosionShockwave(explosionX, explosionY);

          // Destroy the ice
          this.greenlandIce.explode();
          this.greenlandIce.isDestroyed = true;

          // Award points
          this.destructionScore += 500;
          this.events.emit('destructionScore', this.destructionScore);

          // Trigger achievement
          this.achievementSystem.onGreenlandDestroyed();

          // Show destruction message
          this.showDestructionPoints(
            this.greenlandIce.x,
            this.greenlandIce.y - 50,
            500,
            'Greenland'
          );

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

          // Track golf cart destruction achievement
          this.achievementSystem.onGolfCartDestroyed();

          // Show special destruction message
          this.showGolfCartDestroyed(this.golfCart.x, this.golfCart.y - 50, points);

          // Spawn Epstein Files
          this.spawnEpsteinFiles(filePositions);

          this.bombs.splice(i, 1);
          bombDestroyed = true;
        }
      }

      if (bombDestroyed) continue;

      // Check collision with oil towers
      for (let j = this.oilTowers.length - 1; j >= 0; j--) {
        const oilTower = this.oilTowers[j];
        if (oilTower.isDestroyed) continue;

        const bounds = oilTower.getCollisionBounds();

        if (
          bombX >= bounds.x &&
          bombX <= bounds.x + bounds.width &&
          bombY >= bounds.y &&
          bombY <= bounds.y + bounds.height
        ) {
          // Hit an oil tower!
          const explosionX = bombX;
          const explosionY = bombY;
          bomb.explode(this);

          // Play explosion SFX (no bomb hit quote for oil towers)
          const explosionNum = Math.floor(Math.random() * 3) + 1;
          this.sound.play(`explosion${explosionNum}`, { volume: 0.5 });

          // Apply shockwave to shuttle
          this.applyExplosionShockwave(explosionX, explosionY);

          // Destroy the tower (no points awarded)
          oilTower.explode();

          this.bombs.splice(i, 1);
          bombDestroyed = true;
          break;
        }
      }

      if (bombDestroyed) continue;

      // Check collision with biplane
      if (this.biplane && !this.biplane.isDestroyed) {
        const bounds = this.biplane.getCollisionBounds();

        if (
          bombX >= bounds.x &&
          bombX <= bounds.x + bounds.width &&
          bombY >= bounds.y &&
          bombY <= bounds.y + bounds.height
        ) {
          // Hit the biplane!
          const explosionX = bombX;
          const explosionY = bombY;
          bomb.explode(this);

          // Play explosion sound
          const explosionNum = Math.floor(Math.random() * 3) + 1;
          this.sound.play(`explosion${explosionNum}`, { volume: 0.5 });

          // Apply shockwave to shuttle
          this.applyExplosionShockwave(explosionX, explosionY);

          // Get plane info and destroy it
          const { name, points, bannerPosition, propagandaType, message, accentColor } = this.biplane.explode();
          this.destructionScore += points;

          // Track biplane destruction achievement
          this.achievementSystem.onBiplaneDestroyed();

          // Show special destruction message
          this.showBiplaneDestroyed(this.biplane.x, this.biplane.y, points, this.biplane.country);

          // Spawn collectible propaganda banner
          this.spawnPropagandaBanner(bannerPosition.x, bannerPosition.y, propagandaType, message, accentColor);

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
        const explosionY = terrainY;
        bomb.explode(this);

        // Create bomb crater scorch mark
        this.createBombCrater(explosionX, explosionY);

        // Play explosion sound at 40% volume for ground hits
        const groundExplosionNum = Math.floor(Math.random() * 3) + 1;
        this.sound.play(`explosion${groundExplosionNum}`, { volume: 0.4 });

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

  private sinkBombInWater(bomb: Bomb, waterLevel: number): boolean {
    const bombX = bomb.x;

    // Check if any shark can intercept and eat this bomb
    for (const shark of this.sharks) {
      if (shark.isDestroyed || !shark.canEatBomb()) continue;

      const eatingBounds = shark.getEatingBounds();
      // Check if bomb is within horizontal range and shark is below bomb
      if (
        bombX >= eatingBounds.x &&
        bombX <= eatingBounds.x + eatingBounds.width
      ) {
        // Shark eats the bomb!
        shark.eatBomb();
        bomb.destroy();
        return true; // Bomb was eaten
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

    // Track the food for shark attraction
    const finalY = waterLevel + 120;
    const foodData = { x: bombX, y: finalY, sprite: sinkingFood };

    // Sink slowly to the bottom and stay there
    this.tweens.add({
      targets: sinkingFood,
      y: finalY, // Sink to bottom
      alpha: 0.5,
      angle: sinkingFood.angle + 30, // Slight rotation as it sinks
      duration: 2000,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Add to sunken food array when it reaches bottom
        this.sunkenFood.push(foodData);
      },
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
    return false; // Bomb sank normally (wasn't eaten)
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

  private showBiplaneDestroyed(x: number, y: number, points: number, country: string): void {
    // Show country-specific destruction message
    const displayName = country === 'GAME_INFO' ? 'Info plane' : `${country} propaganda plane`;
    const nameText = this.add.text(x, y - 20, `${displayName} shot down!`, {
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

    // Show "RED BARON" achievement hint
    const achievementText = this.add.text(x, y + 50, 'RED BARON!', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '24px',
      color: '#C0C0C0', // Silver
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    achievementText.setOrigin(0.5, 0.5);
    achievementText.setDepth(150);

    // Animate all texts - stay visible longer then fade
    this.tweens.add({
      targets: [nameText, pointsText, achievementText],
      y: '-=100',
      alpha: 0,
      duration: 4000,
      delay: 1000, // Hold longer for this special message
      ease: 'Power1',
      onComplete: () => {
        nameText.destroy();
        pointsText.destroy();
        achievementText.destroy();
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

  private spawnPropagandaBanner(startX: number, startY: number, propagandaType: string, message: string, accentColor: number): void {
    // Create banner container
    const banner = this.add.container(startX, startY);
    banner.setDepth(50);
    banner.setData('collected', false);
    banner.setData('grounded', false);
    banner.setData('sinking', false);
    banner.setData('propagandaType', propagandaType);

    // Banner graphic - tattered shape
    const bannerGraphics = this.add.graphics();
    const bw = 70;

    bannerGraphics.fillStyle(0xFFFFF5, 0.9);
    bannerGraphics.beginPath();
    bannerGraphics.moveTo(-bw / 2, -8);
    bannerGraphics.lineTo(bw / 2 - 8, -10);
    bannerGraphics.lineTo(bw / 2, 6);
    bannerGraphics.lineTo(bw / 2 - 15, 10);
    bannerGraphics.lineTo(-bw / 2 + 5, 8);
    bannerGraphics.lineTo(-bw / 2, -8);
    bannerGraphics.closePath();
    bannerGraphics.fillPath();

    bannerGraphics.lineStyle(2, accentColor, 0.8);
    bannerGraphics.strokePath();

    banner.add(bannerGraphics);

    // Add truncated message text
    const shortMessage = message.length > 12 ? message.substring(0, 12) + '...' : message;
    const msgText = this.add.text(0, 0, shortMessage, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '7px',
      color: '#333333',
      fontStyle: 'bold',
    });
    msgText.setOrigin(0.5, 0.5);
    banner.add(msgText);

    this.propagandaBanners.push(banner);

    // Calculate terrain landing position
    const terrainY = this.terrain.getHeightAt(startX) - 15;

    // Check if landing in water (Atlantic Ocean)
    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 5000;
    const isOverWater = startX >= atlanticStart && startX < atlanticEnd;

    // Falling leaf animation - swaying side to side while descending (50% faster)
    const fallDuration = 3000;
    const swayAmount = 120;
    const swayFrequency = 3;

    let elapsed = 0;
    const leafUpdate = this.time.addEvent({
      delay: 16,
      repeat: Math.floor(fallDuration / 16),
      callback: () => {
        if (!banner || !banner.active || banner.getData('collected')) {
          leafUpdate.destroy();
          return;
        }

        elapsed += 16;
        const progress = Math.min(elapsed / fallDuration, 1);

        // Vertical fall with slight acceleration, but stop at terrain
        const targetY = startY + progress * progress * (terrainY - startY);
        banner.y = Math.min(targetY, terrainY);

        // Horizontal sway (sinusoidal)
        const swayProgress = progress * swayFrequency * Math.PI * 2;
        banner.x = startX + Math.sin(swayProgress) * swayAmount * (1 - progress * 0.5);

        // Rotation follows the sway direction (tilts into the turn)
        const swayVelocity = Math.cos(swayProgress);
        banner.angle = swayVelocity * 35;

        // Check if landed on terrain/water
        if (banner.y >= terrainY - 5) {
          banner.y = terrainY;
          banner.angle = (Math.random() - 0.5) * 20; // Random resting angle
          banner.setData('grounded', true);
          leafUpdate.destroy();

          // If landed in water, start sinking
          if (isOverWater) {
            banner.setData('sinking', true);
            const sinkDepth = terrainY + 150;

            this.tweens.add({
              targets: banner,
              y: sinkDepth,
              alpha: 0,
              duration: 3000,
              ease: 'Quad.easeIn',
              onComplete: () => {
                const idx = this.propagandaBanners.indexOf(banner);
                if (idx >= 0) {
                  this.propagandaBanners.splice(idx, 1);
                }
                banner.destroy();
              },
            });
          } else {
            // Fade out after 15 seconds if not collected (on land)
            this.time.delayedCall(15000, () => {
              if (banner && banner.active && !banner.getData('collected')) {
                const idx = this.propagandaBanners.indexOf(banner);
                if (idx >= 0) {
                  this.propagandaBanners.splice(idx, 1);
                }

                this.tweens.add({
                  targets: banner,
                  alpha: 0,
                  duration: 500,
                  onComplete: () => banner.destroy(),
                });
              }
            });
          }
        }
      },
    });
  }

  private updatePropagandaBanners(): void {
    const pickupRadius = 60;

    for (let i = this.propagandaBanners.length - 1; i >= 0; i--) {
      const banner = this.propagandaBanners[i];
      if (!banner || !banner.active || banner.getData('collected') || banner.getData('sinking')) continue;

      const dx = this.shuttle.x - banner.x;
      const dy = this.shuttle.y - banner.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Can catch mid-air or on ground
      if (dist < pickupRadius) {
        banner.setData('collected', true);

        // Play boing sound
        this.playBoingSound();

        // Add to cargo inventory
        const propagandaType = banner.getData('propagandaType') as keyof typeof COLLECTIBLE_TYPES;
        this.inventorySystem.add(propagandaType);

        // Get display name from constants
        const itemData = COLLECTIBLE_TYPES[propagandaType];
        const displayName = itemData ? itemData.name : 'Propaganda';

        // Show pickup text
        const pickupText = this.add.text(banner.x, banner.y - 20, `+1 ${displayName.toUpperCase()}`, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '12px',
          color: '#3C3B6E',
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

        // Collect animation - banner flies to shuttle
        this.tweens.killTweensOf(banner);
        this.tweens.add({
          targets: banner,
          x: this.shuttle.x,
          y: this.shuttle.y,
          scale: 0,
          alpha: 0,
          duration: 300,
          ease: 'Quad.easeIn',
          onComplete: () => {
            const idx = this.propagandaBanners.indexOf(banner);
            if (idx >= 0) {
              this.propagandaBanners.splice(idx, 1);
            }
            banner.destroy();
          },
        });
      }
    }
  }

  // Transition to game over with 3 second delay and 1 second fade out
  private transitionToGameOver(data: {
    victory: boolean;
    message: string;
    score: number;
    debugModeUsed: boolean;
    destroyedBuildings: { name: string; points: number; textureKey: string; country: string }[];
    noShake?: boolean;
  }): void {
    // Create fade overlay
    const fadeOverlay = this.add.rectangle(
      this.cameras.main.scrollX + this.cameras.main.width / 2,
      this.cameras.main.scrollY + this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0
    );
    fadeOverlay.setDepth(1000);
    fadeOverlay.setScrollFactor(0);

    // Wait 2 seconds, then fade out over 1 second, then transition
    this.time.delayedCall(2000, () => {
      if (this.gameState !== 'crashed') return;

      this.tweens.add({
        targets: fadeOverlay,
        alpha: 1,
        duration: 1000,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.scene.stop('UIScene');
          this.scene.start('GameOverScene', data);
        },
      });
    });
  }

  private applyExplosionShockwave(explosionX: number, explosionY: number): void {
    // Shockwave radius and strength
    const maxRadius = 300; // Max distance for shockwave effect
    const maxForce = 8; // Maximum force at epicenter

    // Apply to shuttle
    if (this.shuttle && this.shuttle.body) {
      const shuttleX = this.shuttle.x;
      const shuttleY = this.shuttle.y;

      // Calculate distance from explosion to shuttle
      const dx = shuttleX - explosionX;
      const dy = shuttleY - explosionY;
      const distance = Math.sqrt(dx * dx + dy * dy);

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

    // Apply to tombstones
    for (const body of this.tombstoneBodies) {
      if (!body) continue;

      const dx = body.position.x - explosionX;
      const dy = body.position.y - explosionY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < maxRadius) {
        const falloff = 1 - (distance / maxRadius);
        const force = maxForce * falloff * falloff * 1.5; // Tombstones are lighter, more affected

        const dirX = dx / (distance || 1);
        const dirY = dy / (distance || 1);

        // Apply force to tombstone body
        this.matter.body.setVelocity(body, {
          x: body.velocity.x + dirX * force,
          y: body.velocity.y + dirY * force - force * 0.8, // Strong upward boost
        });

        // Add spin
        this.matter.body.setAngularVelocity(body, body.angularVelocity + (Math.random() - 0.5) * force * 0.05);
      }
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
          this.bribeGraphics.destroy();
          this.bribeGraphics = this.add.graphics();
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
      const boostShuttle = this.speedBoostPlayer === 2 && this.shuttle2 ? this.shuttle2 : this.shuttle;
      if (now >= this.speedBoostEndTime) {
        this.hasSpeedBoost = false;
        boostShuttle.setThrustMultiplier(1.0);
        if (this.speedBoostTrail) {
          this.speedBoostTrail.clear();
        }
        this.tieSegments = [];
      } else {
        // Update and draw floppy red tie
        if (this.speedBoostTrail && this.tieSegments.length > 0) {
          this.speedBoostTrail.destroy();
          this.speedBoostTrail = this.add.graphics();
          const timeLeft = this.speedBoostEndTime - now;
          const alpha = timeLeft < 2000 ? (Math.sin(now * 0.02) * 0.3 + 0.5) : 0.9;

          // Tie attaches to bottom of shuttle
          const attachX = boostShuttle.x;
          const attachY = boostShuttle.y + 15;

          // Update tie physics - each segment follows the one before it
          // First segment follows the shuttle
          this.tieSegments[0].x += (attachX - this.tieSegments[0].x) * 0.4;
          this.tieSegments[0].y += (attachY - this.tieSegments[0].y) * 0.4;

          // Each subsequent segment follows the previous one with some lag and gravity
          for (let i = 1; i < this.tieSegments.length; i++) {
            const prev = this.tieSegments[i - 1];
            const curr = this.tieSegments[i];

            // Follow previous segment
            const followStrength = 0.25;
            curr.x += (prev.x - curr.x) * followStrength;
            curr.y += (prev.y - curr.y) * followStrength;

            // Add gravity
            curr.y += 0.8;

            // Add some wind/flutter based on shuttle velocity
            const vel = boostShuttle.getVelocity();
            curr.x -= vel.x * 0.05;
            curr.y -= vel.y * 0.03;

            // Add flutter/wave motion
            const flutter = Math.sin(now * 0.015 + i * 0.8) * (2 + i * 0.5);
            curr.x += flutter;

            // Constrain distance from previous segment
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 8;
            if (dist > maxDist) {
              const scale = maxDist / dist;
              curr.x = prev.x + dx * scale;
              curr.y = prev.y + dy * scale;
            }
          }

          // Draw the tie
          // Tie knot at top (small triangle)
          this.speedBoostTrail.fillStyle(0xAA0000, alpha);
          this.speedBoostTrail.fillTriangle(
            this.tieSegments[0].x - 4, this.tieSegments[0].y,
            this.tieSegments[0].x + 4, this.tieSegments[0].y,
            this.tieSegments[0].x, this.tieSegments[0].y + 6
          );

          // Main tie body - draw as connected trapezoids that get wider then narrower
          for (let i = 0; i < this.tieSegments.length - 1; i++) {
            const curr = this.tieSegments[i];
            const next = this.tieSegments[i + 1];

            // Tie width: starts narrow, gets wider in middle, narrows at tip
            const widthCurve = Math.sin((i / (this.tieSegments.length - 1)) * Math.PI);
            const widthTop = 3 + widthCurve * 6;
            const widthCurveNext = Math.sin(((i + 1) / (this.tieSegments.length - 1)) * Math.PI);
            const widthBottom = 3 + widthCurveNext * 6;

            // Calculate perpendicular direction for width
            const dx = next.x - curr.x;
            const dy = next.y - curr.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const perpX = -dy / len;
            const perpY = dx / len;

            // Draw tie segment as quadrilateral
            this.speedBoostTrail.fillStyle(0xDC143C, alpha);
            this.speedBoostTrail.beginPath();
            this.speedBoostTrail.moveTo(curr.x + perpX * widthTop, curr.y + perpY * widthTop);
            this.speedBoostTrail.lineTo(curr.x - perpX * widthTop, curr.y - perpY * widthTop);
            this.speedBoostTrail.lineTo(next.x - perpX * widthBottom, next.y - perpY * widthBottom);
            this.speedBoostTrail.lineTo(next.x + perpX * widthBottom, next.y + perpY * widthBottom);
            this.speedBoostTrail.closePath();
            this.speedBoostTrail.fillPath();

            // Dark red stripe down the center for detail
            this.speedBoostTrail.lineStyle(2, 0x8B0000, alpha * 0.7);
            this.speedBoostTrail.lineBetween(curr.x, curr.y, next.x, next.y);
          }

          // Tie tip (pointed end)
          const lastSeg = this.tieSegments[this.tieSegments.length - 1];
          const secondLast = this.tieSegments[this.tieSegments.length - 2];
          const tipDx = lastSeg.x - secondLast.x;
          const tipDy = lastSeg.y - secondLast.y;
          const tipLen = Math.sqrt(tipDx * tipDx + tipDy * tipDy) || 1;
          this.speedBoostTrail.fillStyle(0xDC143C, alpha);
          this.speedBoostTrail.fillTriangle(
            lastSeg.x - 3, lastSeg.y,
            lastSeg.x + 3, lastSeg.y,
            lastSeg.x + (tipDx / tipLen) * 8, lastSeg.y + (tipDy / tipLen) * 8
          );

          // Also draw speed trail behind shuttle
          const vel = this.shuttle.getVelocity();
          if (Math.abs(vel.x) > 1 || Math.abs(vel.y) > 1) {
            for (let i = 0; i < 5; i++) {
              const offsetX = -vel.x * (i * 3) + (Math.random() - 0.5) * 10;
              const offsetY = -vel.y * (i * 3) + (Math.random() - 0.5) * 10;
              this.speedBoostTrail.fillStyle(0xDC143C, alpha * 0.5 * (1 - i * 0.15));
              this.speedBoostTrail.fillCircle(this.shuttle.x + offsetX, this.shuttle.y + offsetY, 5 - i);
            }
          }
        }
      }
    }
  }

  private updateScorchMarks(time: number): void {
    if (!this.scorchMarks || !this.shuttle.getIsThrusting()) return;

    // Only create scorch marks every 50ms to avoid too many draws
    if (time - this.lastScorchTime < 50) return;
    this.lastScorchTime = time;

    // Get thrust position and direction
    const thrustPos = this.shuttle.getThrustPosition();
    const thrustDir = this.shuttle.getThrustDirection();

    // Raycast from thrust position in thrust direction to find what it hits
    // Check up to 150 pixels in the thrust direction
    const maxDistance = 150;
    const stepSize = 5;

    for (let dist = 20; dist < maxDistance; dist += stepSize) {
      const checkX = thrustPos.x + thrustDir.x * dist;
      const checkY = thrustPos.y + thrustDir.y * dist;

      // Check terrain collision
      const terrainY = this.terrain.getHeightAt(checkX);
      if (checkY >= terrainY - 5) {
        // Check if over water - no scorch marks on water
        const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
        const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
        const isOverWater = checkX >= atlanticStart && checkX < atlanticEnd;

        if (!isOverWater) {
          // Hit terrain - create scorch mark
          this.createScorchMark(checkX, terrainY, dist);
        } else {
          // Hit water - create sinking scorch particles
          this.createWaterScorchParticle(checkX, terrainY, dist);
        }
        // Either way, stop raycasting when we hit terrain/water level
        break;
      }

      // Check building collisions
      for (const decoration of this.decorations) {
        const bounds = decoration.getCollisionBounds();
        if (
          checkX >= bounds.x &&
          checkX <= bounds.x + bounds.width &&
          checkY >= bounds.y &&
          checkY <= bounds.y + bounds.height
        ) {
          // Hit building - create scorch mark on the building surface
          this.createScorchMark(checkX, checkY, dist);
          return; // Exit early after hitting a building
        }
      }

      // Check landing pad surfaces
      for (const pad of this.landingPads) {
        const padLeft = pad.x - pad.width / 2;
        const padRight = pad.x + pad.width / 2;
        const padTop = pad.y - 5;
        if (checkX >= padLeft && checkX <= padRight && checkY >= padTop && checkY <= pad.y + 10) {
          this.createScorchMark(checkX, padTop, dist);
          return;
        }
      }

    }

    // Check all tombstones for thrust effect (separate from raycast loop for reliability)
    for (const tombstoneBody of this.tombstoneBodies) {
      const tbX = tombstoneBody.position.x;
      const tbY = tombstoneBody.position.y;

      // Check if tombstone is in the thrust cone
      const dx = tbX - thrustPos.x;
      const dy = tbY - thrustPos.y;
      const distToTombstone = Math.sqrt(dx * dx + dy * dy);

      // Only affect tombstones within thrust range
      if (distToTombstone > 20 && distToTombstone < maxDistance) {
        // Check if tombstone is roughly in thrust direction (dot product)
        const normalizedDx = dx / distToTombstone;
        const normalizedDy = dy / distToTombstone;
        const dotProduct = normalizedDx * thrustDir.x + normalizedDy * thrustDir.y;

        console.log(`Tombstone check: dist=${distToTombstone.toFixed(0)}, dot=${dotProduct.toFixed(2)}, thrustDir=(${thrustDir.x.toFixed(2)},${thrustDir.y.toFixed(2)})`);

        // Only affect if in front of thrust (dot > 0.5 means within ~60 degree cone)
        if (dotProduct > 0.5) {
          // Apply force in thrust direction, stronger when closer
          const forceMagnitude = 0.05 * (1 - distToTombstone / maxDistance);
          this.matter.body.applyForce(tombstoneBody, tombstoneBody.position, {
            x: thrustDir.x * forceMagnitude,
            y: thrustDir.y * forceMagnitude,
          });
        }
      }
    }
  }

  // Simple seeded random number generator for reproducible scorch marks
  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  private static readonly MAX_SCORCH_MARKS = 150; // Higher cap - rely mainly on off-screen culling

  private createScorchMark(x: number, y: number, distance: number, existingSeed?: number): void {
    if (!this.scorchMarks) return;

    // Only enforce hard limit as emergency fallback (prefer off-screen culling)
    if (existingSeed === undefined && this.scorchMarkData.length >= GameScene.MAX_SCORCH_MARKS) {
      // Remove marks furthest from player (not just oldest)
      const playerX = this.shuttle.x;
      this.scorchMarkData.sort((a, b) => {
        const distA = Math.abs(a.x - playerX);
        const distB = Math.abs(b.x - playerX);
        return distB - distA; // Furthest first
      });
      // Remove the 20% furthest from player
      const removeCount = Math.max(1, Math.floor(GameScene.MAX_SCORCH_MARKS * 0.2));
      this.scorchMarkData.splice(0, removeCount);
      // Redraw remaining marks
      this.redrawAllScorchMarks();
    }

    const seed = existingSeed ?? Date.now() + Math.random() * 10000;
    const rand = this.seededRandom(seed);

    // Scorch intensity based on distance (closer = more intense)
    const intensity = Math.max(0.3, 1 - distance / 150);

    // Random variation for organic look
    const offsetX = (rand() - 0.5) * 10;
    const offsetY = (rand() - 0.5) * 3;

    // Draw scorch marks - charred black/brown ellipses
    const baseAlpha = intensity * 0.7;
    const width = 10 + rand() * 15;
    const height = 4 + rand() * 6;

    // Store scorch mark data for potential redraw (only if new and not duplicate location)
    if (existingSeed === undefined) {
      // Skip if there's already a mark at this exact location
      const isDuplicate = this.scorchMarkData.some(mark => mark.x === x && mark.y === y);
      if (!isDuplicate) {
        this.scorchMarkData.push({
          x, y, width: width * 1.5, height: height * 1.5,
          type: 'thrust', seed, distance
        });
      }
    }

    // Outer glow/heat discoloration (reddish-brown)
    this.scorchMarks.fillStyle(0x4a2810, baseAlpha * 0.3);
    this.scorchMarks.fillEllipse(x + offsetX, y + offsetY - 1, width * 1.4, height * 1.3);

    // Main char mark
    this.scorchMarks.fillStyle(0x1a1a1a, baseAlpha);
    this.scorchMarks.fillEllipse(x + offsetX, y + offsetY, width, height);

    // Darker center with slight gradient effect
    this.scorchMarks.fillStyle(0x050505, baseAlpha * 0.9);
    this.scorchMarks.fillEllipse(x + offsetX, y + offsetY, width * 0.5, height * 0.5);

    // Ashy grey edges
    this.scorchMarks.fillStyle(0x3a3a3a, baseAlpha * 0.4);
    const numAshSpots = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < numAshSpots; i++) {
      const angle = (i / numAshSpots) * Math.PI * 2 + rand() * 0.5;
      const dist = width * 0.4 + rand() * width * 0.3;
      const spotX = x + offsetX + Math.cos(angle) * dist;
      const spotY = y + offsetY + Math.sin(angle) * dist * 0.4;
      const spotSize = 2 + rand() * 4;
      this.scorchMarks.fillCircle(spotX, spotY, spotSize);
    }

    // Brown singe marks radiating outward
    this.scorchMarks.fillStyle(0x3d2817, baseAlpha * 0.5);
    const numSpots = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < numSpots; i++) {
      const spotX = x + offsetX + (rand() - 0.5) * width * 1.5;
      const spotY = y + offsetY + (rand() - 0.5) * height * 0.8;
      const spotSize = 2 + rand() * 3;
      this.scorchMarks.fillCircle(spotX, spotY, spotSize);
    }
  }

  private createBombCrater(x: number, y: number, existingSeed?: number): void {
    if (!this.scorchMarks) return;

    const seed = existingSeed ?? Date.now() + Math.random() * 10000;
    const rand = this.seededRandom(seed);

    // Large bomb crater scorch mark
    const craterRadius = 35 + rand() * 15;

    // Store crater data for potential redraw (only if new)
    if (existingSeed === undefined) {
      this.scorchMarkData.push({
        x, y, width: craterRadius * 4, height: craterRadius * 2,
        type: 'crater', seed
      });
    }

    // Outer heat discoloration ring (dark reddish-brown)
    this.scorchMarks.fillStyle(0x3d1a0a, 0.5);
    this.scorchMarks.fillEllipse(x, y - 2, craterRadius * 2.2, craterRadius * 0.9);

    // Scorched earth ring (dark brown)
    this.scorchMarks.fillStyle(0x2a1a0a, 0.6);
    this.scorchMarks.fillEllipse(x, y - 1, craterRadius * 1.8, craterRadius * 0.75);

    // Main blast mark (very dark)
    this.scorchMarks.fillStyle(0x0f0f0f, 0.8);
    this.scorchMarks.fillEllipse(x, y, craterRadius * 1.4, craterRadius * 0.6);

    // Charred center (black)
    this.scorchMarks.fillStyle(0x050505, 0.9);
    this.scorchMarks.fillEllipse(x, y, craterRadius * 0.8, craterRadius * 0.35);

    // Impact point (darkest)
    this.scorchMarks.fillStyle(0x020202, 0.95);
    this.scorchMarks.fillEllipse(x, y, craterRadius * 0.3, craterRadius * 0.15);

    // Radiating scorch lines (blast pattern)
    this.scorchMarks.lineStyle(2, 0x1a1a1a, 0.6);
    const numRays = 8 + Math.floor(rand() * 6);
    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * Math.PI * 2 + (rand() - 0.5) * 0.3;
      const rayLength = craterRadius * (0.8 + rand() * 0.8);
      const startDist = craterRadius * 0.3;
      this.scorchMarks.lineBetween(
        x + Math.cos(angle) * startDist,
        y + Math.sin(angle) * startDist * 0.4,
        x + Math.cos(angle) * rayLength,
        y + Math.sin(angle) * rayLength * 0.4
      );
    }

    // Scattered debris/ash spots around crater
    const numDebris = 15 + Math.floor(rand() * 10);
    for (let i = 0; i < numDebris; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = craterRadius * (0.6 + rand() * 1.2);
      const spotX = x + Math.cos(angle) * dist;
      const spotY = y + Math.sin(angle) * dist * 0.4;
      const spotSize = 2 + rand() * 5;

      // Vary colors between black, dark grey, and brown
      const colorChoice = rand();
      if (colorChoice < 0.4) {
        this.scorchMarks.fillStyle(0x1a1a1a, 0.7);
      } else if (colorChoice < 0.7) {
        this.scorchMarks.fillStyle(0x3a3a3a, 0.5);
      } else {
        this.scorchMarks.fillStyle(0x3d2817, 0.6);
      }
      this.scorchMarks.fillCircle(spotX, spotY, spotSize);
    }

    // Ash ring around outer edge
    this.scorchMarks.fillStyle(0x4a4a4a, 0.3);
    const numAshPiles = 12 + Math.floor(rand() * 8);
    for (let i = 0; i < numAshPiles; i++) {
      const angle = (i / numAshPiles) * Math.PI * 2 + (rand() - 0.5) * 0.4;
      const dist = craterRadius * (1.5 + rand() * 0.5);
      const spotX = x + Math.cos(angle) * dist;
      const spotY = y + Math.sin(angle) * dist * 0.4;
      this.scorchMarks.fillEllipse(spotX, spotY, 4 + rand() * 6, 2 + rand() * 3);
    }
  }

  private clearScorchMarksInArea(bounds: { x: number; y: number; width: number; height: number }): void {
    // Filter out scorch marks that overlap with the destroyed building
    const originalCount = this.scorchMarkData.length;
    this.scorchMarkData = this.scorchMarkData.filter(mark => {
      // Check if mark center is within expanded bounds (with some margin)
      const margin = 20;
      const inBounds =
        mark.x >= bounds.x - margin &&
        mark.x <= bounds.x + bounds.width + margin &&
        mark.y >= bounds.y - margin &&
        mark.y <= bounds.y + bounds.height + margin;
      return !inBounds;
    });

    // Only redraw if we removed any marks
    if (this.scorchMarkData.length < originalCount) {
      this.redrawAllScorchMarks();
    }
  }

  private redrawAllScorchMarks(): void {
    if (!this.scorchMarks) return;

    // Clear the graphics layer
    this.scorchMarks.clear();

    // Redraw all remaining scorch marks
    for (const mark of this.scorchMarkData) {
      if (mark.type === 'thrust') {
        this.createScorchMark(mark.x, mark.y, mark.distance ?? 50, mark.seed);
      } else {
        this.createBombCrater(mark.x, mark.y, mark.seed);
      }
    }
  }

  private cullOffScreenScorchMarks(): void {
    // Remove scorch marks that are 2 screen widths (2560px) behind the player
    const cullThreshold = this.shuttle.x - (GAME_WIDTH * 2);

    const originalLength = this.scorchMarkData.length;
    this.scorchMarkData = this.scorchMarkData.filter(mark => mark.x > cullThreshold);

    // Only redraw if we actually removed some marks
    if (this.scorchMarkData.length < originalLength) {
      this.redrawAllScorchMarks();
    }
  }

  private createWaterScorchParticle(x: number, waterY: number, distance: number): void {
    // Create sinking scorch particles when thrust hits water
    const intensity = Math.max(0.2, 1 - distance / 150);
    const numParticles = Math.floor(2 + intensity * 3);

    for (let i = 0; i < numParticles; i++) {
      this.sinkingScorchParticles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: waterY + Math.random() * 3,
        vx: (Math.random() - 0.5) * 0.3, // Slight horizontal drift
        vy: 0.2 + Math.random() * 0.4, // Sink speed
        size: 2 + Math.random() * 4 * intensity,
        alpha: 0.5 + Math.random() * 0.3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05, // Tumbling
        shape: Math.floor(Math.random() * 3), // 0=flake, 1=elongated, 2=irregular
      });
      this.totalWaterPollutionParticles++;
    }

    // Increase water pollution level (slow rate)
    this.waterPollutionLevel = Math.min(1, this.waterPollutionLevel + 0.0025 * intensity);
  }

  private updateWaterPollution(): void {
    if (!this.waterPollution) return;

    // Destroy and recreate to prevent Phaser internal state accumulation
    this.waterPollution.destroy();
    this.waterPollution = this.add.graphics();
    this.waterPollution.setDepth(-50);

    // Get water bounds
    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
    const waterY = this.terrain.getHeightAt(atlanticStart + 100); // Approximate water level

    // Draw pollution tint over water (if any pollution)
    if (this.waterPollutionLevel > 0.01) {
      const pollutionAlpha = this.waterPollutionLevel * 0.95; // Can go almost fully opaque
      this.waterPollution.fillStyle(0x0a0805, pollutionAlpha);
      this.waterPollution.fillRect(atlanticStart, waterY, atlanticEnd - atlanticStart, 200);
    }

    // Update and draw sinking particles
    for (let i = this.sinkingScorchParticles.length - 1; i >= 0; i--) {
      const particle = this.sinkingScorchParticles[i];

      // Move particle (sinking with drift)
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotSpeed;

      // Fade out as it sinks
      particle.alpha -= 0.004;

      // Slow down as it sinks deeper (water resistance)
      particle.vy *= 0.992;
      particle.vx *= 0.98;

      // Remove if faded or sunk too deep
      if (particle.alpha <= 0 || particle.y > waterY + 120) {
        this.sinkingScorchParticles.splice(i, 1);
        continue;
      }

      // Draw particle based on shape type
      const cos = Math.cos(particle.rotation);
      const sin = Math.sin(particle.rotation);
      const s = particle.size * 1.5; // Make particles bigger

      if (particle.shape === 0) {
        // Ash flake - chunky irregular shape
        this.waterPollution.fillStyle(0x2a2520, particle.alpha);
        this.waterPollution.beginPath();
        this.waterPollution.moveTo(particle.x + cos * s, particle.y + sin * s * 0.7);
        this.waterPollution.lineTo(particle.x - sin * s * 0.8, particle.y + cos * s * 0.8);
        this.waterPollution.lineTo(particle.x - cos * s * 0.9, particle.y - sin * s * 0.6);
        this.waterPollution.lineTo(particle.x + sin * s * 0.6, particle.y - cos * s * 0.7);
        this.waterPollution.closePath();
        this.waterPollution.fillPath();
        // Inner darker area
        this.waterPollution.fillStyle(0x1a1510, particle.alpha * 0.7);
        this.waterPollution.fillCircle(particle.x, particle.y, s * 0.4);
      } else if (particle.shape === 1) {
        // Chunky char piece
        this.waterPollution.fillStyle(0x1a1815, particle.alpha);
        this.waterPollution.fillEllipse(
          particle.x, particle.y,
          s * 1.2 * Math.abs(cos) + s * 0.8,
          s * 0.8 * Math.abs(sin) + s * 0.6
        );
        // Darker center
        this.waterPollution.fillStyle(0x0f0f0d, particle.alpha * 0.6);
        this.waterPollution.fillEllipse(
          particle.x, particle.y,
          s * 0.6, s * 0.4
        );
      } else {
        // Irregular burnt chunk - thicker
        this.waterPollution.fillStyle(0x252018, particle.alpha);
        this.waterPollution.beginPath();
        this.waterPollution.moveTo(particle.x + cos * s, particle.y + sin * s);
        this.waterPollution.lineTo(particle.x + sin * s * 0.9, particle.y - cos * s * 0.8);
        this.waterPollution.lineTo(particle.x - cos * s * 0.7, particle.y - sin * s * 0.7);
        this.waterPollution.lineTo(particle.x - sin * s * 0.9, particle.y + cos * s * 0.9);
        this.waterPollution.closePath();
        this.waterPollution.fillPath();
        // Ashy highlight
        this.waterPollution.fillStyle(0x3a352a, particle.alpha * 0.5);
        this.waterPollution.fillCircle(particle.x - cos * s * 0.2, particle.y - sin * s * 0.2, s * 0.4);
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
    this.shuttle.stopRocketSound();

    // Track death achievement
    this.achievementSystem.onDeath('duck');

    // Spawn tombstone at crash location
    this.spawnTombstone(this.shuttle.x, this.shuttle.y, 'duck');

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

    this.transitionToGameOver({
      victory: false,
      message: message,
      score: this.destructionScore,
      debugModeUsed: this.shuttle.wasDebugModeUsed(),
      destroyedBuildings: this.destroyedBuildings,
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
    // Always update these even when crashed (for death animation)
    // Update terrain (for animated ocean waves) - pass pollution level for wave tinting
    this.terrain.update(this.waterPollutionLevel);

    // Update water pollution (sinking scorch particles) - always
    this.updateWaterPollution();

    // Update tombstone physics (sync containers to bodies) - always
    this.updateTombstonePhysics();

    // Check if tombstones are in water and need to sink
    this.updateTombstoneSinking();

    // Stop here if not playing
    if (this.gameState !== 'playing') return;

    // Check for lightning strikes in stormy weather
    this.checkLightningStrikes(time);


    // Update rain effect
    this.updateRain();


    // Track country visits for achievement
    const currentCountry = this.getCurrentCountry();
    this.achievementSystem.onCountryVisited(currentCountry.name);

    // Check for reaching Russia in heavy rain
    if (currentCountry.name === 'Russia' && this.rainIntensity === 'heavy') {
      this.achievementSystem.unlock('singing_in_the_rain');
    }

    // Spawn biplane when any player gets close to the target country (or any country for GAME_INFO)
    if (!this.biplaneSpawned && this.biplaneTargetCountry) {
      const spawnDistance = 1500; // Spawn when player is within 1500px of country center
      const validCountries = ['USA', 'United Kingdom', 'France', 'Germany', 'Poland', 'Russia'];

      // For GAME_INFO, check all countries; for propaganda, check only target country
      const countriesToCheck = this.biplaneTargetCountry === 'GAME_INFO'
        ? validCountries
        : [this.biplaneTargetCountry];

      for (const countryName of countriesToCheck) {
        const targetCountryData = COUNTRIES.find(c => c.name === countryName);
        const nextCountryData = COUNTRIES.find(c => c.startX > (targetCountryData?.startX ?? 0));
        if (!targetCountryData) continue;

        const countryStartX = targetCountryData.startX;
        const countryEndX = nextCountryData ? nextCountryData.startX : countryStartX + 6000;
        const countryCenter = countryStartX + (countryEndX - countryStartX) / 2;

        // Check all active shuttles
        for (const shuttle of this.shuttles) {
          if (!shuttle.active) continue;
          const distToCenter = Math.abs(shuttle.x - countryCenter);
          if (distToCenter < spawnDistance) {
            // For GAME_INFO, spawn at the country player is approaching
            const spawnCountry = this.biplaneTargetCountry === 'GAME_INFO' ? countryName : this.biplaneTargetCountry;
            this.biplane = new Biplane(this, this.biplaneTargetCountry, shuttle.x, spawnCountry);
            this.biplaneSpawned = true;
            break;
          }
        }
        if (this.biplaneSpawned) break;
      }
    }

    // Update fisherboat (bob with waves) and check for landing
    if (this.fisherBoat && !this.fisherBoat.isDestroyed) {
      // Check shuttle proximity to stop bobbing
      this.checkBoatProximity();
      this.fisherBoat.update(this.terrain.getWaveOffset());
    }

    // Update sharks
    const foodTargets = this.getFoodTargetsInOcean();
    for (const shark of this.sharks) {
      if (!shark.isDestroyed) {
        shark.update(this.terrain.getWaveOffset(), this.waterPollutionLevel, foodTargets);
        // Check if shark can eat any sunken food
        this.checkSharkEatsSunkenFood(shark);
      }
    }

    // Update Greenland ice
    const shuttle = this.shuttle;

    if (this.greenlandIce && !this.greenlandIce.isDestroyed && !this.hasGreenlandIce) {
      this.greenlandIce.update(this.terrain.getWaveOffset());

      // Direct pickup check here to ensure it runs
      if (shuttle && shuttle.active) {
        const xDist = Math.abs(shuttle.x - this.greenlandIce.x);
        if (xDist < 500) {
          const dist = Phaser.Math.Distance.Between(
            shuttle.x, shuttle.y,
            this.greenlandIce.x, this.greenlandIce.y - 40
          );
          console.log(`[ICE CHECK] Shuttle(${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}), Ice(${this.greenlandIce.x.toFixed(0)}, ${this.greenlandIce.y.toFixed(0)}), dist=${dist.toFixed(0)}`);

          if (dist < 20 && !this.hasPeaceMedal) {
            console.log(`[ICE] PICKUP! dist=${dist.toFixed(0)}`);
            this.pickupGreenlandIce(shuttle);
          }
        }
      }
    }

    // Update attached Greenland ice graphics
    if (this.hasGreenlandIce) {
      this.updateGreenlandIceGraphics();
    }

    // Clear lastTradedPad when shuttle leaves the pad
    if (this.lastTradedPad) {
      const pad = this.lastTradedPad;
      const shuttle = this.shuttle;
      const halfPadWidth = pad.width / 2;
      const horizontalDistance = Math.abs(shuttle.x - pad.x);
      if (horizontalDistance > halfPadWidth + 20) {
        this.lastTradedPad = null;
      }
    }

    // Update golf cart (patrol and flee from nearest shuttle)
    if (this.golfCart && !this.golfCart.isDestroyed) {
      // Find nearest active shuttle
      const activeShuttles = this.shuttles.filter(s => s.active);
      if (activeShuttles.length > 0) {
        let nearestShuttle = activeShuttles[0];
        let nearestDist = Math.abs(activeShuttles[0].x - this.golfCart.x);
        for (const s of activeShuttles) {
          const dist = Math.abs(s.x - this.golfCart.x);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestShuttle = s;
          }
        }
        this.golfCart.update(this.terrain, nearestShuttle.x, nearestShuttle.y, time);
      }
    }

    // Update biplane (fly across sky) and check shuttle collision
    if (this.biplane && !this.biplane.isDestroyed) {
      this.biplane.update(time, 16); // ~60fps delta

      // Check collision with shuttles - bounce off, don't destroy
      const bounds = this.biplane.getCollisionBounds();
      for (const shuttle of this.shuttles) {
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
            const bounceStrength = 8;
            const normalX = dx / (Math.abs(dx) + Math.abs(dy) + 0.1);
            const normalY = dy / (Math.abs(dx) + Math.abs(dy) + 0.1);

            this.matter.body.setVelocity(body, {
              x: body.velocity.x + normalX * bounceStrength,
              y: body.velocity.y + normalY * bounceStrength - 2, // Slight upward bias
            });

            // Play boing sound for bouncy collision
            this.playBoingSound();
          }
          break;
        }
      }
    }

    // Update Epstein Files (check for pickup)
    this.updateEpsteinFiles();

    // Update Propaganda Banners (check for pickup)
    this.updatePropagandaBanners();

    // Update all shuttles
    for (const shuttle of this.shuttles) {
      if (shuttle.active) {
        shuttle.update(); // Controls are handled internally now
      }
    }

    // Update camera for 2-player mode (follow midpoint between active shuttles)
    if (this.playerCount === 2) {
      const activeShuttles = this.shuttles.filter(s => s.active);
      if (activeShuttles.length === 2) {
        const midX = (activeShuttles[0].x + activeShuttles[1].x) / 2;
        const midY = (activeShuttles[0].y + activeShuttles[1].y) / 2;
        // Smooth camera follow
        const cam = this.cameras.main;
        cam.scrollX += (midX - GAME_WIDTH / 2 - cam.scrollX) * 0.1;
        cam.scrollY += (midY - GAME_HEIGHT / 2 - cam.scrollY) * 0.1;
      } else if (activeShuttles.length === 1) {
        // One shuttle remaining - follow it directly
        const cam = this.cameras.main;
        cam.scrollX += (activeShuttles[0].x - GAME_WIDTH / 2 - cam.scrollX) * 0.1;
        cam.scrollY += (activeShuttles[0].y - GAME_HEIGHT / 2 - cam.scrollY) * 0.1;
      }
    }

    // Handle bomb drop (arrow down for P1, S for P2)
    const p1Bomb = this.cursors.down.isDown && this.shuttle && this.shuttle.active;
    const p2Bomb = this.p2BombKey && this.shuttle2 && this.shuttle2.active && this.p2BombKey.isDown;
    if (p1Bomb && !this.bombCooldown) {
      this.dropBomb(this.shuttle, this.inventorySystem, 1);
      this.bombCooldown = true;
      this.time.delayedCall(300, () => {
        this.bombCooldown = false;
      });
    }
    if (p2Bomb && !this.bombCooldown2) {
      this.dropBomb(this.shuttle2!, this.inventorySystem2!, 2);
      this.bombCooldown2 = true;
      this.time.delayedCall(300, () => {
        this.bombCooldown2 = false;
      });
    }

    // Update bombs
    this.updateBombs();

    // Update peace medal graphics if carrying
    this.updatePeaceMedalGraphics();

    // Update tombstone physics (sync containers to bodies)
    this.updateTombstonePhysics();

    // Update power-up effects
    this.updatePowerUps();

    // Update thrust scorch marks
    this.updateScorchMarks(time);

    // Cull off-screen scorch marks (2 screen widths behind player)
    this.cullOffScreenScorchMarks();

    // Update cannons
    const activeShuttlesForCannons = this.shuttles.filter(s => s.active);
    for (const cannon of this.cannons) {
      const cameraLeft = this.cameras.main.scrollX - 200;
      const cameraRight = this.cameras.main.scrollX + GAME_WIDTH + 200;
      const isOnScreen = cannon.x >= cameraLeft && cannon.x <= cameraRight;
      const hasProjectiles = cannon.getProjectiles().length > 0;

      // Only set target and allow firing if cannon is on-screen, active, AND not bribed
      // Bribed cannons stand down completely - they won't fire new projectiles
      if (isOnScreen && cannon.isActive() && !this.cannonsBribed && activeShuttlesForCannons.length > 0) {
        // Target the nearest shuttle
        let nearestTarget = activeShuttlesForCannons[0];
        let nearestDist = Math.hypot(cannon.x - nearestTarget.x, cannon.y - nearestTarget.y);
        for (const s of activeShuttlesForCannons) {
          const dist = Math.hypot(cannon.x - s.x, cannon.y - s.y);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestTarget = s;
          }
        }
        cannon.setTarget({ x: nearestTarget.x, y: nearestTarget.y });
      } else if (this.cannonsBribed) {
        // Clear target so cannons stop aiming/firing
        cannon.setTarget(null as any);
      }

      // ALWAYS update cannons that have projectiles in flight, even if off-screen
      // This ensures projectiles keep moving after player scrolls away from cannon
      if (isOnScreen || hasProjectiles) {
        cannon.update(time);

        // Check projectile collisions with all shuttles
        for (const projectile of cannon.getProjectiles()) {
          for (const shuttle of activeShuttlesForCannons) {
            const dx = projectile.x - shuttle.x;
            const dy = projectile.y - shuttle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 25) {
              this.handleProjectileHitOnShuttle(projectile.getSpriteKey(), shuttle);
            }
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

    // Update debug monitoring display
    if (this.debugText) {
      const fps = Math.round(this.game.loop.actualFps);
      // Sum chemtrail particles from all shuttles
      let totalChemtrails = 0;
      for (const shuttle of this.shuttles) {
        totalChemtrails += shuttle.getChemtrailParticleCount();
      }
      // Count splash particles
      let splashParticles = 0;
      for (const splash of this.rainSplashes) {
        splashParticles += splash.particles.length;
      }
      // Count graphics objects in scene
      const graphicsCount = this.children.list.filter(c => c.type === 'Graphics').length;
      // Count all scene children
      const totalChildren = this.children.list.length;
      // Count tweens
      const tweenCount = this.tweens.getTweens().length;
      // Count oil spurt graphics from oil towers
      let oilSpurts = 0;
      for (const tower of this.oilTowers) {
        oilSpurts += (tower as any).oilSpurts?.length || 0;
      }
      this.debugText.setText(
        `FPS: ${fps}\n` +
        `Graphics: ${graphicsCount}\n` +
        `Children: ${totalChildren}\n` +
        `Tweens: ${tweenCount}\n` +
        `Rain: ${this.rainDrops.length}\n` +
        `Splashes: ${this.rainSplashes.length}(${splashParticles}p)\n` +
        `SinkScorch: ${this.sinkingScorchParticles.length}\n` +
        `OilSpurts: ${oilSpurts}\n` +
        `Bombs: ${this.bombs.length}`
      );
    }

    // Check for sitting duck (out of fuel on ground)
    this.checkSittingDuck();

    // Check if fell off the bottom
    if (this.shuttle.y > GAME_HEIGHT + 100) {
      this.gameState = 'crashed';
      this.shuttle.stopRocketSound();

      // Track death achievement
      this.achievementSystem.onDeath('void');

      // Spawn tombstone at last known position (bottom of visible area)
      this.spawnTombstone(this.shuttle.x, GAME_HEIGHT, 'void');
      this.transitionToGameOver({
        victory: false,
        message: 'Lost in the void!',
        score: this.destructionScore,
        debugModeUsed: this.shuttle.wasDebugModeUsed(),
        destroyedBuildings: this.destroyedBuildings,
      });
    }
  }

  private restartWithPlayerCount(playerCount: number): void {
    // Stop UI scene
    this.scene.stop('UIScene');
    // Restart game scene with new player count
    this.scene.restart({ playerCount });
  }

  /**
   * Performs auto-trade for 2-player mode without pausing the game.
   * Sells cheapest items to fill up fuel tank.
   */
  private performAutoTrade(
    shuttle: Shuttle,
    inventorySystem: InventorySystem,
    fuelSystem: FuelSystem,
    landingQuality: 'perfect' | 'good' | 'rough',
    playerNum: number
  ): void {
    // Calculate landing bonus based on quality
    const landingBonus = landingQuality === 'perfect' ? 1.5 : landingQuality === 'good' ? 1.25 : 1.0;

    const items = inventorySystem.getAllItems();
    const currentFuel = fuelSystem.getFuel();
    const maxFuel = fuelSystem.getMaxFuel();
    const fuelNeeded = maxFuel - currentFuel;

    if (fuelNeeded <= 0) {
      // Tank is full, show message
      this.showAutoTradeMessage(shuttle, 'TANK FULL!', playerNum);
      return;
    }

    // Get tradeable items (not bombs)
    const tradeableItems = [...items].filter(item =>
      item.count > 0 &&
      (item.fuelValue > 0 || item.isMystery) &&
      !BOMB_DROPPABLE_TYPES.includes(item.type)
    );

    if (tradeableItems.length === 0) {
      this.showAutoTradeMessage(shuttle, 'NO CARGO', playerNum);
      return;
    }

    // Sort by fuel value ascending (cheapest first)
    const sortedAsc = [...tradeableItems].sort((a, b) => {
      if (a.isMystery && !b.isMystery) return 1;
      if (!a.isMystery && b.isMystery) return -1;
      return a.fuelValue - b.fuelValue;
    });

    const casinoChipValues = inventorySystem.getCasinoChipValues();

    // Accumulate from cheapest items until fuel need is met
    const itemsToSell: Map<CollectibleType, number> = new Map();
    let fuelGained = 0;
    let chipIdx = 0;
    let pointsLost = 0;

    for (const item of sortedAsc) {
      if (fuelGained >= fuelNeeded) break;
      let countToSell = 0;
      for (let i = 0; i < item.count; i++) {
        if (fuelGained >= fuelNeeded) break;
        countToSell++;
        if (item.type === 'CASINO_CHIP') {
          const chipValue = casinoChipValues[chipIdx] || 0;
          fuelGained += Math.floor(chipValue * landingBonus);
          pointsLost += chipValue;
          chipIdx++;
        } else {
          fuelGained += Math.floor(item.fuelValue * landingBonus);
          pointsLost += item.fuelValue;
        }
      }
      if (countToSell > 0) {
        itemsToSell.set(item.type, countToSell);
      }
    }

    if (itemsToSell.size === 0) {
      this.showAutoTradeMessage(shuttle, 'NO TRADE', playerNum);
      return;
    }

    // Execute the trade
    for (const [type, count] of itemsToSell) {
      inventorySystem.remove(type, count);
    }

    // Add fuel and track actual amount gained (may be capped)
    const fuelBefore = fuelSystem.getFuel();
    fuelSystem.add(fuelGained);
    const fuelAfter = fuelSystem.getFuel();
    const actualFuelGained = Math.round(fuelAfter - fuelBefore);

    // Check if tank is now full
    const tankFull = fuelAfter >= fuelSystem.getMaxFuel();

    // Deduct score for selling
    if (pointsLost > 0) {
      this.destructionScore -= pointsLost;
      this.events.emit('destructionScore', this.destructionScore);
    }

    // Emit fuel boost event for UI effect
    if (tankFull) {
      this.events.emit('fuelTankFull', playerNum);
    }

    // Show trade message with actual fuel gained
    this.showAutoTradeMessage(shuttle, `+${actualFuelGained} FUEL`, playerNum);
  }

  private showAutoTradeMessage(shuttle: Shuttle, message: string, playerNum: number): void {
    const color = playerNum === 2 ? '#66CCFF' : '#FFD700';
    const tradeText = this.add.text(shuttle.x, shuttle.y - 60, message, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '18px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    tradeText.setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: tradeText,
      y: tradeText.y - 40,
      alpha: 0,
      duration: 1500,
      onComplete: () => tradeText.destroy(),
    });
  }

  // Tombstone system - persistent across game restarts
  private loadTombstones(): void {
    try {
      const saved = localStorage.getItem(GameScene.TOMBSTONE_STORAGE_KEY);
      if (saved) {
        const tombstones: { x: number; y: number; date: string; cause?: CauseOfDeath }[] = JSON.parse(saved);
        // Limit to last 20 tombstones to prevent clutter
        const recent = tombstones.slice(-20);
        for (const ts of recent) {
          // All tombstones have physics so they react to explosions
          this.createTombstoneGraphic(ts.x, ts.y, false, false, ts.cause);
        }
      }
    } catch (e) {
      console.error('Failed to load tombstones:', e);
    }
  }

  private saveTombstone(x: number, y: number, cause?: CauseOfDeath): void {
    try {
      const saved = localStorage.getItem(GameScene.TOMBSTONE_STORAGE_KEY);
      const tombstones: { x: number; y: number; date: string; cause?: CauseOfDeath }[] = saved ? JSON.parse(saved) : [];
      tombstones.push({ x, y, date: new Date().toISOString(), cause });
      // Keep only last 50 tombstones
      const trimmed = tombstones.slice(-50);
      localStorage.setItem(GameScene.TOMBSTONE_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save tombstone:', e);
    }
  }

  private getCauseEmoji(cause?: CauseOfDeath): string {
    // Standard death causes
    switch (cause) {
      case 'water': return '🌊';
      case 'terrain': return '💥';
      case 'landing': return '🛬';
      case 'duck': return '🦆';
      case 'void': return '🌌';
      case 'fuel': return '⛽';
      case 'p1_bombed': return '🟢'; // P1 (green) was bombed
      case 'p2_bombed': return '🔵'; // P2 (blue) was bombed
    }

    // Projectile type emojis
    const projectileEmojis: { [key: string]: string } = {
      'teacup': '🫖',
      'doubledecker': '🚌',
      'blackcab': '🚕',
      'guardhat': '💂',
      'baguette': '🥖',
      'wine': '🍷',
      'croissant': '🥐',
      'pretzel': '🥨',
      'beer': '🍺',
      'pierogi': '🥟',
      'pottery': '🏺',
      'proj_matryoshka': '🪆',
      'balalaika': '🪕',
      'borscht': '🍲',
      'samovar': '🫖',
      'cannonball': '💣',
    };

    if (cause && projectileEmojis[cause]) {
      return projectileEmojis[cause];
    }

    return '💀';
  }

  private createTombstoneGraphic(x: number, y: number, isStatic: boolean = true, isUnderwater: boolean = false, cause?: CauseOfDeath): { container: Phaser.GameObjects.Container; body: MatterJS.BodyType | null } {
    const container = this.add.container(x, y);
    container.setDepth(5); // Above terrain, below shuttle

    // Use darker, bluer colors if underwater
    const stoneColor = isUnderwater ? 0x334455 : 0x555555;
    const edgeColor = isUnderwater ? 0x223344 : 0x333333;
    const crossColor = isUnderwater ? 0x556677 : 0x888888;
    const textColor = isUnderwater ? '#667788' : '#AAAAAA';
    const stoneAlpha = isUnderwater ? 0.6 : 1;
    const textAlpha = isUnderwater ? 0.4 : 1;

    // Tombstone body (rounded rectangle)
    const stone = this.add.graphics();
    stone.fillStyle(stoneColor, stoneAlpha);
    stone.fillRoundedRect(-12, -30, 24, 30, { tl: 8, tr: 8, bl: 2, br: 2 });
    // Darker edge
    stone.lineStyle(2, edgeColor);
    stone.strokeRoundedRect(-12, -30, 24, 30, { tl: 8, tr: 8, bl: 2, br: 2 });

    // Cross on top
    stone.fillStyle(crossColor, stoneAlpha);
    stone.fillRect(-2, -38, 4, 10);
    stone.fillRect(-6, -34, 12, 4);

    // RIP text
    const ripText = this.add.text(0, -18, 'RIP', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '10px',
      color: textColor,
      fontStyle: 'bold',
    });
    ripText.setOrigin(0.5, 0.5);
    ripText.setAlpha(textAlpha);

    // Cause of death emoji below RIP
    const causeEmoji = this.add.text(0, -7, this.getCauseEmoji(cause), {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '9px',
    });
    causeEmoji.setOrigin(0.5, 0.5);
    causeEmoji.setAlpha(textAlpha);

    container.add([stone, ripText, causeEmoji]);
    this.tombstoneGraphics.push(container);

    // Create physics body for dynamic tombstones
    let body: MatterJS.BodyType | null = null;
    if (!isStatic) {
      body = this.matter.add.rectangle(x, y - 15, 24, 38, {
        isStatic: false,
        label: 'tombstone',
        friction: 0.8,
        frictionAir: 0.01,
        restitution: 0.2,
        mass: 2,
        collisionFilter: {
          category: 8, // New category for tombstones
          mask: 1 | 2, // Collide with shuttles (1) and terrain (2)
        },
      });
      this.tombstoneBodies.push(body);

      // Link body to container for syncing
      (body as unknown as { containerRef: Phaser.GameObjects.Container }).containerRef = container;
    }

    return { container, body };
  }

  private spawnTombstone(deathX: number, deathY: number, cause?: CauseOfDeath): void {
    // Check if death occurred in Atlantic Ocean (water)
    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
    const isInWater = deathX >= atlanticStart && deathX < atlanticEnd;

    // Find ground level at death location
    const terrainY = this.terrain.getHeightAt(deathX);

    if (isInWater) {
      // For water deaths, delay the tombstone spawn until after the ship has sunk
      // The tombstone will appear at the sunken position (3.5 seconds matches the ship sinking time)
      const sinkDepth = terrainY + 150; // Sink 150px below water surface

      this.time.delayedCall(3500, () => {
        // Save sunken position to localStorage
        this.saveTombstone(deathX, sinkDepth, cause);

        // Create static tombstone at sunken position with underwater tint
        this.createTombstoneGraphic(deathX, sinkDepth, true, true, cause);
      });
    } else {
      // Normal death - spawn physics tombstone at death location
      // It will fall if in mid-air, and can be knocked around by explosions

      // Save to localStorage (use terrain Y for persistence, body will settle there)
      this.saveTombstone(deathX, terrainY, cause);

      // Create a physics-enabled tombstone that falls
      this.createTombstoneGraphic(deathX, deathY, false, false, cause);
    }
  }

  // Update tombstone graphics to follow their physics bodies
  private updateTombstonePhysics(): void {
    for (const body of this.tombstoneBodies) {
      if (!body) continue;
      const container = (body as unknown as { containerRef: Phaser.GameObjects.Container }).containerRef;
      if (container) {
        container.setPosition(body.position.x, body.position.y + 15); // Offset for center
        container.setRotation(body.angle);
      }
    }
  }

  // Check for tombstones entering water and make them sink with tint effect
  private updateTombstoneSinking(): void {
    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;

    for (let i = this.tombstoneBodies.length - 1; i >= 0; i--) {
      const body = this.tombstoneBodies[i];
      if (!body) continue;

      const container = (body as unknown as { containerRef: Phaser.GameObjects.Container }).containerRef;
      if (!container) continue;

      // Check if tombstone is in the Atlantic Ocean area
      const isInWater = body.position.x >= atlanticStart && body.position.x < atlanticEnd;

      if (isInWater) {
        const waterLevel = this.terrain.getHeightAt(body.position.x);

        // Check if tombstone has entered the water
        if (body.position.y > waterLevel - 20) {
          // Mark as sinking if not already
          const alreadySinking = (body as unknown as { isSinking?: boolean }).isSinking;

          if (!alreadySinking) {
            (body as unknown as { isSinking: boolean }).isSinking = true;

            const splashX = body.position.x;
            const splashY = waterLevel;

            // Remove physics body from world (will sink via tween)
            this.matter.world.remove(body);
            this.tombstoneBodies.splice(i, 1);

            // Start sinking animation with blue tint
            const sinkDepth = waterLevel + 150;

            // Save the new sunken position to localStorage
            this.saveTombstone(splashX, sinkDepth);

            // ============ SPLASH EFFECT ============
            // Only show splash effect if game has been initialized (avoid on load)
            if (this.gameInitialized) {
              // Play splash sound
              this.sound.play('water_splash', { volume: 0.3 });

              // Water droplets - medium sized splash
              for (let d = 0; d < 18; d++) {
                const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
                const speed = 4 + Math.random() * 8;
                const droplet = this.add.graphics();
                droplet.fillStyle(0x4169E1, 0.8);
                droplet.fillCircle(0, 0, 3 + Math.random() * 5);
                droplet.setPosition(splashX + (Math.random() - 0.5) * 25, splashY);
                droplet.setDepth(101);

                this.tweens.add({
                  targets: droplet,
                  x: droplet.x + Math.cos(angle) * speed * 14,
                  y: droplet.y + Math.sin(angle) * speed * 16 + 50,
                  alpha: 0,
                  scale: 0.3,
                  duration: 600 + Math.random() * 400,
                  ease: 'Quad.easeOut',
                  onComplete: () => droplet.destroy(),
                });
              }

              // Splash column - medium height
              for (let c = 0; c < 10; c++) {
                const columnDrop = this.add.graphics();
                columnDrop.fillStyle(0xADD8E6, 0.9);
                columnDrop.fillEllipse(0, 0, 4 + Math.random() * 4, 10 + Math.random() * 8);
                columnDrop.setPosition(splashX + (Math.random() - 0.5) * 25, splashY);
                columnDrop.setDepth(103);

                this.tweens.add({
                  targets: columnDrop,
                  y: splashY - 50 - Math.random() * 60,
                  alpha: 0,
                  scaleY: 2.5,
                  duration: 450 + Math.random() * 300,
                  ease: 'Quad.easeOut',
                  onComplete: () => columnDrop.destroy(),
                });
              }
            }

            // Tween the container down with blue tint effect
            this.tweens.add({
              targets: container,
              y: sinkDepth,
              duration: 3500,
              ease: 'Quad.easeIn',
              onUpdate: (tween) => {
                // Calculate progress and apply blue tint
                const progress = tween.progress;

                // Apply tint to all children in container
                container.each((child: Phaser.GameObjects.GameObject) => {
                  if (child instanceof Phaser.GameObjects.Graphics) {
                    child.setAlpha(1 - progress * 0.5); // Fade slightly
                  } else if (child instanceof Phaser.GameObjects.Text) {
                    child.setAlpha(1 - progress * 0.7); // Fade text more
                  }
                });
              },
            });

            // Also emit some bubbles while sinking
            for (let b = 0; b < 8; b++) {
              this.time.delayedCall(b * 300 + Math.random() * 200, () => {
                const bubble = this.add.circle(
                  container.x + (Math.random() - 0.5) * 20,
                  container.y,
                  3 + Math.random() * 4,
                  0x87CEEB,
                  0.6
                );
                bubble.setDepth(101);

                this.tweens.add({
                  targets: bubble,
                  y: bubble.y - 30 - Math.random() * 30,
                  alpha: 0,
                  duration: 500 + Math.random() * 300,
                  ease: 'Quad.easeOut',
                  onComplete: () => bubble.destroy(),
                });
              });
            }
          }
        }
      }
    }
  }
}
