import Phaser from 'phaser';
import { FuelSystem } from '../systems/FuelSystem';
import { InventorySystem, InventoryItem } from '../systems/InventorySystem';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, MAX_SAFE_LANDING_VELOCITY, BOMB_DROPPABLE_TYPES, GameMode, DOGFIGHT_CONFIG } from '../constants';
import { AchievementPopup } from '../ui/AchievementPopup';
import { getAchievementSystem } from '../systems/AchievementSystem';
import { Achievement } from '../data/achievements';
import { formatDollarValue } from '../utils/DisplayUtils';

interface UISceneData {
  fuelSystem: FuelSystem;
  inventorySystem: InventorySystem;
  getShuttleVelocity: () => { x: number; y: number; total: number };
  getShuttleAltitude: () => number;
  getProgress: () => number;
  getCurrentCountry: () => { name: string; color: number };
  getLegsExtended: () => boolean;
  getElapsedTime: () => number;
  hasPeaceMedal?: () => boolean;
  isDebugMode?: () => boolean;
  // P2 data for 2-player mode
  playerCount?: number;
  fuelSystem2?: FuelSystem | null;
  inventorySystem2?: InventorySystem | null;
  getP2Velocity?: () => { x: number; y: number; total: number };
  getP2LegsExtended?: () => boolean;
  isP2Active?: () => boolean;
  // Kill tally for 2-player mode
  getKillCounts?: () => { p1Kills: number; p2Kills: number };
  // Game mode
  gameMode?: GameMode;
}

export class UIScene extends Phaser.Scene {
  private fuelSystem!: FuelSystem;
  private inventorySystem!: InventorySystem;
  private getShuttleVelocity!: () => { x: number; y: number; total: number };
  private getShuttleAltitude!: () => number;
  private getProgress!: () => number;
  private getLegsExtended!: () => boolean;
  private getElapsedTime!: () => number;
  private hasPeaceMedal!: () => boolean;
  private isDebugMode: () => boolean = () => false;
  // P2 data
  private playerCount: number = 1;
  private fuelSystem2: FuelSystem | null = null;
  private inventorySystem2: InventorySystem | null = null;
  private getP2Velocity: () => { x: number; y: number; total: number } = () => ({ x: 0, y: 0, total: 0 });
  private getP2LegsExtended: () => boolean = () => false;
  private isP2Active: () => boolean = () => false;

  private fuelBarBg!: Phaser.GameObjects.Graphics;
  private fuelBar!: Phaser.GameObjects.Graphics;
  private fuelText!: Phaser.GameObjects.Text;
  // Speedometer
  private speedometerBg!: Phaser.GameObjects.Graphics;
  private speedometerNeedle!: Phaser.GameObjects.Graphics;
  private speedText!: Phaser.GameObjects.Text;
  private speedWarningLeft!: Phaser.GameObjects.Text;
  private speedWarningRight!: Phaser.GameObjects.Text;
  // Altimeter
  private altimeterBg!: Phaser.GameObjects.Graphics;
  private altimeterText!: Phaser.GameObjects.Text;
  private altimeterLabel!: Phaser.GameObjects.Text;
  private inventoryContainer!: Phaser.GameObjects.Container;
  private p2InventoryContainer: Phaser.GameObjects.Container | null = null;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private timerBg!: Phaser.GameObjects.Graphics;
  private medalIndicator!: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private scoreBg!: Phaser.GameObjects.Graphics;

  private lastProgress: number = -1;
  private lastTime: number = -1;
  private lastMedalState: boolean = false;
  private currentScore: number = 0;
  // P2 UI elements
  private p2FuelBarBg: Phaser.GameObjects.Graphics | null = null;
  private p2FuelBar: Phaser.GameObjects.Graphics | null = null;
  private p2FuelText: Phaser.GameObjects.Text | null = null;
  // Kill tally (2-player mode)
  private killTallyContainer: Phaser.GameObjects.Container | null = null;
  private p1TallyGraphics: Phaser.GameObjects.Graphics | null = null;
  private p2TallyGraphics: Phaser.GameObjects.Graphics | null = null;
  private getKillCounts: () => { p1Kills: number; p2Kills: number } = () => ({ p1Kills: 0, p2Kills: 0 });
  // Game mode
  private gameMode: GameMode = 'normal';

