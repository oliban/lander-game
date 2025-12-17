import Phaser from 'phaser';
import { Shuttle, ShuttleControls } from '../objects/Shuttle';
import { Terrain } from '../objects/Terrain';
import { LandingPad } from '../objects/LandingPad';
import { Cannon } from '../objects/Cannon';
import { Collectible, spawnCollectibles, CollectibleType } from '../objects/Collectible';
import { CountryDecoration } from '../objects/CountryDecoration';
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
import { PlayerState } from '../systems/PlayerState';
import { PerformanceSettings } from '../systems/PerformanceSettings';
import { AudioSettings } from '../systems/AudioSettings';
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
import { ProjectileCollisionManager } from '../managers/ProjectileCollisionManager';
import { SittingDuckManager } from '../managers/SittingDuckManager';
import { CollisionManager } from '../managers/CollisionManager';
import { LandingPadManager } from '../managers/LandingPadManager';
import { CannonManager } from '../managers/CannonManager';
import { DecorationManager } from '../managers/DecorationManager';
import { showDestructionMessage, formatDollarValue } from '../utils/DisplayUtils';
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
  SHOW_DEBUG_INFO,
} from '../constants';

type GameState = 'playing' | 'landed' | 'crashed' | 'victory';
type CauseOfDeath = 'water' | 'terrain' | 'landing' | 'duck' | 'void' | 'fuel' | string;

export class GameScene extends Phaser.Scene {
  private shuttle!: Shuttle; // Primary shuttle (P1) - kept for compatibility
  private shuttle2: Shuttle | null = null; // Secondary shuttle (P2)
  private shuttles: Shuttle[] = []; // All active shuttles
  private players: PlayerState[] = []; // Consolidated player state (P1 at index 0, P2 at index 1)
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
  private altitudeOverlay!: Phaser.GameObjects.Graphics;
  private speedTrailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  // sonicBoomTriggered moved to PlayerState for per-player tracking
  private cloudLayers: Phaser.GameObjects.Container[] = [];
  private currentCountryText!: Phaser.GameObjects.Text;
  private startPadId: number = 1; // Track which pad we started on (NYC is now index 1)
  private invulnerable: boolean = true; // Brief invulnerability at start
  private gameStartTime: number = 0; // Track when game started for timer

  // Power-up manager (bribe cannons, speed boost)
  private powerUpManager!: PowerUpManager;

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
  private lastDeathCause: string | undefined = undefined; // Track cause of death for game over screen
  private playedHighAltitudeSound: boolean = false; // Track if "I can see my house" sound played this life
  private dogfightPadIndex: number = -1; // Random starting pad for dogfight mode

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
  private projectileCollisionManager!: ProjectileCollisionManager;
  private sittingDuckManager!: SittingDuckManager;
  private collisionManager!: CollisionManager;
  private landingPadManager!: LandingPadManager;
  private cannonManager!: CannonManager;
  private decorationManager!: DecorationManager;

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

  // Performance settings change listener
  private performanceSettingsListener: (() => void) | null = null;
  private lastQualityLevel: string = '';

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

    // Reset performance settings warmup to avoid quality cascade during scene initialization
    PerformanceSettings.resetWarmup();
    this.playerCount = data?.playerCount ?? 1;
    this.gameMode = data?.gameMode ?? 'normal';

    // Restore kill counts if provided (for dogfight and 2-player modes)
    this.p1Kills = data?.p1Kills ?? 0;
    this.p2Kills = data?.p2Kills ?? 0;

