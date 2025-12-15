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
import { Shark } from '../objects/Shark';
import { GreenlandIce } from '../objects/GreenlandIce';
import { FuelSystem } from '../systems/FuelSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { getAchievementSystem, AchievementSystem } from '../systems/AchievementSystem';
import { getCollectionSystem } from '../systems/CollectionSystem';
import { MusicManager } from '../systems/MusicManager';
import { WeatherManager } from '../managers/WeatherManager';
import { ScorchMarkManager } from '../managers/ScorchMarkManager';
import { TombstoneManager } from '../managers/TombstoneManager';
import { BombManager } from '../managers/BombManager';
import { CarriedItemManager } from '../managers/CarriedItemManager';
import { PowerUpManager } from '../managers/PowerUpManager';
import { PropagandaManager } from '../managers/PropagandaManager';
import { EpsteinFilesManager } from '../managers/EpsteinFilesManager';
import { DogfightManager } from '../managers/DogfightManager';
import { EntityManager } from '../managers/EntityManager';
import { BiplaneManager } from '../managers/BiplaneManager';
import { showDestructionMessage } from '../utils/DisplayUtils';
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
  GameMode,
  DOGFIGHT_CONFIG,
} from '../constants';

type GameState = 'playing' | 'landed' | 'crashed' | 'victory';
type CauseOfDeath = 'water' | 'terrain' | 'landing' | 'duck' | 'void' | 'fuel' | string;

export class GameScene extends Phaser.Scene {
  private shuttle!: Shuttle; // Primary shuttle (P1) - kept for compatibility
  private shuttle2: Shuttle | null = null; // Secondary shuttle (P2)
  private shuttles: Shuttle[] = []; // All active shuttles
  private playerCount: number = 1;
  private gameMode: GameMode = 'normal';
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
  private musicManager!: MusicManager;
  private gameState: GameState = 'playing';
  private starfield!: Phaser.GameObjects.Graphics;
  private currentCountryText!: Phaser.GameObjects.Text;
  private startPadId: number = 1; // Track which pad we started on (NYC is now index 1)
  private invulnerable: boolean = true; // Brief invulnerability at start
  private gameStartTime: number = 0; // Track when game started for timer

  // Power-up manager (bribe cannons, speed boost)
  private powerUpManager!: PowerUpManager;

  // Sitting duck detection
  private sittingDuckStartTime: number = 0;
  private isSittingDuck: boolean = false;

  // Prevent splash sounds during initial load
  private gameInitialized: boolean = false;

  // Bomb system (managed by BombManager)
  private bombManager!: BombManager;

  // Carried items (peace medal, Greenland ice) managed by CarriedItemManager
  private carriedItemManager!: CarriedItemManager;

  // Score/kill tracking (updated by BombManager via callbacks)
  private p1Kills: number = 0;
  private p2Kills: number = 0;
  private destructionScore: number = 0;
  private destroyedBuildings: { name: string; points: number; textureKey?: string; country?: string }[] = [];
  private killAlreadyTracked: boolean = false;

  // Track which player died most recently
  private lastDeadPlayerIndex: number = -1;
  private dogfightPadIndex: number = -1; // Random starting pad for dogfight mode

  // Death messages for 2-player mode
  private p1DeathMessage: string = '';
  private p2DeathMessage: string = '';

  // Fisherboat in Atlantic
  private fisherBoat: FisherBoat | null = null;
  private shuttleOnBoat: boolean = false; // Track if shuttle has landed on boat

  // Sharks in Atlantic
  private sharks: Shark[] = [];
  private sunkenFood: { x: number; y: number; sprite: Phaser.GameObjects.Sprite }[] = [];

  // Greenland ice block (object, state managed by CarriedItemManager)
  private greenlandIce: GreenlandIce | null = null;

  // Landing pad debounce (prevent re-triggering trade after closing)
  private lastLandingTime: number = 0;
  private lastTradedPad: LandingPad | null = null; // Track pad we just traded at

  // Golf cart in USA
  private golfCart: GolfCart | null = null;
  private epsteinFilesManager!: EpsteinFilesManager;

  // Propaganda biplane (managed by BiplaneManager)
  private biplaneManager!: BiplaneManager;
  private propagandaManager!: PropagandaManager;
  private dogfightManager!: DogfightManager;
  private entityManager!: EntityManager;

  // Oil towers at fuel depots
  private oilTowers: OilTower[] = [];

  // Scorch marks and water pollution manager
  private scorchMarkManager!: ScorchMarkManager;

  // Debug monitoring display
  private debugText: Phaser.GameObjects.Text | null = null;

  // FPS tracking for diagnostics
  private fpsMin: number = 60;
  private fpsMax: number = 0;
  private fpsBaseline: number = 0;        // Settled FPS after game stabilizes
  private fpsBaselineSetTime: number = 0; // When baseline was established
  private fpsHistory: number[] = [];      // Rolling history for baseline calculation
  private debrisSprites: Phaser.GameObjects.Sprite[] = [];

  // Tombstone manager
  private tombstoneManager!: TombstoneManager;

  // Achievement system
  private achievementSystem!: AchievementSystem;
  private cannonsDestroyedThisGame: number = 0;

  // Weather system (managed by WeatherManager)
  private weatherManager!: WeatherManager;

  constructor() {
    super({ key: 'GameScene' });
  }

  // Public methods for debris tracking
  public registerDebris(sprite: Phaser.GameObjects.Sprite): void {
    this.debrisSprites.push(sprite);
  }

  public unregisterDebris(sprite: Phaser.GameObjects.Sprite): void {
    const idx = this.debrisSprites.indexOf(sprite);
    if (idx !== -1) this.debrisSprites.splice(idx, 1);
  }