  // Achievement popup (displayed in UI scene so it's on top of everything)
  private achievementPopup!: AchievementPopup;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(data: UISceneData): void {
    this.fuelSystem = data.fuelSystem;
    this.inventorySystem = data.inventorySystem;
    this.getShuttleVelocity = data.getShuttleVelocity;
    this.getShuttleAltitude = data.getShuttleAltitude;
    this.getProgress = data.getProgress;
    this.getLegsExtended = data.getLegsExtended;
    this.getElapsedTime = data.getElapsedTime;
    this.hasPeaceMedal = data.hasPeaceMedal || (() => false);
    this.isDebugMode = data.isDebugMode || (() => false);

    // P2 data
    this.playerCount = data.playerCount ?? 1;
    this.fuelSystem2 = data.fuelSystem2 ?? null;
    this.inventorySystem2 = data.inventorySystem2 ?? null;
    this.getP2Velocity = data.getP2Velocity ?? (() => ({ x: 0, y: 0, total: 0 }));
    this.getP2LegsExtended = data.getP2LegsExtended ?? (() => false);
    this.isP2Active = data.isP2Active ?? (() => false);
    this.getKillCounts = data.getKillCounts ?? (() => ({ p1Kills: 0, p2Kills: 0 }));
    this.gameMode = data.gameMode ?? 'normal';

    // Reset state variables (Phaser may reuse scene instances)
    this.lastTime = -1;
    this.lastMedalState = false;
    this.currentScore = 0;
    this.p2FuelBarBg = null;
    this.p2FuelBar = null;
    this.p2FuelText = null;
    this.p2InventoryContainer = null;
    this.killTallyContainer = null;
    this.p1TallyGraphics = null;
    this.p2TallyGraphics = null;

    this.createFuelGauge();
    this.createSpeedometer();
    this.createAltimeter();
    this.createTimer();
    this.createScoreCounter();
    this.createInventoryDisplay();
    this.createMedalIndicator(); // Create after inventory so it's on top
    this.createProgressBar();
    this.createControlsHint();

    // Create P2 fuel gauge and inventory if 2-player mode
    if (this.playerCount === 2) {
      this.createP2FuelGauge();
      this.createP2InventoryDisplay();
      this.createKillTally();
    }

    // Listen for inventory changes
    this.inventorySystem.setOnInventoryChange((items) => {
      this.updateInventoryDisplay(items, this.inventoryContainer, this.inventorySystem);
    });

    // Listen for P2 inventory changes if applicable
    if (this.inventorySystem2 && this.p2InventoryContainer) {
      this.inventorySystem2.setOnInventoryChange((items) => {
        this.updateInventoryDisplay(items, this.p2InventoryContainer!, this.inventorySystem2!);
      });
    }

    // Listen for fuel changes
    this.fuelSystem.setOnFuelChange((fuel, max) => {
      this.updateFuelBar(fuel, max);
    });

    // Listen for P2 fuel changes if applicable
    if (this.fuelSystem2) {
      this.fuelSystem2.setOnFuelChange((fuel, max) => {
        this.updateP2FuelBar(fuel, max);
      });
    }

    // Listen for destruction score updates from GameScene
    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('destructionScore', (score: number) => {
      this.updateScore(score);
    });

    // Listen for player kills (2-player mode)
    if (this.playerCount === 2) {
      gameScene.events.on('playerKill', (data: { killer: number; victim: number; p1Kills: number; p2Kills: number }) => {
        this.updateKillTally(data.p1Kills, data.p2Kills);
      });
    }

    // Listen for fuel tank full event (visual effect)
    gameScene.events.on('fuelTankFull', (playerNum: number) => {
      this.showFuelFullEffect(playerNum);
    });

    // Create achievement popup in UI scene (so it's on top of all UI elements)
    this.achievementPopup = new AchievementPopup(this);

    // Listen for achievement unlocks from the achievement system
    const achievementSystem = getAchievementSystem();
    achievementSystem.onUnlock((achievement: Achievement) => {
      this.achievementPopup.show(achievement);
    });
  }

  private createFuelGauge(): void {
    const x = 30;
    const y = 100;
    const width = 28;
    const height = 200;

    // Background (cartoon style with rounded rect)
    this.fuelBarBg = this.add.graphics();
    this.fuelBarBg.fillStyle(0xFFFFFF, 0.9);
    this.fuelBarBg.fillRoundedRect(x, y, width, height, 8);
    this.fuelBarBg.lineStyle(3, 0x333333);
    this.fuelBarBg.strokeRoundedRect(x, y, width, height, 8);

    // Fuel bar
    this.fuelBar = this.add.graphics();

    // Label with shadow - show 'P1' in 2-player mode, 'FUEL' in single player
    const fuelLabel = this.playerCount === 2 ? 'P1' : 'FUEL';
    const labelShadow = this.add.text(x + width / 2 + 1, y - 9, fuelLabel, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '12px',
      color: '#666666',
      fontStyle: 'bold',
    });
    labelShadow.setOrigin(0.5, 1);