    if (this.gameMode === 'dogfight') {
      // Force 2-player mode for dogfight
      this.playerCount = 2;
      // Use provided pad index or pick a random one (excluding Washington at index 0)
      this.dogfightPadIndex = data?.dogfightPadIndex ?? (1 + Math.floor(Math.random() * (LANDING_PADS.length - 1)));
    } else {
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
      playSound: (key: string, config?: { volume?: number }) => this.playSpeechSound(key, config),
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
      playSound: (key: string, config?: { volume?: number }) => this.playSpeechSound(key, config),
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
          if (this.players[0]) this.players[0].kills = this.p1Kills;
        } else {
          this.p2Kills++;
          if (this.players[1]) this.players[1].kills = this.p2Kills;
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
      isGreenlandIceCarried: () => this.carriedItemManager.getHasGreenlandIce(),
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
    this.decorationManager = new DecorationManager(this, {
      getFlatAreas: () => this.terrain.getFlatAreas(),
      getHeightAt: (x: number) => this.terrain.getHeightAt(x),
      getCannonPositions: () => this.cannons.map(c => ({ x: c.x, y: c.y })),
    });
    this.decorationManager.createDecorations();
    this.decorations = this.decorationManager.getDecorations();
    this.medalHouse = this.decorationManager.getMedalHouse();

    // Initialize projectile collision manager (projectile-projectile and projectile-building)
    this.projectileCollisionManager = new ProjectileCollisionManager(this, {
      getCannons: () => this.cannons,
      getDecorations: () => this.decorations,
    });

    // Initialize sitting duck manager (detects stranded shuttle)
    this.sittingDuckManager = new SittingDuckManager(this, {
      getShuttle: () => this.shuttle,
      getFuelSystem: () => this.fuelSystem,
      getTerrain: () => this.terrain,
      getLandingPads: () => this.landingPads,
      getTimeNow: () => this.time.now,
      getGameState: () => this.gameState,
      onSittingDuckTriggered: (message) => this.handleSittingDuckGameOver(message),
    });

    // Reset score and destroyed buildings
    this.destructionScore = 0;
    this.destroyedBuildings = [];

    // Initialize power-up manager
    this.powerUpManager = new PowerUpManager(this, {
      getShuttle: () => this.players[0]?.shuttle ?? null,
      getShuttle2: () => this.players[1]?.shuttle ?? null,
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
      playSound: (key, config) => this.playSpeechSound(key, config),
      setGameState: (state) => { this.gameState = state as GameState; },
      stopUIScene: () => this.scene.stop('UIScene'),
      restartScene: (data) => this.scene.restart(data),
      startMenuScene: () => this.scene.start('MenuScene'),
    });

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
    this.playedHighAltitudeSound = false;

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

    // Initialize PlayerState array (consolidates all player-specific state)
    this.players[0] = new PlayerState(1, this.shuttle, this.fuelSystem, this.inventorySystem, this.p1Controls);
    this.players[0].kills = this.p1Kills; // Sync kills from persistent state
    if (this.playerCount === 2 && this.shuttle2 && this.fuelSystem2 && this.inventorySystem2 && this.p2Controls) {
      this.players[1] = new PlayerState(2, this.shuttle2, this.fuelSystem2, this.inventorySystem2, this.p2Controls);
      this.players[1].kills = this.p2Kills; // Sync kills from persistent state
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
    this.collisionManager = new CollisionManager(this, {
      getShuttle1BodyId: () => this.players[0]?.shuttle?.body ? (this.players[0].shuttle.body as MatterJS.BodyType).id : -1,
      getShuttle2BodyId: () => this.players[1]?.shuttle?.body ? (this.players[1].shuttle.body as MatterJS.BodyType).id : -1,
      onTerrainCollision: (playerNum) => this.handleTerrainCollision(playerNum),
      onLandingPadCollision: (pad, playerNum) => this.handleLandingPadCollision(pad, playerNum),
      onBoatDeckCollision: (playerNum) => this.handleBoatDeckCollision(playerNum),
      onProjectileHit: (playerNum, spriteKey) => this.handleProjectileHit(playerNum, spriteKey),
      onCollectiblePickup: (collectible, playerNum) => this.handleCollectiblePickup(collectible, playerNum),
      onTombstoneBounce: (body) => this.tombstoneManager.handleBounce(body),
      onBrickWallCollision: (playerNum) => this.handleBrickWallCollision(playerNum),
      onTombstoneTerrainCollision: (body) => this.tombstoneManager.resetJuggle(body),
    });
    this.collisionManager.initialize();

    // Initialize landing pad manager
    this.landingPadManager = new LandingPadManager(this, {
      getLandingPads: () => this.landingPads,
      getWindStrength: () => this.weatherManager.getWindStrength(),
    });

    // Initialize cannon manager
    this.cannonManager = new CannonManager(this, {
      getCannons: () => this.cannons,
      getShuttles: () => this.shuttles,
      getCamera: () => this.cameras.main,
      getWindStrength: () => this.weatherManager.getWindStrength(),
      isCannonsBribed: () => this.powerUpManager.isCannonsBribed(),
    });

    // Start UI scene
    this.scene.launch('UIScene', {
      fuelSystem: this.players[0].fuelSystem,
      inventorySystem: this.players[0].inventorySystem,
      getShuttleVelocity: () => this.players[0].shuttle?.getVelocity() ?? { x: 0, y: 0, total: 0 },
      getShuttleAltitude: () => {
        const groundLevel = 500; // Approximate terrain level (GAME_HEIGHT * 0.7 ≈ 504)
        const shuttleY = this.players[0].shuttle?.y ?? groundLevel;
        return Math.max(0, groundLevel - shuttleY);
      },
      getProgress: () => this.getProgress(),
      getCurrentCountry: () => this.getCurrentCountry(),
      getLegsExtended: () => this.players[0].shuttle?.areLandingLegsExtended() ?? false,
      getElapsedTime: () => this.getElapsedTime(),
      hasPeaceMedal: () => this.carriedItemManager.getHasPeaceMedal(),
      isDebugMode: () => this.players[0]?.shuttle?.isDebugMode() ?? false,
      // P2 data for 2-player mode
      playerCount: this.playerCount,
      fuelSystem2: this.players[1]?.fuelSystem ?? null,
      inventorySystem2: this.players[1]?.inventorySystem ?? null,
      getP2Velocity: () => this.players[1]?.shuttle?.getVelocity() ?? { x: 0, y: 0, total: 0 },
      getP2LegsExtended: () => this.players[1]?.shuttle?.areLandingLegsExtended() ?? false,
      isP2Active: () => this.players[1]?.shuttle?.active ?? false,
      getKillCounts: () => ({ p1Kills: this.players[0]?.kills ?? 0, p2Kills: this.players[1]?.kills ?? 0 }),
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

    // Debug monitoring display (bottom-right corner) - shown when SHOW_DEBUG_INFO is true or shuttle debug mode is on
    this.debugText = this.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 10, '', {
      fontFamily: 'monospace', fontSize: '14px',
      color: '#00ff00',
      backgroundColor: '#000000aa',
      padding: { x: 5, y: 5 },
    });
    this.debugText.setOrigin(1, 1);
    this.debugText.setScrollFactor(0);
    this.debugText.setDepth(1000);
    this.debugText.setVisible(SHOW_DEBUG_INFO); // Start hidden unless SHOW_DEBUG_INFO is true

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
      // Remove performance settings listener
      if (this.performanceSettingsListener) {
        PerformanceSettings.removeListener(this.performanceSettingsListener);
        this.performanceSettingsListener = null;
      }
    });

    // Set up performance settings listener for toast notifications and decoration hiding
    this.lastQualityLevel = PerformanceSettings.getPreset().name;
    this.performanceSettingsListener = () => {
      const preset = PerformanceSettings.getPreset();
      const newLevel = preset.name;
      if (newLevel !== this.lastQualityLevel) {
        this.showQualityChangeToast(newLevel);
        this.lastQualityLevel = newLevel;

        // Hide/show decorations based on performance settings
        this.decorations.forEach(d => d.setVisible(preset.decorations));
      }
    };
    PerformanceSettings.addListener(this.performanceSettingsListener);

    // Apply initial decoration visibility based on current settings
    const initialPreset = PerformanceSettings.getPreset();
    if (!initialPreset.decorations) {
      this.decorations.forEach(d => d.setVisible(false));
    }
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

    // Altitude overlay - darkens sky at high altitudes
    this.altitudeOverlay = this.add.graphics();
    this.altitudeOverlay.setScrollFactor(0);
    this.altitudeOverlay.setDepth(-90); // In front of sky, behind everything else

    // Speed trail emitter - smoke puffs when not thrusting at high speed
    this.speedTrailEmitter = this.add.particles(0, 0, 'smoke', {
      speed: { min: 10, max: 40 },
      angle: { min: 0, max: 360 }, // Updated dynamically based on velocity
      scale: { start: 0.3, end: 0.8 }, // Moderate size
      alpha: { start: 0.7, end: 0 }, // More opaque
      lifespan: { min: 400, max: 700 },
      blendMode: Phaser.BlendModes.NORMAL,
      frequency: -1, // Manual emission only
      rotate: { min: 0, max: 360 },
      maxParticles: 200, // Safety limit to prevent memory issues
    });
    this.speedTrailEmitter.setDepth(200);

    // Create parallax cloud layers
    this.createCloudLayers();
  }