  create(data?: { playerCount?: number; gameMode?: GameMode; p1Kills?: number; p2Kills?: number; dogfightPadIndex?: number }): void {
    this.gameState = 'playing';
    this.gameStartTime = Date.now(); // Use Date.now() for reliable timing across scene restarts
    this.playerCount = data?.playerCount ?? 1;
    this.gameMode = data?.gameMode ?? 'normal';

    // Restore kill counts if continuing dogfight mode
    if (this.gameMode === 'dogfight') {
      this.p1Kills = data?.p1Kills ?? 0;
      this.p2Kills = data?.p2Kills ?? 0;
      // Force 2-player mode for dogfight
      this.playerCount = 2;
      // Use provided pad index or pick a random one (excluding Washington at index 0)
      this.dogfightPadIndex = data?.dogfightPadIndex ?? (1 + Math.floor(Math.random() * (LANDING_PADS.length - 1)));
    } else {
      // Reset kills for normal mode
      this.p1Kills = 0;
      this.p2Kills = 0;
      this.dogfightPadIndex = -1;
    }
    // Reset kill tracking flags
    this.killAlreadyTracked = false;
    this.lastDeadPlayerIndex = -1;

    // Reset all game object arrays (Phaser may reuse scene instances)
    this.landingPads = [];
    this.cannons = [];
    this.collectibles = [];
    this.decorations = [];
    this.medalHouse = null;
    this.oilTowers = [];
    this.debrisSprites = [];
    this.fpsMin = 60;
    this.fpsMax = 0;
    this.fpsBaseline = 0;
    this.fpsBaselineSetTime = 0;
    this.fpsHistory = [];
    this.shuttles = [];
    this.shuttle2 = null;
    this.fuelSystem2 = null;
    this.inventorySystem2 = null;
    this.p2Controls = null;
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

    // Initialize music manager (music starts after shuttle is created)
    this.musicManager = new MusicManager(this);

    // Initialize P2 systems if 2-player mode
    if (this.playerCount === 2) {
      this.fuelSystem2 = new FuelSystem();
      this.inventorySystem2 = new InventorySystem();
    }

    // Create starfield background
    this.createStarfield();

    // Create terrain (including Washington DC area to the left)
    this.terrain = new Terrain(this, WORLD_START_X, WORLD_WIDTH);

    // Initialize weather system
    this.weatherManager = new WeatherManager(this, {
      onLightningStrike: (shuttle: Shuttle) => this.handleElectricalDeath(shuttle),
      getTerrainHeightAt: (x: number) => this.terrain.getHeightAt(x),
    });
    this.weatherManager.initialize();

    // Initialize tombstone manager
    this.tombstoneManager = new TombstoneManager(this, {
      getTerrainHeightAt: (x: number) => this.terrain.getHeightAt(x),
      onAchievementUnlock: (id: string) => this.achievementSystem.unlock(id),
      playSound: (key: string, config?: { volume?: number }) => this.sound.play(key, config),
      isGameInitialized: () => this.gameInitialized,
    });
    this.tombstoneManager.initialize();

    // Initialize scorch mark system (after terrain is created)
    this.scorchMarkManager = new ScorchMarkManager(this, {
      getShuttleThrustInfo: () => ({
        isThrusting: this.shuttle?.getIsThrusting() ?? false,
        position: this.shuttle?.getThrustPosition() ?? { x: 0, y: 0 },
        direction: this.shuttle?.getThrustDirection() ?? { x: 0, y: 1 },
        shuttleX: this.shuttle?.x ?? 0,
      }),
      getTerrainHeightAt: (x: number) => this.terrain.getHeightAt(x),
      getDecorationBounds: () => this.decorations.map(d => d.getCollisionBounds()),
      getLandingPadBounds: () => this.landingPads.map(p => ({ x: p.x, y: p.y, width: p.width, height: 10 })),
      getCameraScrollX: () => this.cameras.main.scrollX,
    });
    this.scorchMarkManager.initialize();

    // Initialize bomb manager
    this.bombManager = new BombManager(this, {
      playSound: (key: string, config?: { volume?: number }) => this.sound.play(key, config),
      playSoundIfNotPlaying: (key: string) => this.playSoundIfNotPlaying(key),
      shakeCamera: (duration: number, intensity: number) => this.cameras.main.shake(duration, intensity),
      getTerrainHeightAt: (x: number) => this.terrain.getHeightAt(x),
      applyExplosionShockwave: (x: number, y: number) => this.applyExplosionShockwave(x, y),
      showDestructionPoints: (x: number, y: number, points: number, name: string) =>
        this.showDestructionPoints(x, y, points, name),
      scorchMarkManager: this.scorchMarkManager,
      onBuildingDestroyed: () => this.achievementSystem.onBuildingDestroyed(),
      onPlayerKill: (killerPlayer: number) => this.achievementSystem.onPlayerKill(killerPlayer),
      onKillScored: (killerPlayer: number) => {
        if (killerPlayer === 1) {
          this.p1Kills++;
        } else {
          this.p2Kills++;
        }
        return { p1Kills: this.p1Kills, p2Kills: this.p2Kills };
      },
      setKillAlreadyTracked: (value: boolean) => { this.killAlreadyTracked = value; },
      addDestructionScore: (points: number) => {
        this.destructionScore += points;
        this.events.emit('destructionScore', this.destructionScore);
      },
      addDestroyedBuilding: (building) => { this.destroyedBuildings.push(building); },
      emitPlayerKill: (killer: number, victim: number, p1Kills: number, p2Kills: number) => {
        this.events.emit('playerKill', { killer, victim, p1Kills, p2Kills });
      },
      handleShuttleCrash: (playerNum: number, message: string, cause: string) =>
        this.handleShuttleCrash(playerNum, message, cause),
      getGameMode: () => this.gameMode,
      getPlayerCount: () => this.playerCount,
      showDogfightWinner: () => this.dogfightManager.showWinner(this.p1Kills, this.p2Kills),
      getKillCounts: () => ({ p1Kills: this.p1Kills, p2Kills: this.p2Kills }),
      addSunkenFood: (foodData) => this.sunkenFood.push(foodData),
      spawnEpsteinFiles: (positions) => this.epsteinFilesManager?.spawnFiles(positions),
      spawnPropagandaBanner: (x, y, propagandaType, message, accentColor) =>
        this.propagandaManager?.spawnBanner(x, y, propagandaType, message, accentColor),
    });
    this.bombManager.initialize();

    // Initialize carried item manager (peace medal, Greenland ice)
    this.carriedItemManager = new CarriedItemManager(this, {
      getGameMode: () => this.gameMode,
    });
    this.carriedItemManager.initialize();

    // Initialize entity manager (sharks, fisher boat, golf cart, greenland ice)
    this.entityManager = new EntityManager(this, {
      getShuttles: () => this.shuttles,
      getSunkenFood: () => this.sunkenFood,
      getBombs: () => this.bombManager.getBombs(),
      removeSunkenFood: (index: number) => this.sunkenFood.splice(index, 1),
      getWaveOffset: () => this.terrain.getWaveOffset(),
      getWaterPollutionLevel: () => this.scorchMarkManager.getWaterPollutionLevel(),
      getCameraBounds: () => ({
        left: this.cameras.main.scrollX - 400,
        right: this.cameras.main.scrollX + GAME_WIDTH + 400,
      }),
      getTerrain: () => this.terrain,
    });
    this.entityManager.initialize(this.gameMode);

    // Set local references to entities (for backward compatibility)
    this.fisherBoat = this.entityManager.getFisherBoat();
    this.sharks = this.entityManager.getSharks();
    this.golfCart = this.entityManager.getGolfCart();
    this.greenlandIce = this.entityManager.getGreenlandIce();

    // Initialize biplane manager (propaganda/info planes)
    this.biplaneManager = new BiplaneManager(this, {
      getShuttles: () => this.shuttles,
      getMatterPhysics: () => this.matter,
      playBoingSound: () => this.playBoingSound(),
    });
    this.biplaneManager.initialize();

    // Create cannons first (so decorations can avoid them)
    this.createCannons();

    // Create country decorations (buildings and landmarks) - skips areas near cannons
    this.createDecorations();

    // Reset score and destroyed buildings
    this.destructionScore = 0;
    this.destroyedBuildings = [];

    // Initialize power-up manager
    this.powerUpManager = new PowerUpManager(this, {
      getShuttle: () => this.shuttle,
      getShuttle2: () => this.shuttle2,
      getTimeNow: () => this.time.now,
      flashCamera: (duration, r, g, b) => this.cameras.main.flash(duration, r, g, b),
    });
    this.powerUpManager.initialize();

    // Initialize propaganda manager (handles dropped banners from biplanes)
    this.propagandaManager = new PropagandaManager(this, {
      getShuttle: () => this.shuttle,
      getTerrainHeightAt: (x) => this.terrain.getHeightAt(x),
      getInventorySystem: () => this.inventorySystem,
      playBoingSound: () => this.playBoingSound(),
    });
    this.propagandaManager.initialize();

    // Initialize Epstein files manager (handles files dropped from golf cart)
    this.epsteinFilesManager = new EpsteinFilesManager(this, {
      getShuttle: () => this.shuttle,
      getTerrainHeightAt: (x) => this.terrain.getHeightAt(x),
      getInventorySystem: () => this.inventorySystem,
      playBoingSound: () => this.playBoingSound(),
    });
    this.epsteinFilesManager.initialize();

    // Initialize dogfight manager (handles dogfight mode specific logic)
    this.dogfightManager = new DogfightManager(this, {
      getShuttles: () => this.shuttles,
      getLandingPads: () => this.landingPads,
      getMusicManager: () => this.musicManager,
      playSound: (key, config) => this.sound.play(key, config),
      setGameState: (state) => { this.gameState = state as GameState; },
      stopUIScene: () => this.scene.stop('UIScene'),
      restartScene: (data) => this.scene.restart(data),
      startMenuScene: () => this.scene.start('MenuScene'),
    });

    // Reset other state
    this.sittingDuckStartTime = 0;
    this.isSittingDuck = false;

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

    // Create shuttle(s) - start landed on a pad
    // In dogfight mode, use the random pad; otherwise use NYC (index 1)
    const startPadIndex = this.gameMode === 'dogfight' ? this.dogfightPadIndex : 1;
    const startPad = this.landingPads[startPadIndex];
    this.startPadId = startPadIndex; // Remember which pad we started on
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

    // In dogfight mode, start with landing gear retracted for combat
    if (this.gameMode === 'dogfight') {
      this.shuttle.retractLandingGear();
      this.shuttle2?.retractLandingGear();
    }

    // Invulnerability at start - prevents crashes until player launches
    this.invulnerable = true;

    // Start background music for starting country (now that shuttle exists)
    const startingCountry = this.getCurrentCountry();
    this.musicManager.startMusic(startingCountry.name);

    // Set up camera - allow space for flying high (especially Switzerland mountains) and Washington to the left
    this.cameras.main.setBounds(WORLD_START_X, -2500, WORLD_WIDTH - WORLD_START_X, GAME_HEIGHT + 2500);
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
    // In dogfight mode, landing gear is automatic - disable manual gear keys
    this.p1Controls = {
      thrust: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      rotateLeft: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      rotateRight: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      gear: this.gameMode !== 'dogfight'
        ? this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        : null as any,
    };
    this.shuttle.setControls(this.p1Controls);

    // Set up P2 controls if 2-player mode
    if (this.playerCount === 2 && this.shuttle2) {
      this.p2Controls = {
        thrust: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        rotateLeft: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        rotateRight: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        gear: this.gameMode !== 'dogfight'
          ? this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)
          : null as any,
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
    const key3 = this.input.keyboard!.addKey(51); // '3' key - Dogfight mode
    key3.on('down', () => {
      this.startDogfightMode();
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
      hasPeaceMedal: () => this.carriedItemManager.getHasPeaceMedal(),
      // P2 data for 2-player mode
      playerCount: this.playerCount,
      fuelSystem2: this.fuelSystem2,
      inventorySystem2: this.inventorySystem2,
      getP2Velocity: () => this.shuttle2?.getVelocity() ?? { x: 0, y: 0, total: 0 },
      getP2LegsExtended: () => this.shuttle2?.areLandingLegsExtended() ?? false,
      isP2Active: () => this.shuttle2?.active ?? false,
      getKillCounts: () => ({ p1Kills: this.p1Kills, p2Kills: this.p2Kills }),
      gameMode: this.gameMode,
    });

    // Show mode announcement for multiplayer modes (only on first round, not restarts)
    const isFirstRound = this.p1Kills === 0 && this.p2Kills === 0;
    if ((this.playerCount === 2 || this.gameMode === 'dogfight') && isFirstRound) {
      this.showModeAnnouncement();
    }

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
        // Enable physics on all shuttles
        this.shuttles.forEach(shuttle => shuttle.setStatic(false));
        // Short delay before enabling collision damage (let players get away from start)
        this.time.delayedCall(800, () => {
          this.invulnerable = false;
          this.gameInitialized = true; // Enable splash sounds after initial load
        });
      }
    };
    this.events.on('update', launchHandler);
    this.currentCountryText.setScrollFactor(0);
    // Removed postFX glow - was causing black screen issues