    this.fuelText = this.add.text(x + width / 2, y - 10, fuelLabel, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '12px',
      color: '#2E7D32',
      fontStyle: 'bold',
    });
    this.fuelText.setOrigin(0.5, 1);
  }

  private createSpeedometer(): void {
    const x = 44; // Center of gauge
    const y = 340; // Below fuel gauge
    const radius = 32;

    // Background arc (semi-circle gauge)
    this.speedometerBg = this.add.graphics();

    // White background circle
    this.speedometerBg.fillStyle(0xFFFFFF, 0.9);
    this.speedometerBg.fillCircle(x, y, radius + 4);

    // Border
    this.speedometerBg.lineStyle(3, 0x333333);
    this.speedometerBg.strokeCircle(x, y, radius + 4);

    // Colored arc segments (green -> yellow -> red)
    const arcStart = Math.PI * 0.75; // Start at bottom-left
    const arcEnd = Math.PI * 0.25; // End at bottom-right
    const arcRange = Math.PI * 1.5; // Total arc span

    // Green zone (0-5, safe landing) - 14% of arc
    this.speedometerBg.lineStyle(6, 0x4CAF50);
    this.speedometerBg.beginPath();
    this.speedometerBg.arc(x, y, radius - 6, arcStart, arcStart + arcRange * 0.14);
    this.speedometerBg.strokePath();

    // Yellow zone (5-10) - 14% of arc
    this.speedometerBg.lineStyle(6, 0xFFA000);
    this.speedometerBg.beginPath();
    this.speedometerBg.arc(x, y, radius - 6, arcStart + arcRange * 0.14, arcStart + arcRange * 0.29);
    this.speedometerBg.strokePath();

    // Red zone (10-35) - 71% of arc
    this.speedometerBg.lineStyle(6, 0xF44336);
    this.speedometerBg.beginPath();
    this.speedometerBg.arc(x, y, radius - 6, arcStart + arcRange * 0.29, arcStart + arcRange);
    this.speedometerBg.strokePath();

    // Center dot
    this.speedometerBg.fillStyle(0x333333, 1);
    this.speedometerBg.fillCircle(x, y, 4);

    // Needle (updated each frame)
    this.speedometerNeedle = this.add.graphics();

    // Speed text below gauge
    this.speedText = this.add.text(x, y + radius + 14, '0.0', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#333333',
      fontStyle: 'bold',
    });
    this.speedText.setOrigin(0.5, 0);

    // Warning exclamation marks (hidden by default)
    this.speedWarningLeft = this.add.text(x - 28, y + radius + 14, '!!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#F44336',
      fontStyle: 'bold',
    });
    this.speedWarningLeft.setOrigin(0.5, 0);
    this.speedWarningLeft.setVisible(false);

    this.speedWarningRight = this.add.text(x + 28, y + radius + 14, '!!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#F44336',
      fontStyle: 'bold',
    });
    this.speedWarningRight.setOrigin(0.5, 0);
    this.speedWarningRight.setVisible(false);

    // Label
    const label = this.add.text(x, y - radius - 8, 'SPEED', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '10px',
      color: '#666666',
      fontStyle: 'bold',
    });
    label.setOrigin(0.5, 1);
  }

  private updateSpeedometer(): void {
    // Only show speedometer in debug mode
    const showSpeedometer = this.isDebugMode();
    this.speedometerBg.setVisible(showSpeedometer);
    this.speedometerNeedle.setVisible(showSpeedometer);
    this.speedText.setVisible(showSpeedometer);
    this.speedWarningLeft.setVisible(false);
    this.speedWarningRight.setVisible(false);

    if (!showSpeedometer) return;

    const velocity = this.getShuttleVelocity();
    const speed = velocity.total;

    const x = 44;
    const y = 340;
    const radius = 32;
    const needleLength = radius - 10;

    // Map speed to angle (0-35 mapped to arc)
    const maxSpeed = 35;
    const normalizedSpeed = Math.min(speed / maxSpeed, 1);
    const arcStart = Math.PI * 0.75;
    const arcRange = Math.PI * 1.5;
    const needleAngle = arcStart + normalizedSpeed * arcRange;

    // Draw needle
    this.speedometerNeedle.clear();

    // Needle color based on speed
    let needleColor = 0x4CAF50; // Green
    if (speed > MAX_SAFE_LANDING_VELOCITY * 2) {
      needleColor = 0xF44336; // Red
    } else if (speed > MAX_SAFE_LANDING_VELOCITY) {
      needleColor = 0xFFA000; // Orange
    }

    this.speedometerNeedle.lineStyle(3, needleColor);
    this.speedometerNeedle.beginPath();
    this.speedometerNeedle.moveTo(x, y);
    this.speedometerNeedle.lineTo(
      x + Math.cos(needleAngle) * needleLength,
      y + Math.sin(needleAngle) * needleLength
    );
    this.speedometerNeedle.strokePath();

    // Update text - always black, show red exclamation marks if dangerous
    this.speedText.setText(speed.toFixed(1));
    const isDangerous = speed > MAX_SAFE_LANDING_VELOCITY * 2;
    this.speedWarningLeft.setVisible(isDangerous);
    this.speedWarningRight.setVisible(isDangerous);
  }

  private createAltimeter(): void {
    const x = 44; // Same x as speedometer
    const y = 410; // Below speedometer

    // Background box
    this.altimeterBg = this.add.graphics();
    this.altimeterBg.fillStyle(0xFFFFFF, 0.9);
    this.altimeterBg.fillRoundedRect(x - 35, y - 10, 70, 36, 6);
    this.altimeterBg.lineStyle(2, 0x333333);
    this.altimeterBg.strokeRoundedRect(x - 35, y - 10, 70, 36, 6);

    // Label
    this.altimeterLabel = this.add.text(x, y - 4, 'ALT', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '9px',
      color: '#666666',
      fontStyle: 'bold',
    });
    this.altimeterLabel.setOrigin(0.5, 0);

    // Altitude value
    this.altimeterText = this.add.text(x, y + 10, '0', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '13px',
      color: '#333333',
      fontStyle: 'bold',
    });
    this.altimeterText.setOrigin(0.5, 0);
  }

  private updateAltimeter(): void {
    // Only show altimeter in debug mode
    const showAltimeter = this.isDebugMode();
    this.altimeterBg.setVisible(showAltimeter);
    this.altimeterText.setVisible(showAltimeter);
    this.altimeterLabel.setVisible(showAltimeter);

    if (!showAltimeter) return;

    const altitude = this.getShuttleAltitude();

    // Color based on altitude (higher = more purple/space-like)
    let textColor = '#333333';
    if (altitude > 1000) {
      textColor = '#4B0082'; // Indigo for high altitude
    } else if (altitude > 500) {
      textColor = '#6A5ACD'; // Slate blue
    } else if (altitude > 0) {
      textColor = '#4169E1'; // Royal blue
    }

    this.altimeterText.setColor(textColor);
    this.altimeterText.setText(Math.floor(altitude).toString());
  }

  private updateFuelBar(fuel: number, max: number): void {
    const x = 30;
    const y = 100;
    const width = 28;
    const height = 200;

    const percentage = fuel / max;
    const fillHeight = (height - 8) * percentage;

    this.fuelBar.clear();

    // Color based on fuel level (cartoon bright colors)
    let color = 0x4CAF50; // Green
    let darkerColor = 0x388E3C;
    if (percentage < 0.25) {
      color = 0xF44336; // Red
      darkerColor = 0xC62828;
    } else if (percentage < 0.5) {
      color = 0xFFA000; // Orange
      darkerColor = 0xE65100;
    }

    // Cartoon style fill
    this.fuelBar.fillStyle(color, 1);
    this.fuelBar.fillRoundedRect(x + 4, y + height - 4 - fillHeight, width - 8, fillHeight, 4);

    // Inner highlight
    if (fillHeight > 10) {
      this.fuelBar.fillStyle(0xFFFFFF, 0.3);
      this.fuelBar.fillRoundedRect(x + 6, y + height - 4 - fillHeight + 2, 4, fillHeight - 4, 2);
    }
  }

  private showFuelFullEffect(playerNum: number): void {
    // Create a glowing/pulsing effect on the fuel bar when tank is full
    const x = playerNum === 2 ? 92 : 30;
    const y = 100;
    const width = 28;
    const height = 200;

    // Create outer glow (larger, softer)
    const outerGlow = this.add.graphics();
    outerGlow.fillStyle(0x00FF00, 0.4);
    outerGlow.fillRoundedRect(x - 12, y - 12, width + 24, height + 24, 18);

    // Create inner glow (brighter)
    const innerGlow = this.add.graphics();
    innerGlow.fillStyle(0x4CAF50, 0.7);
    innerGlow.fillRoundedRect(x - 6, y - 6, width + 12, height + 12, 14);

    // Create "FULL" text
    const fullText = this.add.text(x + width / 2, y + height / 2, 'FULL!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#2E7D32',
      strokeThickness: 4,
    });
    fullText.setOrigin(0.5, 0.5);
    fullText.setAngle(-90);

    // Pulsing outer glow effect for 2 seconds
    this.tweens.add({
      targets: outerGlow,
      alpha: { from: 0.5, to: 0.2 },
      scaleX: { from: 1, to: 1.15 },
      scaleY: { from: 1, to: 1.05 },
      duration: 400,
      yoyo: true,
      repeat: 2, // 3 pulses
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.tweens.add({
          targets: outerGlow,
          alpha: 0,
          duration: 300,
          onComplete: () => outerGlow.destroy(),
        });
      },
    });

    // Pulsing inner glow effect
    this.tweens.add({
      targets: innerGlow,
      alpha: { from: 0.8, to: 0.4 },
      duration: 400,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.tweens.add({
          targets: innerGlow,
          alpha: 0,
          duration: 300,
          onComplete: () => innerGlow.destroy(),
        });
      },
    });

    // Animate text - float up and fade after delay
    this.tweens.add({
      targets: fullText,
      alpha: { from: 1, to: 0 },
      y: y + height / 2 - 30,
      delay: 1800,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => fullText.destroy(),
    });
  }

  private createP2FuelGauge(): void {
    const x = 92; // Right of P1's fuel bar
    const y = 100;
    const width = 28;
    const height = 200;

    // Background (cartoon style with rounded rect) - blue tint for P2
    this.p2FuelBarBg = this.add.graphics();
    this.p2FuelBarBg.fillStyle(0xE3F2FD, 0.9); // Light blue bg for P2
    this.p2FuelBarBg.fillRoundedRect(x, y, width, height, 8);
    this.p2FuelBarBg.lineStyle(3, 0x1565C0); // Blue border
    this.p2FuelBarBg.strokeRoundedRect(x, y, width, height, 8);

    // Fuel bar
    this.p2FuelBar = this.add.graphics();

    // Label
    const labelShadow = this.add.text(x + width / 2 + 1, y - 9, 'P2', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '12px',
      color: '#666666',
      fontStyle: 'bold',
    });
    labelShadow.setOrigin(0.5, 1);

    this.p2FuelText = this.add.text(x + width / 2, y - 10, 'P2', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '12px',
      color: '#1565C0', // Blue for P2
      fontStyle: 'bold',
    });
    this.p2FuelText.setOrigin(0.5, 1);
  }

  private updateP2FuelBar(fuel: number, max: number): void {
    if (!this.p2FuelBar) return;

    const x = 92;
    const y = 100;
    const width = 28;
    const height = 200;

    const percentage = fuel / max;
    const fillHeight = (height - 8) * percentage;

    this.p2FuelBar.clear();

    // Color based on fuel level (blue tints for P2)
    let color = 0x42A5F5; // Blue
    if (percentage < 0.25) {
      color = 0xE91E63; // Pink/red
    } else if (percentage < 0.5) {
      color = 0xFFA726; // Orange
    }

    // Cartoon style fill
    this.p2FuelBar.fillStyle(color, 1);
    this.p2FuelBar.fillRoundedRect(x + 4, y + height - 4 - fillHeight, width - 8, fillHeight, 4);

    // Inner highlight
    if (fillHeight > 10) {
      this.p2FuelBar.fillStyle(0xFFFFFF, 0.3);
      this.p2FuelBar.fillRoundedRect(x + 6, y + height - 4 - fillHeight + 2, 4, fillHeight - 4, 2);
    }
  }

  private createInventoryDisplay(): void {
    // Position below timer (40), score (25), and medal indicator (24) with padding
    this.inventoryContainer = this.add.container(GAME_WIDTH - 90, 120);

    // Background panel will be redrawn dynamically based on content
    const bg = this.add.graphics();
    this.inventoryContainer.add(bg);

    // Title placeholder (will be drawn on crate)
    const title = this.add.text(0, 0, '', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '10px',
      color: '#4A3728',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0);

    this.inventoryContainer.add(title);
  }

  private createP2InventoryDisplay(): void {
    // Position on the right side, below P1's inventory
    this.p2InventoryContainer = this.add.container(GAME_WIDTH - 90, 260);

    // Background panel will be redrawn dynamically based on content
    const bg = this.add.graphics();
    this.p2InventoryContainer.add(bg);

    // Title placeholder (will be drawn on crate)
    const title = this.add.text(0, 0, '', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '10px',
      color: '#4A3728',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0);

    this.p2InventoryContainer.add(title);
  }

  // Full display names for items
  private getItemDisplayName(type: string): string {
    const names: Record<string, string> = {
      'COVFEFE': 'Covfefe',
      'BRIBE': 'Bribe',
      'PEACE_MEDAL': 'Peace Medal',
      'BURGER': 'Burger',
      'HAMBERDER': 'Hamberder',
      'DIET_COKE': 'Diet Coke',
      'TRUMP_STEAK': 'Trump Steak',
      'VODKA': 'Vodka',
      'CASINO_CHIP': 'Casino Chip',
      'GOLF_BALL': 'Golf Ball',
      'MATRYOSHKA': 'Matryoshka',
      'CAVIAR': 'Caviar',
      'EXECUTIVE_TIME': 'Exec Time',
    };
    // Convert SNAKE_CASE to Title Case if not in map
    if (!names[type]) {
      return type.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    return names[type];
  }

  private updateInventoryDisplay(items: InventoryItem[], container: Phaser.GameObjects.Container, inventorySys: InventorySystem): void {
    // Clear existing items (except background and title)
    while (container.length > 2) {
      container.removeAt(2, true);
    }

    // Split items into regular cargo and contrabands
    const regularItems = items.filter(item => item.count > 0 && !BOMB_DROPPABLE_TYPES.includes(item.type));
    const contrabandItems = items.filter(item => item.count > 0 && BOMB_DROPPABLE_TYPES.includes(item.type));

    const panelWidth = 130;
    const plankHeight = 16; // Height of each plank row
    const woodLight = 0xD4B896;  // Light wood plank
    const woodDark = 0xB8956E;   // Dark wood plank
    const woodBorder = 0x6B4423; // Dark border
    const textColor = '#4A3520'; // Dark brown text

    // Count total rows needed: title + cargo items + total + bombs header + bomb items
    let totalRows = 1; // Title row
    if (regularItems.length > 0) {
      totalRows += regularItems.length;
      const totalValue = inventorySys.getTotalFuelValue();
      if (totalValue > 0) {
        totalRows += 1; // Total row
      }
    }
    if (contrabandItems.length > 0) {
      totalRows += 1 + contrabandItems.length; // Header + items
    }

    const hasContent = regularItems.length > 0 || contrabandItems.length > 0;
    if (!hasContent) totalRows = 2; // Minimum rows for empty crate

    const panelHeight = totalRows * plankHeight + 4; // +4 for top/bottom padding

    // Draw wooden crate background
    const bg = container.getAt(0) as Phaser.GameObjects.Graphics;
    bg.clear();

    // Main crate body with border
    bg.fillStyle(woodBorder, 1);
    bg.fillRect(-panelWidth / 2, -6, panelWidth, panelHeight);

    // Draw alternating wood planks
    for (let row = 0; row < totalRows; row++) {
      const y = -4 + row * plankHeight;
      const plankColor = (row % 2 === 0) ? woodLight : woodDark;
      bg.fillStyle(plankColor, 1);
      bg.fillRect(-panelWidth / 2 + 3, y, panelWidth - 6, plankHeight - 1);
    }

    // "CARGO" stamped text on first plank
    const isP2 = container === this.p2InventoryContainer;
    const titleText = this.playerCount === 2 ? (isP2 ? 'P2 CARGO' : 'P1 CARGO') : 'CARGO';
    const title = container.getAt(1) as Phaser.GameObjects.Text;
    title.setText(titleText);
    title.setStyle({
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '10px',
      color: textColor,
      fontStyle: 'bold',
    });
    title.setY(-4 + (plankHeight - 10) / 2); // Center in first plank

    let currentRow = 1; // Start after title

    // Regular cargo items - one per plank
    if (regularItems.length > 0) {
      for (let i = 0; i < regularItems.length; i++) {
        const item = regularItems[i];
        const name = this.getItemDisplayName(item.type);
        const y = -4 + currentRow * plankHeight + (plankHeight - 10) / 2;
        const text = this.add.text(0, y, `${name} ×${item.count}`, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '10px',
          color: textColor,
        });
        text.setOrigin(0.5, 0);
        container.add(text);
        currentRow++;
      }

      // Total fuel value on its own plank
      const totalValue = inventorySys.getTotalFuelValue();
      if (totalValue > 0) {
        const y = -4 + currentRow * plankHeight + (plankHeight - 10) / 2;
        const totalText = this.add.text(0, y, `Total: ${formatDollarValue(totalValue)}`, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '10px',
          color: '#2E5D1A',
          fontStyle: 'bold',
        });
        totalText.setOrigin(0.5, 0);
        container.add(totalText);
        currentRow++;
      }
    }

    // Bombs section
    if (contrabandItems.length > 0) {
      // Bombs header on its own plank
      const headerY = -4 + currentRow * plankHeight + (plankHeight - 10) / 2;
      const bombHeader = this.add.text(0, headerY, '💣 BOMBS', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '9px',
        color: '#8B0000',
        fontStyle: 'bold',
      });
      bombHeader.setOrigin(0.5, 0);
      container.add(bombHeader);
      currentRow++;

      // Bomb items - one per plank
      for (let i = 0; i < contrabandItems.length; i++) {
        const item = contrabandItems[i];
        const name = this.getItemDisplayName(item.type);
        const y = -4 + currentRow * plankHeight + (plankHeight - 10) / 2;
        const text = this.add.text(0, y, `${name} ×${item.count}`, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '10px',
          color: '#7A2020',
        });
        text.setOrigin(0.5, 0);
        container.add(text);
        currentRow++;
      }
    }
  }

  private createProgressBar(): void {
    const x = GAME_WIDTH / 2 - 200;
    const y = GAME_HEIGHT - 45;
    const width = 400;
    const height = 24;

    // Background
    this.progressBar = this.add.graphics();

    // Labels with shadow effect
    const usaLabelShadow = this.add.text(x + 1, y - 4, 'USA', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#666666',
      fontStyle: 'bold',
    });
    usaLabelShadow.setOrigin(0, 1);

    const usaLabel = this.add.text(x, y - 5, 'USA', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#228B22',
      fontStyle: 'bold',
    });
    usaLabel.setOrigin(0, 1);

    const russiaLabelShadow = this.add.text(x + width + 1, y - 4, 'RUSSIA', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#666666',
      fontStyle: 'bold',
    });
    russiaLabelShadow.setOrigin(1, 1);

    const russiaLabel = this.add.text(x + width, y - 5, 'RUSSIA', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#DC143C',
      fontStyle: 'bold',
    });
    russiaLabel.setOrigin(1, 1);

    this.progressText = this.add.text(x + width / 2, y + height + 5, '', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#333333',
      fontStyle: 'bold',
    });
    this.progressText.setOrigin(0.5, 0);
  }

  private updateProgressBar(): void {
    const progress = this.getProgress();

    // Only update if progress changed significantly (avoid flickering from constant redraws)
    if (Math.abs(progress - this.lastProgress) < 0.001) {
      return;
    }
    this.lastProgress = progress;

    const x = GAME_WIDTH / 2 - 200;
    const y = GAME_HEIGHT - 45;
    const width = 400;
    const height = 24;
    const fillWidth = (width - 6) * progress;

    // Redraw with progress
    this.progressBar.clear();

    // Background (cartoon style white with border)
    this.progressBar.fillStyle(0xFFFFFF, 0.95);
    this.progressBar.fillRoundedRect(x, y, width, height, 12);
    this.progressBar.lineStyle(3, 0x333333);
    this.progressBar.strokeRoundedRect(x, y, width, height, 12);

    // Progress fill (gradient from green to red)
    const r = Math.floor(progress * 220);
    const g = Math.floor((1 - progress) * 180 + 60);
    const b = Math.floor((1 - progress) * 34);
    const color = (r << 16) | (g << 8) | b;

    if (fillWidth > 8) {
      this.progressBar.fillStyle(color, 1);
      this.progressBar.fillRoundedRect(x + 3, y + 3, fillWidth, height - 6, 9);

      // Inner highlight
      this.progressBar.fillStyle(0xFFFFFF, 0.3);
      this.progressBar.fillRoundedRect(x + 5, y + 5, fillWidth - 4, 6, 3);
    }

    // Shuttle indicator (little triangle pointer)
    this.progressBar.fillStyle(0x333333, 1);
    this.progressBar.fillTriangle(
      x + 3 + fillWidth, y - 3,
      x + 3 + fillWidth - 6, y - 10,
      x + 3 + fillWidth + 6, y - 10
    );

    // Update text
    const percentage = Math.floor(progress * 100);
    this.progressText.setText(`${percentage}% to Russia`);
  }

  private createTimer(): void {
    // Timer in upper right corner
    this.timerBg = this.add.graphics();
    this.timerBg.fillStyle(0xFFFFFF, 0.9);
    this.timerBg.fillRoundedRect(GAME_WIDTH - 110, 10, 100, 40, 8);
    this.timerBg.lineStyle(2, 0x333333);
    this.timerBg.strokeRoundedRect(GAME_WIDTH - 110, 10, 100, 40, 8);

    this.timerText = this.add.text(GAME_WIDTH - 60, 30, '00:00', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '20px',
      color: '#333333',
      fontStyle: 'bold',
    });
    this.timerText.setOrigin(0.5, 0.5);
  }

  private createScoreCounter(): void {
    // Score counter below timer (same width as timer)
    this.scoreBg = this.add.graphics();
    this.scoreBg.fillStyle(0xFFFFFF, 0.9);
    this.scoreBg.fillRoundedRect(GAME_WIDTH - 110, 55, 100, 25, 8);
    this.scoreBg.lineStyle(2, 0x333333);
    this.scoreBg.strokeRoundedRect(GAME_WIDTH - 110, 55, 100, 25, 8);

    this.scoreText = this.add.text(GAME_WIDTH - 60, 67, '0', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#333333',
      fontStyle: 'bold',
    });
    this.scoreText.setOrigin(0.5, 0.5);
  }

  private updateScore(score: number): void {
    const oldScore = this.currentScore;
    this.currentScore = score;
    const delta = score - oldScore;

    // Animate the score text with a pop effect
    this.tweens.add({
      targets: this.scoreText,
      scale: { from: 1.4, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Color based on increase/decrease
    if (delta > 0) {
      // Score increased - green flash
      this.scoreText.setColor('#228B22');
      this.scoreBg.clear();
      this.scoreBg.fillStyle(0x90EE90, 0.95);
      this.scoreBg.fillRoundedRect(GAME_WIDTH - 110, 55, 100, 25, 8);
      this.scoreBg.lineStyle(2, 0x228B22);
      this.scoreBg.strokeRoundedRect(GAME_WIDTH - 110, 55, 100, 25, 8);
    } else if (delta < 0) {
      // Score decreased - red flash
      this.scoreText.setColor('#DC143C');
      this.scoreBg.clear();
      this.scoreBg.fillStyle(0xFFB6C1, 0.95);
      this.scoreBg.fillRoundedRect(GAME_WIDTH - 110, 55, 100, 25, 8);
      this.scoreBg.lineStyle(2, 0xDC143C);
      this.scoreBg.strokeRoundedRect(GAME_WIDTH - 110, 55, 100, 25, 8);
    }

    // Update text
    this.scoreText.setText(score.toString());

    // Return to normal after brief flash
    this.time.delayedCall(400, () => {
      this.scoreText.setColor('#333333');
      this.scoreBg.clear();
      this.scoreBg.fillStyle(0xFFFFFF, 0.9);
      this.scoreBg.fillRoundedRect(GAME_WIDTH - 110, 55, 100, 25, 8);
      this.scoreBg.lineStyle(2, 0x333333);
      this.scoreBg.strokeRoundedRect(GAME_WIDTH - 110, 55, 100, 25, 8);
    });
  }

  private createMedalIndicator(): void {
    // Medal indicator (hidden by default, shows when medal is acquired)
    this.medalIndicator = this.add.container(GAME_WIDTH - 60, 92);
    this.medalIndicator.setVisible(false);
    this.medalIndicator.setDepth(100); // Ensure it's always on top

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0xFFD700, 0.9);
    bg.fillRoundedRect(-50, -12, 100, 24, 6);
    bg.lineStyle(2, 0xB8860B);
    bg.strokeRoundedRect(-50, -12, 100, 24, 6);
    this.medalIndicator.add(bg);

    // Text
    const text = this.add.text(0, 0, '🏅 PEACE MEDAL', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#333333',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    this.medalIndicator.add(text);
  }

  private updateMedalIndicator(): void {
    const hasMedal = this.hasPeaceMedal();
    if (hasMedal !== this.lastMedalState) {
      this.lastMedalState = hasMedal;
      this.medalIndicator.setVisible(hasMedal);
    }
  }

  private updateTimer(): void {
    const elapsed = this.getElapsedTime();
    const seconds = Math.floor(elapsed / 1000);

    // Only update if second changed
    if (seconds === this.lastTime) {
      return;
    }
    this.lastTime = seconds;

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.timerText.setText(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
  }

  private createKillTally(): void {
    // WW2-style kill tally display at true top left corner (with margin)
    const x = 15;
    const y = 20;

    this.killTallyContainer = this.add.container(x, y);

    // Background panel - weathered metal look
    const bg = this.add.graphics();
    bg.fillStyle(0x4A5D23, 0.9); // Military olive drab
    bg.fillRoundedRect(0, -12, 160, 28, 4);
    bg.lineStyle(2, 0x2F3D15); // Darker border
    bg.strokeRoundedRect(0, -12, 160, 28, 4);
    // Add some weathering lines
    bg.lineStyle(1, 0x5C7030, 0.5);
    bg.lineBetween(5, -5, 20, -5);
    bg.lineBetween(145, 5, 155, 5);
    this.killTallyContainer.add(bg);

    // P1 side (left) - rocket icon
    const p1Label = this.add.text(10, 0, '🚀', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
    });
    p1Label.setOrigin(0.5, 0.5);
    this.killTallyContainer.add(p1Label);

    // P1 tally graphics
    this.p1TallyGraphics = this.add.graphics();
    this.killTallyContainer.add(this.p1TallyGraphics);

    // P2 side - UFO icon
    const p2Label = this.add.text(85, 0, '🛸', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
    });
    p2Label.setOrigin(0.5, 0.5);
    this.killTallyContainer.add(p2Label);

    // P2 tally graphics
    this.p2TallyGraphics = this.add.graphics();
    this.killTallyContainer.add(this.p2TallyGraphics);

    // In dogfight mode, add "FIRST TO X" indicator and show immediately
    if (this.gameMode === 'dogfight') {
      const firstTo10 = this.add.text(80, -28, `FIRST TO ${DOGFIGHT_CONFIG.KILLS_TO_WIN}`, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '12px',
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      });
      firstTo10.setOrigin(0.5, 0.5);
      this.killTallyContainer.add(firstTo10);
      this.killTallyContainer.setVisible(true);
    } else {
      // Start hidden - only show after first kill in normal mode
      this.killTallyContainer.setVisible(false);
    }

    // Initial display with current kill counts
    const { p1Kills, p2Kills } = this.getKillCounts();
    this.updateKillTally(p1Kills, p2Kills);
  }

  private drawTallyMarks(graphics: Phaser.GameObjects.Graphics, kills: number, startX: number, color: number): void {
    graphics.clear();

    if (kills === 0) {
      // Draw a dash for zero
      graphics.lineStyle(2, color, 0.5);
      graphics.lineBetween(startX, 0, startX + 8, 0);
      return;
    }

    const groups = Math.floor(kills / 5);
    const remainder = kills % 5;
    const lineHeight = 14;
    const lineSpacing = 5;
    const groupSpacing = 12;

    let currentX = startX;

    // Draw complete groups of 5 (4 vertical lines with diagonal crossing through)
    for (let g = 0; g < groups; g++) {
      // Draw 4 vertical lines
      graphics.lineStyle(2, color, 1);
      for (let i = 0; i < 4; i++) {
        const lx = currentX + i * lineSpacing;
        graphics.lineBetween(lx, -lineHeight / 2, lx, lineHeight / 2);
      }
      // Draw diagonal line crossing through all 4
      const diagStartX = currentX - 2;
      const diagEndX = currentX + 3 * lineSpacing + 2;
      graphics.lineBetween(diagStartX, lineHeight / 2, diagEndX, -lineHeight / 2);

      currentX += 4 * lineSpacing + groupSpacing;
    }

    // Draw remaining vertical lines (1-4)
    graphics.lineStyle(2, color, 1);
    for (let i = 0; i < remainder; i++) {
      const lx = currentX + i * lineSpacing;
      graphics.lineBetween(lx, -lineHeight / 2, lx, lineHeight / 2);
    }
  }

  private updateKillTally(p1Kills: number, p2Kills: number): void {
    if (!this.p1TallyGraphics || !this.p2TallyGraphics) return;

    // Show tally container once there's at least one kill
    if ((p1Kills > 0 || p2Kills > 0) && this.killTallyContainer) {
      this.killTallyContainer.setVisible(true);
    }

    // Draw P1 tally marks (white)
    this.drawTallyMarks(this.p1TallyGraphics, p1Kills, 23, 0xFFFFFF);

    // Draw P2 tally marks (light blue)
    this.drawTallyMarks(this.p2TallyGraphics, p2Kills, 98, 0x87CEEB);
  }

  private createControlsHint(): void {
    const text = this.add.text(GAME_WIDTH - 20, GAME_HEIGHT - 20,
      '↑ Thrust  ←→ Rotate  SPACE Landing Gear', {
      fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '12px',
      color: '#666666',
    });
    text.setOrigin(1, 1);
  }

  update(): void {
    this.updateProgressBar();
    this.updateTimer();
    this.updateMedalIndicator();
    this.updateSpeedometer();
    this.updateAltimeter();
  }
}