  /**
   * Update the altitude overlay based on camera position
   * Creates a vertical gradient - darker at top (space), lighter at bottom (atmosphere)
   */
  private updateAltitudeOverlay(): void {
    // Performance: Skip expensive gradient rendering at low quality
    const altitudeOverlayEnabled = PerformanceSettings.getPreset().altitudeOverlay;

    const cam = this.cameras.main;

    // Ground level is around Y=500, max height is Y=-2500
    const groundLevel = 300;
    const spaceLevel = -1500;

    // Calculate altitude factor (0 = at/below ground, 1 = max altitude)
    const altitudeFactor = Math.max(0, Math.min(1, (groundLevel - cam.scrollY) / (groundLevel - spaceLevel)));

    this.altitudeOverlay.clear();

    // Skip drawing if disabled or at ground level
    if (!altitudeOverlayEnabled || altitudeFactor <= 0) {
      return;
    }

    const maxAlpha = 0.65;
    const baseAlpha = altitudeFactor * altitudeFactor * maxAlpha;

    // Draw vertical gradient - darker at top, lighter at bottom
    // Use enough strips for smooth transition (1 strip per 4 pixels)
    const stripHeight = 4;
    const numStrips = Math.ceil(GAME_HEIGHT / stripHeight);

    for (let i = 0; i < numStrips; i++) {
      const y = i * stripHeight;
      // Position in screen (0 = top, 1 = bottom)
      const screenPos = y / GAME_HEIGHT;

      // Gradient: top of screen is 100% of base alpha, bottom is 20%
      const gradientFactor = 1 - screenPos * 0.8;
      const alpha = baseAlpha * gradientFactor;

      this.altitudeOverlay.fillStyle(0x0a0a1a, alpha);
      this.altitudeOverlay.fillRect(0, y, GAME_WIDTH, stripHeight);
    }

    // Add stars when high enough
    if (altitudeFactor > 0.2) {
      const starAlpha = (altitudeFactor - 0.2) / 0.8;
      this.drawHighAltitudeStars(starAlpha);
    }
  }

  /**
   * Draw twinkling stars visible at high altitude
   */
  private drawHighAltitudeStars(alpha: number): void {
    const starPositions = [
      { x: 50, y: 30 }, { x: 150, y: 80 }, { x: 280, y: 45 }, { x: 400, y: 100 },
      { x: 520, y: 25 }, { x: 650, y: 70 }, { x: 750, y: 40 }, { x: 880, y: 90 },
      { x: 100, y: 150 }, { x: 300, y: 180 }, { x: 500, y: 130 }, { x: 700, y: 170 },
      { x: 200, y: 250 }, { x: 450, y: 220 }, { x: 600, y: 280 }, { x: 800, y: 240 },
      { x: 80, y: 320 }, { x: 350, y: 350 }, { x: 550, y: 310 }, { x: 720, y: 380 },
    ];

    const time = this.time.now * 0.002;

    for (let i = 0; i < starPositions.length; i++) {
      const star = starPositions[i];
      const twinkle = Math.sin(time + i * 1.5) * 0.3 + 0.7;
      const starAlpha = alpha * twinkle;
      const size = 1 + Math.sin(time * 0.5 + i) * 0.5;

      this.altitudeOverlay.fillStyle(0xffffff, starAlpha);
      this.altitudeOverlay.fillCircle(star.x, star.y, size);
    }
  }