    // Stop rocket sound and clean up graphics when scene shuts down
    this.events.on('shutdown', () => {
      this.shuttles.forEach(shuttle => shuttle.stopRocketSound());
      // Stop music when scene shuts down
      this.musicManager.stopAll();
      // Clean up weather resources
      if (this.weatherManager) {
        this.weatherManager.destroy();
      }
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


  private handleElectricalDeath(shuttle: Shuttle): void {
    if (this.gameState !== 'playing') return;
    if (shuttle.isDebugMode()) return; // Invulnerable in debug mode

    const playerNum = shuttle === this.shuttle2 ? 2 : 1;
    const vel = shuttle.body?.velocity || { x: 0, y: 0 };
    console.log(`[DEATH] P${playerNum} died: "Struck by lightning!" | Cause: lightning | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)})`);

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
      this.tombstoneManager.spawnTombstone(deathX, deathY, 'lightning');
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

      // Determine the country for this landing pad based on x position
      let padCountry = 'Atlantic Ocean';
      for (const country of COUNTRIES) {
        if (padData.x >= country.startX) {
          padCountry = country.name;
        }
      }

      const pad = new LandingPad(
        this,
        padData.x,
        terrainY,
        padData.width,
        padData.name,
        padCountry,
        isFinal,
        isWashington,
        isOilPlatform
      );
      this.landingPads.push(pad);

      // In dogfight mode, hide the peace medal on Washington pad
      if (isWashington && this.gameMode === 'dogfight') {
        pad.hidePeaceMedal();
      }

      // Create oil tower for fuel depots and oil platform
      const isFuelDepot = !isOilPlatform && (padData.name.includes('Fuel') || padData.name.includes('Gas') || padData.name.includes('Depot') || padData.name.includes('Station'));
      if (isFuelDepot || isOilPlatform) {
        // Use the already determined country name
        const countryName = padCountry;

        // Position tower to the right of landing pad
        const towerX = padData.x + padData.width / 2 + 35;
        const oilTower = new OilTower(this, towerX, terrainY, countryName);
        this.oilTowers.push(oilTower);
      }
    }
  }

  private createCannons(): void {
    // Place cannons based on country cannon density
    for (const country of COUNTRIES) {
      if (country.cannonDensity <= 0) continue;

      const nextCountry = COUNTRIES[COUNTRIES.indexOf(country) + 1];
      const endX = nextCountry ? nextCountry.startX : WORLD_WIDTH;

      // Calculate number of cannons - ensure minimum of 3 so they don't all get filtered by landing pads
      const countryWidth = endX - country.startX;
      const numCannons = Math.max(3, Math.floor(countryWidth * country.cannonDensity / 500));

      for (let i = 0; i < numCannons; i++) {
        // Add some randomization to avoid cannons landing exactly on landing pads
        const baseX = country.startX + (countryWidth / (numCannons + 1)) * (i + 1);
        const randomOffset = (Math.random() - 0.5) * 100; // +/- 50px random offset
        const x = baseX + randomOffset;

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
          this.tombstoneManager.handleBounce(tombstoneBody);
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
          this.tombstoneManager.resetJuggle(tombstoneBody);
        }
      }
    });
  }

  private isShuttleCollision(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType, label: string): boolean {
    // Check if body belongs to shuttle1 or shuttle2 by ID
    const shuttle1BodyId = this.shuttle?.body ? (this.shuttle.body as MatterJS.BodyType).id : -1;
    const shuttle2BodyId = this.shuttle2?.body ? (this.shuttle2.body as MatterJS.BodyType).id : -1;

    const isShuttleA = bodyA.id === shuttle1BodyId || bodyA.id === shuttle2BodyId;
    const isShuttleB = bodyB.id === shuttle1BodyId || bodyB.id === shuttle2BodyId;

    return (isShuttleA && bodyB.label === label) || (isShuttleB && bodyA.label === label);
  }

  private handleTerrainCollision(playerNum: number = 1): void {
    if (this.gameState !== 'playing') return;
    if (this.invulnerable) return; // Ignore collisions during invulnerability

    // Get the correct shuttle
    const shuttle = playerNum === 2 && this.shuttle2 ? this.shuttle2 : this.shuttle;
    if (!shuttle || !shuttle.active) return;

    // Invulnerable in debug mode
    if (shuttle.isDebugMode()) return;

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
      const vel = shuttle.body?.velocity || { x: 0, y: 0 };
      const fuel = playerNum === 2 ? this.fuelSystem2?.getFuel() : this.fuelSystem.getFuel();
      console.log(`[DEATH] P${playerNum} died: "Splashed into the Atlantic!" | Cause: water | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${fuel?.toFixed(1) ?? 'N/A'}`);

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
      this.tombstoneManager.spawnTombstone(shuttle.x, shuttle.y, 'water');

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
      return;
    }

    // Check if out of fuel - special cause and message
    const fuelSys = playerNum === 2 && this.fuelSystem2 ? this.fuelSystem2 : this.fuelSystem;
    const outOfFuel = fuelSys.isEmpty();
    const cause: CauseOfDeath = outOfFuel ? 'fuel' : 'terrain';
    const message = outOfFuel ? 'Ran out of fuel!' : 'Crashed into terrain!';

    const vel = shuttle.body?.velocity || { x: 0, y: 0 };
    const fuel = playerNum === 2 ? this.fuelSystem2?.getFuel() : this.fuelSystem.getFuel();
    console.log(`[DEATH] P${playerNum} died: "${message}" | Cause: ${cause} | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${fuel?.toFixed(1) ?? 'N/A'} | TerrainHeight: ${terrainHeight.toFixed(1)}`);

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
    this.tombstoneManager.spawnTombstone(shuttle.x, shuttle.y, cause);

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
    if (shuttle.isDebugMode()) return; // Invulnerable in debug mode

    const velocity = shuttle.getVelocity();
    const WALL_CRASH_VELOCITY = 6.0; // Crash threshold for wall impact

    if (velocity.total < WALL_CRASH_VELOCITY) {
      // Bounce off the wall - physics engine handles it
      console.log(`Wall bounce P${playerNum} at velocity:`, velocity.total.toFixed(2));
      return;
    }

    const vel = shuttle.body?.velocity || { x: 0, y: 0 };
    const fuel = playerNum === 2 ? this.fuelSystem2?.getFuel() : this.fuelSystem.getFuel();
    console.log(`[DEATH] P${playerNum} died: "Crashed into the wall!" | Cause: terrain | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${fuel?.toFixed(1) ?? 'N/A'}`);

    // In 2-player mode, only destroy this shuttle
    if (this.playerCount === 2) {
      this.handleShuttleCrash(playerNum, 'Crashed into the wall!', 'terrain');
      return;
    }

    this.gameState = 'crashed';
    shuttle.stopRocketSound();

    this.achievementSystem.onDeath('terrain');
    this.tombstoneManager.spawnTombstone(shuttle.x, shuttle.y, 'terrain');

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
    this.carriedItemManager.sinkMedalWithShuttle(targetShuttle, waterLevel);

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

    const landingResult = shuttle.checkLandingSafety();

    if (!landingResult.safe && !shuttle.isDebugMode()) {
      const vel = shuttle.body?.velocity || { x: 0, y: 0 };
      const fuel = playerNum === 2 ? this.fuelSystem2?.getFuel() : this.fuelSystem.getFuel();
      console.log(`[DEATH] P${playerNum} died: "Crash landing! ${landingResult.reason}" | Cause: landing | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${fuel?.toFixed(1) ?? 'N/A'} | Pad: ${pad.name}`);

      // In 2-player mode, only destroy this shuttle
      if (this.playerCount === 2) {
        this.handleShuttleCrash(playerNum, `Crash landing! ${landingResult.reason}`, 'landing');
        return;
      }

      this.gameState = 'crashed';
      shuttle.stopRocketSound();

      // Spawn tombstone at crash landing location
      this.tombstoneManager.spawnTombstone(shuttle.x, shuttle.y, 'landing');

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

    // Track country visit for World Traveller achievement (only on landing, not passing through)
    if (pad.country) {
      this.achievementSystem.onCountryVisited(pad.country);
    }

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

    if (pad.isFinalDestination && this.gameMode !== 'dogfight') {
      // Victory! (disabled in dogfight mode - only kills count)
      const elapsedTime = this.getElapsedTime();
      const inventory = this.inventorySystem.getAllItems();

      // Add peace medal bonus to score (5000 points!)
      if (this.carriedItemManager.getHasPeaceMedal()) {
        this.destructionScore += 5000;
        this.events.emit('destructionScore', this.destructionScore);
      }

      // Add Greenland ice bonus if carrying (2500 points!)
      if (this.carriedItemManager.getHasGreenlandIce()) {
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
        this.carriedItemManager.dropGreenlandIce();
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
      const hasMedal = this.carriedItemManager.getHasPeaceMedal();
      const victoryMessage = hasMedal
        ? putinoPhrases[Math.floor(Math.random() * putinoPhrases.length)]
        : '"Ah, my friend! Putino is happy to see you, but... something is missing, da?"';

      // Check if debug mode was used (disqualifies from high score)
      const debugModeUsed = this.shuttle.wasDebugModeUsed();

      // Track victory achievements
      this.achievementSystem.onVictory(hasMedal, this.destroyedBuildings.length);

      this.time.delayedCall(1500, () => {
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.start('GameOverScene', {
          victory: true,
          message: victoryMessage,
          elapsedTime: elapsedTime,
          inventory: inventory,
          fuelRemaining: this.fuelSystem.getFuel(),
          hasPeaceMedal: hasMedal,
          score: this.destructionScore,
          debugModeUsed: debugModeUsed,
          destroyedBuildings: this.destroyedBuildings,
        });
      });
    } else if (pad.isWashington && this.carriedItemManager.getHasGreenlandIce()) {
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
      this.carriedItemManager.dropGreenlandIce();

      // Also pick up the Peace Medal if not already carried (delayed message)
      if (!this.carriedItemManager.getHasPeaceMedal()) {
        pad.hidePeaceMedal();
        this.carriedItemManager.pickupPeaceMedal(shuttle, true, 500);
      } else {
        shuttle.setMass(5); // Reset to normal mass (no medal)
      }

      // Auto-trade
      const invSys = playerNum === 2 && this.inventorySystem2 ? this.inventorySystem2 : this.inventorySystem;
      const fuelSys = playerNum === 2 && this.fuelSystem2 ? this.fuelSystem2 : this.fuelSystem;
      const quality = landingResult.quality as 'perfect' | 'good' | 'rough';
      this.performAutoTrade(shuttle, invSys, fuelSys, quality, playerNum);
      this.gameState = 'playing';
    } else if (pad.isWashington && !this.carriedItemManager.getHasPeaceMedal() && this.gameMode !== 'dogfight') {
      // Pick up the Peace Medal at Washington! (not in dogfight mode)
      pad.hidePeaceMedal();
      this.carriedItemManager.pickupPeaceMedal(shuttle);

      // Auto-trade
      const invSys = playerNum === 2 && this.inventorySystem2 ? this.inventorySystem2 : this.inventorySystem;
      const fuelSys = playerNum === 2 && this.fuelSystem2 ? this.fuelSystem2 : this.fuelSystem;
      const quality = landingResult.quality as 'perfect' | 'good' | 'rough';
      this.performAutoTrade(shuttle, invSys, fuelSys, quality, playerNum);
      this.gameState = 'playing';
    } else {
      // Auto-trade
      const invSys = playerNum === 2 && this.inventorySystem2 ? this.inventorySystem2 : this.inventorySystem;
      const fuelSys = playerNum === 2 && this.fuelSystem2 ? this.fuelSystem2 : this.fuelSystem;
      const quality = landingResult.quality as 'perfect' | 'good' | 'rough';
      this.performAutoTrade(shuttle, invSys, fuelSys, quality, playerNum);
      this.gameState = 'playing';
    }
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
      const vel = shuttle.body?.velocity || { x: 0, y: 0 };
      const fuel = playerNum === 2 ? this.fuelSystem2?.getFuel() : this.fuelSystem.getFuel();
      console.log(`[DEATH] P${playerNum} died: "Crash landing on boat! ${landingResult.reason}" | Cause: landing | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${fuel?.toFixed(1) ?? 'N/A'}`);

      if (this.playerCount === 2) {
        this.handleShuttleCrash(playerNum, `Crash landing on boat! ${landingResult.reason}`, 'landing');
        return;
      }

      this.gameState = 'crashed';
      shuttle.stopRocketSound();
      this.tombstoneManager.spawnTombstone(shuttle.x, shuttle.y, 'landing');
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

      // Track in collection
      const collectionSystem = getCollectionSystem();
      collectionSystem.markDiscovered('FISH_PACKAGE');

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

    // Track which player died (0-based index) for dogfight kill tracking
    this.lastDeadPlayerIndex = playerNum - 1;

    // Detailed death logging
    const fuelSystem = playerNum === 2 ? this.fuelSystem2 : this.fuelSystem;
    const vel = shuttle.body?.velocity || { x: 0, y: 0 };
    console.log(`[DEATH] P${playerNum} died: "${message}" | Cause: ${cause} | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${fuelSystem?.getFuel().toFixed(1) ?? 'N/A'}`);

    // Store death message for this player
    if (playerNum === 1) {
      this.p1DeathMessage = message;
    } else {
      this.p2DeathMessage = message;
    }

    // Track death achievement
    this.achievementSystem.onDeath(cause);

    // Spawn tombstone at crash location
    this.tombstoneManager.spawnTombstone(shuttle.x, shuttle.y, cause);

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

    // In dogfight mode, any death triggers quick restart (unless winner reached 10 kills)
    if (this.gameMode === 'dogfight') {
      // Award kill to the opponent of the player who died
      // But skip if kill was already tracked (e.g., from bomb hit)
      if (this.lastDeadPlayerIndex >= 0 && !this.killAlreadyTracked) {
        // The opponent of the dead player gets the kill
        // lastDeadPlayerIndex: 0 = P1 died, so P2 gets kill
        // lastDeadPlayerIndex: 1 = P2 died, so P1 gets kill
        if (this.lastDeadPlayerIndex === 0) {
          this.p2Kills++;  // P1 died, P2 gets the kill
          console.log('Kill awarded to P2 (blue) - P1 died');
        } else {
          this.p1Kills++;  // P2 died, P1 gets the kill
          console.log('Kill awarded to P1 (white) - P2 died');
        }
      }
      // Reset flags for next death
      this.killAlreadyTracked = false;
      this.lastDeadPlayerIndex = -1;
      // If both dead, no kill awarded

      // Check for winner
      if (this.dogfightManager.checkForWinner(this.p1Kills, this.p2Kills)) {
        this.dogfightManager.showWinner(this.p1Kills, this.p2Kills);
        return;
      }
      // Quick restart for any death
      this.dogfightManager.quickRestart(this.p1Kills, this.p2Kills);
      return;
    }

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
    if (shuttle.isDebugMode()) return; // Invulnerable in debug mode
    // Note: Bribed cannons stand down and don't fire, but existing projectiles can still hit!

    const playerIndex = shuttle.getPlayerIndex(); // 0-based
    const playerNum = playerIndex + 1; // 1-based for display/messages

    // Track which player died for dogfight kill tracking
    this.lastDeadPlayerIndex = playerIndex;
    console.log('CRASH: Hit by projectile at', { x: shuttle.x, y: shuttle.y }, 'player:', playerNum, 'type:', projectileSpriteKey);

    // Generate and store death message
    const message = this.getProjectileDeathMessage(projectileSpriteKey);
    if (playerNum === 1) {
      this.p1DeathMessage = message;
    } else {
      this.p2DeathMessage = message;
    }

    // Spawn tombstone at crash location with projectile type as cause
    this.tombstoneManager.spawnTombstone(shuttle.x, shuttle.y, projectileSpriteKey || 'cannonball');

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

    // Track item discovery in collection (for both players)
    const collectionSystem = getCollectionSystem();
    collectionSystem.markDiscovered(collectible.collectibleType);

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
      this.powerUpManager.activateBribeCannons();
    } else if (collectible.special === 'speed_boost') {
      this.powerUpManager.activateSpeedBoost(playerNum);
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


  private showDestructionPoints(x: number, y: number, points: number, name: string): void {
    showDestructionMessage({
      scene: this,
      x, y, points, name,
      nameColor: '#FF6600',
      nameFontSize: '16px',
      pointsFontSize: '24px',
      duration: 3500,
      delay: 500,
      floatDistance: 80,
    });
    this.events.emit('destructionScore', this.destructionScore);
  }

  private showFisherBoatDestroyed(x: number, y: number, points: number): void {
    showDestructionMessage({
      scene: this,
      x, y, points,
      name: 'Drug Kingpin dinghy destroyed!',
      nameColor: '#FF4500',
      nameFontSize: '20px',
      pointsFontSize: '28px',
      duration: 4000,
      delay: 800,
      floatDistance: 100,
    });
    this.events.emit('destructionScore', this.destructionScore);
  }

  private showGolfCartDestroyed(x: number, y: number, points: number): void {
    showDestructionMessage({
      scene: this,
      x, y, points,
      name: 'Presidential Getaway destroyed!',
      nameColor: '#FF4500',
      nameFontSize: '20px',
      pointsFontSize: '28px',
      duration: 4000,
      delay: 800,
      floatDistance: 100,
    });
    this.events.emit('destructionScore', this.destructionScore);
  }

  private showBiplaneDestroyed(x: number, y: number, points: number, country: string): void {
    const displayName = country === 'GAME_INFO' ? 'Info plane' : `${country} propaganda plane`;
    showDestructionMessage({
      scene: this,
      x, y, points,
      name: `${displayName} shot down!`,
      nameColor: '#FF4500',
      nameFontSize: '20px',
      pointsFontSize: '28px',
      duration: 4000,
      delay: 1000,
      floatDistance: 100,
      extraText: 'RED BARON!',
      extraTextColor: '#C0C0C0',
    });
    this.events.emit('destructionScore', this.destructionScore);
  }

  // Transition to game over with 3 second delay and 1 second fade out
  private transitionToGameOver(data: {
    victory: boolean;
    message: string;
    score: number;
    debugModeUsed: boolean;
    destroyedBuildings: { name: string; points: number; textureKey?: string; country?: string }[];
    noShake?: boolean;
  }): void {
    // Fade out music during game over transition
    this.musicManager.fadeOutAndStop(2000);

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
    for (const body of this.tombstoneManager.getBodies()) {
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

    const vel = this.shuttle.body?.velocity || { x: 0, y: 0 };
    console.log(`[DEATH] P1 died: "Sitting duck" | Cause: duck | Position: (${this.shuttle.x.toFixed(0)}, ${this.shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${this.fuelSystem.getFuel().toFixed(1)}`);

    this.gameState = 'crashed';
    this.shuttle.stopRocketSound();

    // Track death achievement
    this.achievementSystem.onDeath('duck');

    // Spawn tombstone at crash location
    this.tombstoneManager.spawnTombstone(this.shuttle.x, this.shuttle.y, 'duck');

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

    // Check projectile collisions with buildings/landmarks
    for (const { projectile } of allProjectiles) {
      if (toDestroy.has(projectile)) continue;

      for (const decoration of this.decorations) {
        if (decoration.isDestroyed || !decoration.visible) continue;

        // Quick horizontal distance check
        if (Math.abs(projectile.x - decoration.x) > 150) continue;

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
    this.terrain.update(this.scorchMarkManager.getWaterPollutionLevel());

    // Update scorch marks and water pollution - always
    this.scorchMarkManager.update(time);

    // Update tombstones (physics sync and sinking) - always
    this.tombstoneManager.update();

    // Stop here if not playing
    if (this.gameState !== 'playing') return;

    // Check for shuttles flying out of bounds (into the void)
    this.checkOutOfBounds();

    // Update weather system (clouds, rain, lightning, wind)
    this.weatherManager.update(time, this.shuttles);

    // Get wind strength for physics and flags
    const windStrength = this.weatherManager.getWindStrength();

    // Update landing pad flags with wind
    for (const pad of this.landingPads) {
      pad.updateWind(windStrength);
    }

    // Apply wind force to shuttles (only when airborne)
    const WIND_FORCE = 0.0015; // About 25% of THRUST_POWER (0.006)
    for (const shuttle of this.shuttles) {
      if (shuttle.active) {
        const matterBody = shuttle.body as MatterJS.BodyType;
        if (matterBody) {
          // Don't apply wind when grounded (very low velocity = landed)
          const velocity = shuttle.getVelocity();
          if (velocity.total > 0.5) { // Only apply wind when moving
            const windForceX = windStrength * WIND_FORCE;
            this.matter.body.applyForce(matterBody, matterBody.position, { x: windForceX, y: 0 });
          }
        }
      }
    }

    // Auto landing gear in dogfight mode
    if (this.gameMode === 'dogfight') {
      this.dogfightManager.updateAutoLandingGear();
    }

    // Country visits are now tracked on successful landing, not just passing through
    const currentCountry = this.getCurrentCountry();

    // Check for reaching Russia in heavy rain
    if (currentCountry.name === 'Russia' && this.weatherManager.getRainIntensity() === 'heavy') {
      this.achievementSystem.unlock('singing_in_the_rain');
    }

    // Update biplane (spawning, movement, shuttle collision)
    this.biplaneManager.update(time);

    // Update entities (fisher boat, sharks, golf cart)
    this.entityManager.update(time);

    // Update Greenland ice
    const shuttle = this.shuttle;

    if (this.greenlandIce && !this.greenlandIce.isDestroyed && !this.carriedItemManager.getHasGreenlandIce()) {
      this.greenlandIce.update(this.terrain.getWaveOffset());

      // Check if shuttle can pick up ice
      if (shuttle && shuttle.active) {
        this.carriedItemManager.checkGreenlandIcePickup(shuttle, this.greenlandIce);
      }
    }

    // Update attached Greenland ice graphics
    if (this.carriedItemManager.getHasGreenlandIce()) {
      this.carriedItemManager.updateGreenlandIceGraphics();
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

    // Update Epstein Files (check for pickup)
    this.epsteinFilesManager.update();

    // Update Propaganda Banners (check for pickup)
    this.propagandaManager.update();

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
    if (p1Bomb && this.bombManager.canDropBomb(1)) {
      this.bombManager.dropBomb(this.shuttle, this.inventorySystem, 1);
      this.bombManager.startCooldown(1);
    }
    if (p2Bomb && this.bombManager.canDropBomb(2)) {
      this.bombManager.dropBomb(this.shuttle2!, this.inventorySystem2!, 2);
      this.bombManager.startCooldown(2);
    }

    // Update bombs
    this.bombManager.update(
      this.shuttle,
      this.shuttle2,
      this.decorations,
      this.cannons,
      this.landingPads,
      this.biplaneManager.getBiplanes(),
      this.golfCart,
      this.fisherBoat,
      this.oilTowers,
      this.greenlandIce,
      this.sharks
    );

    // Update peace medal graphics if carrying
    this.carriedItemManager.updatePeaceMedalGraphics();

    // Update power-up effects
    this.powerUpManager.update();

    // Update cannons
    const activeShuttlesForCannons = this.shuttles.filter(s => s.active);
    for (const cannon of this.cannons) {
      const cameraLeft = this.cameras.main.scrollX - 200;
      const cameraRight = this.cameras.main.scrollX + GAME_WIDTH + 200;
      const isOnScreen = cannon.x >= cameraLeft && cannon.x <= cameraRight;
      const hasProjectiles = cannon.getProjectiles().length > 0;

      // Only set target and allow firing if cannon is on-screen, active, AND not bribed
      // Bribed cannons stand down completely - they won't fire new projectiles
      if (isOnScreen && cannon.isActive() && !this.powerUpManager.isCannonsBribed() && activeShuttlesForCannons.length > 0) {
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
      } else if (this.powerUpManager.isCannonsBribed()) {
        // Clear target so cannons stop aiming/firing
        cannon.setTarget(null as any);
      }

      // ALWAYS update cannons that have projectiles in flight, even if off-screen
      // This ensures projectiles keep moving after player scrolls away from cannon
      if (isOnScreen || hasProjectiles) {
        cannon.update(time, this.weatherManager.getWindStrength());

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

    // Update music (handles crossfade on country change)
    this.musicManager.update(country.name);

    // Check for out of fuel while in air
    if (this.fuelSystem.isEmpty() && this.shuttle.body!.velocity.y > 0.5) {
      // Show warning (handled in UI)
    }

    // Update debug monitoring display
    if (this.debugText) {
      const fps = Math.round(this.game.loop.actualFps);
      const now = Date.now();
      const gameTime = now - this.gameStartTime;

      // Establish FPS baseline after 20 seconds of gameplay (letting FPS fully settle)
      if (fps > 0) {
        if (this.fpsBaseline === 0) {
          // Collect FPS samples during calibration period
          this.fpsHistory.push(fps);
          // Keep only last 120 samples (about 2 seconds of data at 60fps)
          if (this.fpsHistory.length > 120) {
            this.fpsHistory.shift();
          }
          if (gameTime > 10000 && this.fpsHistory.length >= 60) {
            // Calculate baseline as average of last 60 samples (settled FPS)
            const samples = this.fpsHistory.slice(-60);
            this.fpsBaseline = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
            this.fpsBaselineSetTime = now;
            this.fpsMin = this.fpsBaseline; // Reset min to baseline
            this.fpsMax = this.fpsBaseline; // Reset max to baseline
            console.log(`[PERF] Baseline FPS established: ${this.fpsBaseline} (after 10s settle time)`);
          }
        } else {
          // Track min/max relative to baseline
          if (fps < this.fpsMin) {
            const drop = this.fpsBaseline - fps;
            this.fpsMin = fps;
            if (drop >= 5) { // Only log significant drops (5+ FPS below baseline)
              console.log(`[PERF] FPS dropped to ${fps} (${drop} below baseline). Debris:${this.debrisSprites.length} Children:${this.children.list.length}`);
            }
          }
          if (fps > this.fpsMax) this.fpsMax = fps;
        }
      }

      // Count particles from all particle emitters
      let particleCount = 0;
      this.children.list.forEach(child => {
        if (child.type === 'ParticleEmitter') {
          particleCount += (child as Phaser.GameObjects.Particles.ParticleEmitter).getAliveParticleCount();
        }
      });

      // Count textures in memory
      const textureCount = Object.keys(this.textures.list).length;

      // Count pending time events (Phaser stores them in _pendingInsertion and _active)
      const timeEventCount = (this.time as any)._pendingInsertion?.length + (this.time as any)._active?.length || 0;

      // Sum chemtrail particles from all shuttles
      let totalChemtrails = 0;
      for (const shuttle of this.shuttles) {
        totalChemtrails += shuttle.getChemtrailParticleCount();
      }
      // Count splash particles
      const splashParticles = this.weatherManager.getSplashParticleCount();
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

      // Log detailed graphics breakdown every 5 seconds
      if (Math.floor(gameTime / 5000) !== Math.floor((gameTime - this.game.loop.delta) / 5000)) {
        // Count graphics by depth to identify what they are
        const depthCounts: Record<number, number> = {};
        const graphicsList = this.children.list.filter(c => c.type === 'Graphics') as Phaser.GameObjects.Graphics[];
        graphicsList.forEach(g => {
          const depth = g.depth;
          depthCounts[depth] = (depthCounts[depth] || 0) + 1;
        });

        // Show depths with count >= 2 (the important ones)
        const bigGroups = Object.entries(depthCounts)
          .filter(([, c]) => c >= 2)
          .sort((a, b) => Number(b[1]) - Number(a[1])) // sort by count desc
          .map(([d, c]) => `d${d}:${c}`)
          .join(' ');

        // Count by known depths (from code inspection)
        const sceneGraphics = graphicsList.filter(g => g.depth < 0).length; // negative depths = scene-level
        const objectGraphics = graphicsList.filter(g => g.depth >= 0 && g.depth < 100).length; // normal objects
        const uiGraphics = graphicsList.filter(g => g.depth >= 100).length; // UI layer

        console.log(`[GFX] Total:${graphicsCount} Scene:${sceneGraphics} Objects:${objectGraphics} UI:${uiGraphics} | Big groups: ${bigGroups}`);
        console.log(`[GFX EXPECTED] Pads:${this.landingPads.length}×2=${this.landingPads.length * 2} Cannons:${this.cannons.length}×3=${this.cannons.length * 3} Sharks:${this.sharks.length} Oil:${this.oilTowers.length}`);
      }

      // Show baseline status in display
      const baselineStr = this.fpsBaseline > 0
        ? `base:${this.fpsBaseline}`
        : `calibrating ${Math.max(0, Math.ceil((10000 - gameTime) / 1000))}s...`;

      this.debugText.setText(
        `FPS: ${fps} (${baselineStr} min:${this.fpsMin})\n` +
        `Particles: ${particleCount}\n` +
        `Debris: ${this.debrisSprites.length}\n` +
        `Textures: ${textureCount}\n` +
        `TimeEvents: ${timeEventCount}\n` +
        `Graphics: ${graphicsCount}\n` +
        `Children: ${totalChildren}\n` +
        `Tweens: ${tweenCount}\n` +
        `Bombs: ${this.bombManager.getBombCount()}`
      );
    }

    // Check for sitting duck (out of fuel on ground)
    this.checkSittingDuck();

    // Check if fell off the bottom
    if (this.shuttle.y > GAME_HEIGHT + 100) {
      const vel = this.shuttle.body?.velocity || { x: 0, y: 0 };
      console.log(`[DEATH] P1 died: "Lost in the void!" | Cause: void | Position: (${this.shuttle.x.toFixed(0)}, ${this.shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${this.fuelSystem.getFuel().toFixed(1)}`);

      this.gameState = 'crashed';
      this.shuttle.stopRocketSound();

      // Track death achievement
      this.achievementSystem.onDeath('void');

      // Spawn tombstone at last known position (bottom of visible area)
      this.tombstoneManager.spawnTombstone(this.shuttle.x, GAME_HEIGHT, 'void');
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
    // Restart game scene with new player count (exit dogfight if active)
    this.scene.restart({ playerCount, gameMode: 'normal' });
  }

  private startDogfightMode(): void {
    // Stop UI scene
    this.scene.stop('UIScene');
    // Start dogfight mode - reset kills for fresh match
    this.scene.restart({
      playerCount: 2,
      gameMode: 'dogfight',
      p1Kills: 0,
      p2Kills: 0
    });
  }

  // Show mode announcement at game start
  private showModeAnnouncement(): void {
    const modeText = this.gameMode === 'dogfight' ? 'DOGFIGHT MODE' : '2 PLAYER MODE';
    const modeColor = this.gameMode === 'dogfight' ? '#FF4444' : '#44AAFF';

    // Main mode text only
    const mainText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, modeText, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '64px',
      color: modeColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    mainText.setOrigin(0.5, 0.5);
    mainText.setScrollFactor(0);
    mainText.setDepth(2001);

    // Scale in animation
    mainText.setScale(0);

    this.tweens.add({
      targets: mainText,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Fade out after 1.5 seconds
    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: mainText,
        alpha: 0,
        scale: 1.2,
        duration: 400,
        onComplete: () => {
          mainText.destroy();
        },
      });
    });
  }

  // Check if shuttles have flown out of bounds and kill them
  private checkOutOfBounds(): void {
    // Don't check during invulnerability period (spawn protection)
    if (this.invulnerable) return;

    const VOID_LEFT = WORLD_START_X - 200;  // Too far left
    const VOID_RIGHT = WORLD_WIDTH + 200;   // Too far right

    for (const shuttle of this.shuttles) {
      if (!shuttle.active) continue;

      // Only kill for flying too far left or right - flying high is allowed
      const isOutOfBounds =
        shuttle.x < VOID_LEFT ||
        shuttle.x > VOID_RIGHT;

      if (isOutOfBounds) {
        const playerIndex = shuttle.getPlayerIndex(); // 0-based
        const playerNum = playerIndex + 1; // 1-based for display
        const reason = shuttle.x < VOID_LEFT ? `TOO FAR LEFT (x=${shuttle.x.toFixed(0)} < ${VOID_LEFT})` :
                       `TOO FAR RIGHT (x=${shuttle.x.toFixed(0)} > ${VOID_RIGHT})`;
        console.log(`[DEATH] P${playerNum} died: "Lost in the void!" | Cause: void | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}) | Reason: ${reason}`);

        // Track which player died for kill tracking
        this.lastDeadPlayerIndex = playerIndex;

        // Set death message
        if (playerNum === 1) {
          this.p1DeathMessage = 'Lost in the void!';
        } else {
          this.p2DeathMessage = 'Lost in the void!';
        }

        // Kill the shuttle
        shuttle.explode();
        this.checkGameOverAfterCrash();
      }
    }
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

    // Build sold items string
    const soldParts: string[] = [];
    for (const [type, count] of itemsToSell) {
      const itemData = COLLECTIBLE_TYPES[type];
      const shortName = itemData?.name || type;
      soldParts.push(`${count} ${shortName}`);
    }
    const soldStr = soldParts.join(', ');

    // Show trade message with fuel gained and items sold
    this.showAutoTradeMessage(shuttle, `+${actualFuelGained} FUEL\nSold: ${soldStr}`, playerNum);
  }

  private showAutoTradeMessage(shuttle: Shuttle, message: string, playerNum: number): void {
    const color = playerNum === 2 ? '#66CCFF' : '#FFD700';
    const isMultiline = message.includes('\n');
    const tradeText = this.add.text(shuttle.x, shuttle.y - 60, message, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: isMultiline ? '14px' : '18px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
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
}