  /**
   * Cull off-screen objects to improve performance.
   * Objects far from the camera are hidden with setVisible(false).
   * Phaser skips rendering invisible objects entirely.
   */
  private updateVisibilityCulling(): void {
    const cam = this.cameras.main;
    const margin = 800; // Hide objects more than this distance from screen edge

    const leftEdge = cam.scrollX - margin;
    const rightEdge = cam.scrollX + GAME_WIDTH + margin;

    // Cull decorations (buildings, landmarks)
    for (const decoration of this.decorations) {
      const visible = decoration.x > leftEdge && decoration.x < rightEdge;
      decoration.setVisible(visible);
    }

    // Cull cannons (container with flag, base, barrel)
    for (const cannon of this.cannons) {
      const visible = cannon.x > leftEdge && cannon.x < rightEdge;
      cannon.setVisible(visible);
    }

    // Cull landing pads (graphics + flag + text)
    for (const pad of this.landingPads) {
      const visible = pad.x > leftEdge && pad.x < rightEdge;
      pad.setVisible(visible);
    }

    // Cull oil towers (graphics + particle emitter)
    for (const tower of this.oilTowers) {
      const visible = tower.x > leftEdge && tower.x < rightEdge;
      tower.setVisible(visible);
    }

    // Cull terrain chunks (the big optimization!)
    this.terrain.updateChunkVisibility(cam.scrollX, GAME_WIDTH);
  }

  /**
   * Create parallax cloud layers at different altitudes
   * Clouds provide visual reference for altitude and movement
   */
  private createCloudLayers(): void {
    // Three cloud layers at different altitudes
    const layers = [
      { y: -200, scrollFactor: 0.3, alpha: 0.6, count: 8 },   // Low clouds
      { y: -600, scrollFactor: 0.5, alpha: 0.4, count: 6 },   // Mid clouds
      { y: -1000, scrollFactor: 0.7, alpha: 0.3, count: 5 },  // High clouds
    ];

    for (const layer of layers) {
      const container = this.add.container(0, layer.y);
      container.setScrollFactor(1, layer.scrollFactor);
      container.setDepth(-80);
      container.setAlpha(layer.alpha);

      // Create clouds spread across world width
      for (let i = 0; i < layer.count; i++) {
        const cloud = this.createCloud();
        cloud.x = (i / layer.count) * 3000 + Math.random() * 300;
        cloud.y = Math.random() * 100 - 50;
        container.add(cloud);
      }

      this.cloudLayers.push(container);
    }
  }

  /**
   * Create a single fluffy cloud using overlapping ellipses
   */
  private createCloud(): Phaser.GameObjects.Graphics {
    const cloud = this.add.graphics();
    cloud.fillStyle(0xffffff, 1);

    // Draw fluffy cloud shape with overlapping ellipses
    const baseWidth = 80 + Math.random() * 60;
    const baseHeight = 30 + Math.random() * 20;

    // Main body
    cloud.fillEllipse(0, 0, baseWidth, baseHeight);
    // Left bump
    cloud.fillEllipse(-baseWidth * 0.3, -baseHeight * 0.2, baseWidth * 0.5, baseHeight * 0.7);
    // Right bump
    cloud.fillEllipse(baseWidth * 0.25, -baseHeight * 0.15, baseWidth * 0.6, baseHeight * 0.8);
    // Top bump
    cloud.fillEllipse(baseWidth * 0.1, -baseHeight * 0.4, baseWidth * 0.4, baseHeight * 0.5);

    return cloud;
  }

  /**
   * Update speed trails - emit smoke trails for all players when not thrusting
   */
  private updateSpeedLines(): void {
    // Skip if speed trails disabled for performance
    if (!PerformanceSettings.getPreset().speedTrails) return;

    // Process smoke trails for all active players
    for (const player of this.players) {
      if (!player?.shuttle?.body) continue;

      const shuttle = player.shuttle;
      const velocity = shuttle.body as MatterJS.BodyType;
      const vx = velocity.velocity.x;
      const vy = velocity.velocity.y;
      const speed = Math.sqrt(vx * vx + vy * vy);

      // Check for sonic boom (speed >= 30) - per-player tracking
      if (speed >= 30 && !player.sonicBoomTriggered) {
        player.sonicBoomTriggered = true;
        this.playSpeechSound('sonic_boom', { volume: 0.7 });
        this.achievementSystem.unlock('sonic_boom');
        this.cameras.main.shake(200, 0.01);
      }
      // Reset when this player slows down
      if (speed < 25) {
        player.sonicBoomTriggered = false;
      }

      // Emit smoke particles when not thrusting and moving fast (atmospheric friction)
      const threshold = 8;
      const notThrusting = !shuttle.getIsThrusting();
      if (speed > threshold && notThrusting) {
        // Calculate trail angle - opposite to velocity direction (where smoke drifts)
        const trailAngle = Math.atan2(-vy, -vx) * (180 / Math.PI);

        // Only update the angle dynamically (other config set at init)
        this.speedTrailEmitter.particleAngle = { min: trailAngle - 30, max: trailAngle + 30 };

        // Continuous emission - more particles at higher speeds
        const intensity = Math.min((speed - threshold) / 15, 1);
        const particleCount = 3 + Math.floor(intensity * 6);

        // Emit from the back of the ship (based on ship rotation, not velocity)
        const backAngle = shuttle.getBackAngle();
        const backOffset = 18; // Distance from center to back (slightly closer than thrust particles)

        for (let i = 0; i < particleCount; i++) {
          // Scatter emission points at the back of the ship
          const spreadAngle = backAngle + (Math.random() - 0.5) * 0.5;
          const dist = backOffset + Math.random() * 4;
          const emitX = shuttle.x + Math.cos(spreadAngle) * dist;
          const emitY = shuttle.y + Math.sin(spreadAngle) * dist;
          this.speedTrailEmitter.emitParticleAt(emitX, emitY, 1);
        }
      }
    }
  }


  private handleElectricalDeath(shuttle: Shuttle): void {
    if (this.gameState !== 'playing') return;
    if (shuttle.isDebugMode()) return; // Invulnerable in debug mode

    const playerNum = shuttle.getPlayerIndex() + 1; // Convert 0-based to 1-based
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
      const player = this.getPlayer(playerNum);
      player.deathMessage = 'Struck by lightning!';

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
    // Apply cannon multiplier from performance settings
    const cannonMultiplier = PerformanceSettings.getPreset().cannonMultiplier;

    // Place cannons based on country cannon density
    for (const country of COUNTRIES) {
      if (country.cannonDensity <= 0) continue;

      const nextCountry = COUNTRIES[COUNTRIES.indexOf(country) + 1];
      const endX = nextCountry ? nextCountry.startX : WORLD_WIDTH;

      // Calculate number of cannons - ensure minimum of 2 for gameplay, apply performance multiplier
      const countryWidth = endX - country.startX;
      const baseNumCannons = Math.floor(countryWidth * country.cannonDensity / 500);
      const numCannons = Math.max(2, Math.floor(baseNumCannons * cannonMultiplier));

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

  private handleTerrainCollision(playerNum: number = 1): void {
    if (this.gameState !== 'playing') return;
    if (this.invulnerable) return; // Ignore collisions during invulnerability

    // Get the correct shuttle
    const player = this.getPlayer(playerNum);
    const shuttle = player.shuttle;
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
    // But NOT if we're near a landing pad, on the fishing boat, or near the brick walls
    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 5000;

    // Don't trigger water death if near the brick walls at ocean boundaries
    const wallTolerance = 20; // Wall width (12) + buffer for physics imprecision
    const nearLeftWall = Math.abs(shuttle.x - atlanticStart) < wallTolerance;
    const nearRightWall = Math.abs(shuttle.x - atlanticEnd) < wallTolerance;
    const isOverWater = shuttle.x >= atlanticStart && shuttle.x < atlanticEnd && !nearLeftWall && !nearRightWall;

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
      console.log(`[DEATH] P${playerNum} died: "Splashed into the Atlantic!" | Cause: water | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${player.fuelSystem.getFuel().toFixed(1)}`);

      // In 2-player mode, only destroy this shuttle
      if (this.playerCount === 2) {
        this.handleShuttleCrash(playerNum, 'Splashed into the Atlantic!', 'water');
        return;
      }

      this.gameState = 'crashed';
      shuttle.stopRocketSound();
      this.playSpeechSound('water_splash');

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
    const outOfFuel = player.fuelSystem.isEmpty();
    const cause: CauseOfDeath = outOfFuel ? 'fuel' : 'terrain';
    const message = outOfFuel ? 'Ran out of fuel!' : 'Crashed into terrain!';

    const vel = shuttle.body?.velocity || { x: 0, y: 0 };
    console.log(`[DEATH] P${playerNum} died: "${message}" | Cause: ${cause} | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${player.fuelSystem.getFuel().toFixed(1)} | TerrainHeight: ${terrainHeight.toFixed(1)}`);

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
    this.playSpeechSound('car_crash', { volume: 0.8 });

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

    const player = this.getPlayer(playerNum);
    const shuttle = player.shuttle;
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
    console.log(`[DEATH] P${playerNum} died: "Crashed into the wall!" | Cause: terrain | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${player.fuelSystem.getFuel().toFixed(1)}`);

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
    this.playSpeechSound('car_crash', { volume: 0.8 });

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
    const player = this.getPlayer(playerNum);
    const shuttle = player.shuttle;
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
      console.log(`[DEATH] P${playerNum} died: "Crash landing! ${landingResult.reason}" | Cause: landing | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${player.fuelSystem.getFuel().toFixed(1)} | Pad: ${pad.name}`);

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
      this.playSpeechSound('landing_perfect', { volume: 1.0 });
    } else if (landingResult.quality === 'good') {
      this.playSpeechSound('landing_good', { volume: 1.0 });
    } else {
      this.playSpeechSound('landing_rough', { volume: 1.0 });
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
      const quality = landingResult.quality as 'perfect' | 'good' | 'rough';
      this.performAutoTrade(shuttle, player.inventorySystem, player.fuelSystem, quality, playerNum);
      this.gameState = 'playing';
    } else if (pad.isWashington && !this.carriedItemManager.getHasPeaceMedal() && this.gameMode !== 'dogfight') {
      // Pick up the Peace Medal at Washington! (not in dogfight mode)
      pad.hidePeaceMedal();
      this.carriedItemManager.pickupPeaceMedal(shuttle);

      // Auto-trade
      const quality = landingResult.quality as 'perfect' | 'good' | 'rough';
      this.performAutoTrade(shuttle, player.inventorySystem, player.fuelSystem, quality, playerNum);
      this.gameState = 'playing';
    } else {
      // Auto-trade
      const quality = landingResult.quality as 'perfect' | 'good' | 'rough';
      this.performAutoTrade(shuttle, player.inventorySystem, player.fuelSystem, quality, playerNum);
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

    const player = this.getPlayer(playerNum);
    const shuttle = player.shuttle;
    if (!shuttle || !shuttle.active) return;

    const landingResult = shuttle.checkLandingSafety();

    if (!landingResult.safe) {
      const vel = shuttle.body?.velocity || { x: 0, y: 0 };
      console.log(`[DEATH] P${playerNum} died: "Crash landing on boat! ${landingResult.reason}" | Cause: landing | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${player.fuelSystem.getFuel().toFixed(1)}`);

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

      player.inventorySystem.add('FISH_PACKAGE');

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
      this.playSpeechSound('landing_perfect', { volume: 1.0 });
    } else if (landingResult.quality === 'good') {
      this.playSpeechSound('landing_good', { volume: 1.0 });
    } else {
      this.playSpeechSound('landing_rough', { volume: 1.0 });
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

  private handleProjectileHit(playerNum: number = 1, spriteKey?: string): void {
    const player = this.getPlayer(playerNum);
    this.handleProjectileHitOnShuttle(spriteKey, player.shuttle);
  }

  // Generic handler for shuttle crashes in 2-player mode
  private handleShuttleCrash(playerNum: number, message: string, cause: CauseOfDeath): void {
    const player = this.getPlayer(playerNum);
    const shuttle = player.shuttle;
    if (!shuttle || !shuttle.active) return;

    // Mark shuttle inactive immediately to prevent duplicate collision handling
    shuttle.setActive(false);

    // Track which player died (0-based index) for dogfight kill tracking
    this.lastDeadPlayerIndex = playerNum - 1;

    // Detailed death logging
    const vel = shuttle.body?.velocity || { x: 0, y: 0 };
    console.log(`[DEATH] P${playerNum} died: "${message}" | Cause: ${cause} | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${player.fuelSystem.getFuel().toFixed(1)}`);

    // Store death message for this player
    player.deathMessage = message;

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
      this.playSpeechSound('water_splash');
      this.handleWaterSplash(shuttle, message, playerNum);
    } else {
      // Normal explosion for terrain/other crashes
      shuttle.explode();
      this.playSpeechSound('car_crash', { volume: 0.8 });
      this.checkGameOverAfterCrash();
    }
  }

  // Check if game should end after a crash (2-player mode)
  private checkGameOverAfterCrash(): void {
    const remainingActive = this.shuttles.filter(s => s.active);

    // In dogfight mode, any death triggers quick restart (unless winner reached 10 kills)
    if (this.gameMode === 'dogfight') {
      // Award kill - but skip if already tracked (e.g., from bomb hit)
      if (this.lastDeadPlayerIndex >= 0 && !this.killAlreadyTracked) {
        // Check if both players are dead
        const bothDead = remainingActive.length === 0;

        if (bothDead) {
          // Both died (e.g., both in water) - award kill to the one who died LAST (survived longer)
          if (this.lastDeadPlayerIndex === 0) {
            this.p1Kills++;  // P1 died last, P1 gets the point for surviving longer
            if (this.players[0]) this.players[0].kills = this.p1Kills;
            console.log('Kill awarded to P1 (white) - survived longer (both dead)');
          } else {
            this.p2Kills++;  // P2 died last, P2 gets the point for surviving longer
            if (this.players[1]) this.players[1].kills = this.p2Kills;
            console.log('Kill awarded to P2 (blue) - survived longer (both dead)');
          }
        } else {
          // Only one died - award kill to the opponent (survivor)
          if (this.lastDeadPlayerIndex === 0) {
            this.p2Kills++;  // P1 died, P2 gets the kill
            if (this.players[1]) this.players[1].kills = this.p2Kills;
            console.log('Kill awarded to P2 (blue) - P1 died');
          } else {
            this.p1Kills++;  // P2 died, P1 gets the kill
            if (this.players[0]) this.players[0].kills = this.p1Kills;
            console.log('Kill awarded to P1 (white) - P2 died');
          }
        }
      }
      // Reset flags for next death
      this.killAlreadyTracked = false;
      this.lastDeadPlayerIndex = -1;

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
        message = `P1: ${this.players[0]?.deathMessage || 'Unknown'}\nP2: ${this.players[1]?.deathMessage || 'Unknown'}`;
      } else {
        message = this.players[0]?.deathMessage || 'Mission failed!';
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
    this.lastDeathCause = projectileSpriteKey;
    console.log('CRASH: Hit by projectile at', { x: shuttle.x, y: shuttle.y }, 'player:', playerNum, 'type:', projectileSpriteKey);

    // Generate and store death message
    const message = this.getProjectileDeathMessage(projectileSpriteKey);
    this.getPlayer(playerNum).deathMessage = message;

    // Spawn tombstone at crash location with projectile type as cause
    this.tombstoneManager.spawnTombstone(shuttle.x, shuttle.y, projectileSpriteKey || 'cannonball');

    // Stop thrust sound and explode the hit shuttle
    shuttle.stopRocketSound();
    shuttle.explode();

    // Play crash and explosion sounds
    this.playSpeechSound('car_crash', { volume: 0.8 });
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

    // Get player state for the correct shuttle, fuel system, and inventory
    const player = this.getPlayer(playerNum);
    const shuttle = player.shuttle;
    const fuelSys = player.fuelSystem;
    const invSys = player.inventorySystem;

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
      this.playSpeechSound(key);
    }
  }

  // Play a speech/SFX sound with the user's speech volume setting
  private playSpeechSound(key: string, config?: { volume?: number }): void {
    const speechVolume = AudioSettings.getSpeechVolume();
    const baseVolume = config?.volume ?? 1.0;
    this.sound.play(key, { ...config, volume: baseVolume * speechVolume });
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

  // Transition to game over with 3 second delay and 1 second fade out
  private transitionToGameOver(data: {
    victory: boolean;
    message: string;
    score: number;
    debugModeUsed: boolean;
    destroyedBuildings: { name: string; points: number; textureKey?: string; country?: string }[];
    noShake?: boolean;
    playerCount?: number;
    p1Kills?: number;
    p2Kills?: number;
    cause?: string;
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

    // Prepare game over data with player info for restart
    const gameOverData = {
      ...data,
      playerCount: data.playerCount ?? this.playerCount,
      p1Kills: data.p1Kills ?? this.p1Kills,
      p2Kills: data.p2Kills ?? this.p2Kills,
      cause: data.cause ?? this.lastDeathCause,
    };

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
          this.scene.start('GameOverScene', gameOverData);
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

  /**
   * Get PlayerState by player number (1 or 2)
   * Use this instead of ternary patterns like: playerNum === 2 ? this.shuttle2 : this.shuttle
   */
  private getPlayer(playerNum: number): PlayerState {
    return this.players[playerNum - 1];
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

  private handleSittingDuckGameOver(message: string): void {
    if (this.gameState !== 'playing') return;

    const vel = this.shuttle.body?.velocity || { x: 0, y: 0 };
    console.log(`[DEATH] P1 died: "${message}" | Cause: duck | Position: (${this.shuttle.x.toFixed(0)}, ${this.shuttle.y.toFixed(0)}) | Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}) | Fuel: ${this.fuelSystem.getFuel().toFixed(1)}`);

    this.gameState = 'crashed';
    this.shuttle.stopRocketSound();

    // Track death achievement
    this.achievementSystem.onDeath('duck');

    // Spawn tombstone at crash location
    this.tombstoneManager.spawnTombstone(this.shuttle.x, this.shuttle.y, 'duck');

    this.shuttle.explode();

    this.transitionToGameOver({
      victory: false,
      message: message,
      score: this.destructionScore,
      debugModeUsed: this.shuttle.wasDebugModeUsed(),
      destroyedBuildings: this.destroyedBuildings,
    });
  }

  update(time: number): void {
    // Cull off-screen objects first (before processing updates)
    // This hides objects far from camera to reduce rendering overhead
    this.updateVisibilityCulling();

    // Always update these even when crashed (for death animation)
    // Update terrain (for animated ocean waves) - pass pollution level for wave tinting
    this.terrain.update(this.scorchMarkManager.getWaterPollutionLevel());

    // Update scorch marks and water pollution - always
    this.scorchMarkManager.update(time);

    // Update tombstones (physics sync and sinking) - always
    this.tombstoneManager.update();

    // Update weather system (clouds, rain, lightning, wind) - continue during death
    this.weatherManager.update(time, this.shuttles);

    // Update entities (fisher boat, sharks, golf cart, greenland ice bobbing) - continue during death
    this.entityManager.update(time);

    // Update landing pad flags with wind - continue during death
    this.landingPadManager.update();

    // Update biplane (spawning, movement) - continue during death
    this.biplaneManager.update(time);

    // Update cannons (targeting, firing, projectiles) - continue during death
    this.cannonManager.update(time);

    // Check projectile collisions - continue during death
    this.projectileCollisionManager.update();

    // Update bombs (in-flight bombs continue during death)
    this.bombManager.update(
      this.players[0]?.shuttle ?? null,
      this.players[1]?.shuttle ?? null,
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

    // Stop here if not playing
    if (this.gameState !== 'playing') return;

    // Check for shuttles flying out of bounds (into the void)
    this.checkOutOfBounds();

    // Update altitude overlay (sky darkens at high altitude)
    this.updateAltitudeOverlay();

    // Update shuttle input state first (so isThrusting is current for smoke trails)
    for (const shuttle of this.shuttles) {
      if (shuttle.active) {
        shuttle.update();
      }
    }

    // Update speed lines (motion blur when falling fast)
    this.updateSpeedLines();

    // Get wind strength for physics
    const windStrength = this.weatherManager.getWindStrength();

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

    // Check if shuttle can pick up Greenland ice
    if (this.greenlandIce && !this.greenlandIce.isDestroyed && !this.carriedItemManager.getHasGreenlandIce()) {
      if (this.shuttle && this.shuttle.active) {
        this.carriedItemManager.checkGreenlandIcePickup(this.shuttle, this.greenlandIce);
      }
    }

    // Update carried Greenland ice graphics
    this.carriedItemManager.updateGreenlandIceGraphics();

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

    // Note: Shuttle update moved earlier (before updateSpeedLines) for correct isThrusting state

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
    const p1 = this.players[0];
    const p2 = this.players[1];
    const p1Bomb = this.cursors.down.isDown && p1?.shuttle?.active;
    const p2Bomb = this.p2BombKey && p2?.shuttle?.active && this.p2BombKey.isDown;
    if (p1Bomb && this.bombManager.canDropBomb(1)) {
      this.bombManager.dropBomb(p1.shuttle, p1.inventorySystem, 1);
      this.bombManager.startCooldown(1);
    }
    if (p2Bomb && this.bombManager.canDropBomb(2)) {
      this.bombManager.dropBomb(p2.shuttle, p2.inventorySystem, 2);
      this.bombManager.startCooldown(2);
    }

    // Update peace medal graphics if carrying
    this.carriedItemManager.updatePeaceMedalGraphics();

    // Update power-up effects
    this.powerUpManager.update();

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

    // Update debug monitoring display - show/hide based on shuttle debug mode or SHOW_DEBUG_INFO constant
    if (this.debugText) {
      const shuttleDebugMode = this.shuttle?.isDebugMode() ?? false;
      this.debugText.setVisible(SHOW_DEBUG_INFO || shuttleDebugMode);
      const fps = Math.round(this.game.loop.actualFps);
      const now = Date.now();
      const gameTime = now - this.gameStartTime;

      // Feed FPS to performance settings for auto-adjustment
      if (fps > 0) {
        PerformanceSettings.updateFPS(fps);
      }

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

      // Only run expensive debug counting if debug text is visible
      if (this.debugText.visible) {
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
    }

    // Check for sitting duck (out of fuel on ground)
    this.sittingDuckManager.update();

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
    // Restart game scene with new player count (resets kills for fresh start)
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
    const GROUND_LEVEL = 500;  // Reference point for altitude calculation
    const SPACE_ALTITUDE = 12500;  // Altitude threshold for "in orbit" death (12.5km into space!)

    for (const shuttle of this.shuttles) {
      if (!shuttle.active) continue;

      // Check for space altitude (flying too high)
      const altitude = GROUND_LEVEL - shuttle.y;

      // Play "I can see my house" sound when crossing 10000m going up
      const HIGH_ALTITUDE_SOUND_THRESHOLD = 10000;
      if (!this.playedHighAltitudeSound && altitude > HIGH_ALTITUDE_SOUND_THRESHOLD) {
        const velocity = shuttle.getVelocity();
        if (velocity.y < 0) { // Negative y = going up
          this.playedHighAltitudeSound = true;
          this.playSpeechSound('i_can_see_my_house');
        }
      }

      if (altitude > SPACE_ALTITUDE) {
        this.handleSpaceDeath(shuttle);
        continue;
      }

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
        this.getPlayer(playerNum).deathMessage = 'Lost in the void!';

        // Kill the shuttle
        shuttle.explode();
        this.checkGameOverAfterCrash();
      }
    }
  }

  /**
   * Handle special "space death" when player flies above 12,500 meters altitude.
   * This is treated as a humorous "victory" - sending Trump to space!
   */
  private handleSpaceDeath(shuttle: Shuttle): void {
    const playerIndex = shuttle.getPlayerIndex();
    const playerNum = playerIndex + 1;
    const altitude = 500 - shuttle.y;

    console.log(`[SPACE] P${playerNum} reached orbit! | Altitude: ${altitude.toFixed(0)} | Position: (${shuttle.x.toFixed(0)}, ${shuttle.y.toFixed(0)})`);

    // Track which player died
    this.lastDeadPlayerIndex = playerIndex;

    // Set special death message
    this.getPlayer(playerNum).deathMessage = 'You won the game! Congratulations!';

    // Unlock the "In Orbit" achievement
    this.achievementSystem.unlock('in_orbit');
    this.achievementSystem.onDeath('space');

    // Play space force sound
    this.playSpeechSound('space_force');

    // Set game state to crashed
    this.gameState = 'crashed';
    this.lastDeathCause = 'space';

    // Spawn tombstone at shuttle location
    this.tombstoneManager.spawnTombstone(shuttle.x, shuttle.y, 'space');

    // Make shuttle disappear (float away into space rather than explode)
    shuttle.setActive(false);
    shuttle.setVisible(false);

    // Transition to game over with special "victory" message
    this.transitionToGameOver({
      victory: false, // It's technically a death, but GameOverScene will handle it specially
      message: 'You won the game! Congratulations!\n\nTrump will now perform very important work in space.\nMaking the galaxy great again!',
      score: this.destructionScore,
      debugModeUsed: shuttle.wasDebugModeUsed(),
      destroyedBuildings: this.destroyedBuildings,
      noShake: true,
      cause: 'space',
    });
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
      soldParts.push(`-${count} ${shortName}`);
    }
    const soldStr = soldParts.join('\n');

    // Show trade message with fuel gained and items sold (one item per line)
    this.showAutoTradeMessage(shuttle, formatDollarValue(actualFuelGained, '+'), playerNum, soldStr);
  }

  private showAutoTradeMessage(shuttle: Shuttle, message: string, playerNum: number, soldItems?: string): void {
    const baseY = shuttle.y - 60;
    const textStyle = {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
    };

    // Create container for all text elements
    const container = this.add.container(shuttle.x, baseY);

    // Fuel text (green) or status message (gold/blue)
    const isStatusMessage = !soldItems && (message === 'TANK FULL!' || message === 'NO CARGO' || message === 'NO TRADE');
    const fuelColor = isStatusMessage ? (playerNum === 2 ? '#66CCFF' : '#FFD700') : '#00FF00';
    const fuelText = this.add.text(0, 0, message, {
      ...textStyle,
      color: fuelColor,
    } as Phaser.Types.GameObjects.Text.TextStyle);
    fuelText.setOrigin(0.5, 0.5);
    container.add(fuelText);

    // Sold items text (red) - only if provided
    if (soldItems) {
      const soldText = this.add.text(0, fuelText.height + 5, soldItems, {
        ...textStyle,
        color: '#FF6666',
      } as Phaser.Types.GameObjects.Text.TextStyle);
      soldText.setOrigin(0.5, 0);
      container.add(soldText);
    }

    this.tweens.add({
      targets: container,
      y: container.y - 40,
      alpha: 0,
      duration: 3000,
      onComplete: () => container.destroy(),
    });
  }

  /**
   * Shows a toast notification when graphics quality changes
   */
  private showQualityChangeToast(newQuality: string): void {
    // Create toast container at top of screen
    const toast = this.add.container(GAME_WIDTH / 2, 50);
    toast.setScrollFactor(0);
    toast.setDepth(10000);
    toast.setAlpha(0);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRoundedRect(-120, -20, 240, 40, 8);
    toast.add(bg);

    // Text - indicate if auto-adjusted
    const isAuto = PerformanceSettings.isAutoAdjustEnabled();
    const message = isAuto ? `Auto-adjusted: ${newQuality}` : `Quality: ${newQuality}`;
    const text = this.add.text(0, 0, message, {
      fontSize: '16px',
      color: '#FFD700',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    toast.add(text);

    // Animate in
    this.tweens.add({
      targets: toast,
      alpha: 1,
      duration: 200,
      onComplete: () => {
        // Hold for a moment, then fade out
        this.time.delayedCall(1500, () => {
          this.tweens.add({
            targets: toast,
            alpha: 0,
            duration: 300,
            onComplete: () => toast.destroy(),
          });
        });
      },
    });
  }
}
