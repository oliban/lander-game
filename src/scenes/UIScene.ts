import Phaser from 'phaser';
import { FuelSystem } from '../systems/FuelSystem';
import { InventorySystem, InventoryItem } from '../systems/InventorySystem';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, MAX_SAFE_LANDING_VELOCITY, BOMB_DROPPABLE_TYPES } from '../constants';
import { AchievementPopup } from '../ui/AchievementPopup';
import { getAchievementSystem } from '../systems/AchievementSystem';
import { Achievement } from '../data/achievements';

interface UISceneData {
  fuelSystem: FuelSystem;
  inventorySystem: InventorySystem;
  getShuttleVelocity: () => { x: number; y: number; total: number };
  getProgress: () => number;
  getCurrentCountry: () => { name: string; color: number };
  getLegsExtended: () => boolean;
  getElapsedTime: () => number;
  hasPeaceMedal?: () => boolean;
  // P2 data for 2-player mode
  playerCount?: number;
  fuelSystem2?: FuelSystem | null;
  inventorySystem2?: InventorySystem | null;
  getP2Velocity?: () => { x: number; y: number; total: number };
  getP2LegsExtended?: () => boolean;
  isP2Active?: () => boolean;
  // Kill tally for 2-player mode
  getKillCounts?: () => { p1Kills: number; p2Kills: number };
}

export class UIScene extends Phaser.Scene {
  private fuelSystem!: FuelSystem;
  private inventorySystem!: InventorySystem;
  private getShuttleVelocity!: () => { x: number; y: number; total: number };
  private getProgress!: () => number;
  private getLegsExtended!: () => boolean;
  private getElapsedTime!: () => number;
  private hasPeaceMedal!: () => boolean;
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
  private velocityText!: Phaser.GameObjects.Text;
  private inventoryContainer!: Phaser.GameObjects.Container;
  private p2InventoryContainer: Phaser.GameObjects.Container | null = null;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private gearIndicator!: Phaser.GameObjects.Text;
  private gearBg!: Phaser.GameObjects.Graphics;
  private timerText!: Phaser.GameObjects.Text;
  private timerBg!: Phaser.GameObjects.Graphics;
  private medalIndicator!: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private scoreBg!: Phaser.GameObjects.Graphics;

  private lastProgress: number = -1;
  private lastVelocity: number = -1;
  private lastLegsState: boolean = false;
  private lastTime: number = -1;
  private lastMedalState: boolean = false;
  private currentScore: number = 0;
  // P2 UI elements
  private p2FuelBarBg: Phaser.GameObjects.Graphics | null = null;
  private p2FuelBar: Phaser.GameObjects.Graphics | null = null;
  private p2FuelText: Phaser.GameObjects.Text | null = null;
  private lastP2Velocity: number = -1;
  private lastP2LegsState: boolean = false;
  // Kill tally (2-player mode)
  private killTallyContainer: Phaser.GameObjects.Container | null = null;
  private p1TallyGraphics: Phaser.GameObjects.Graphics | null = null;
  private p2TallyGraphics: Phaser.GameObjects.Graphics | null = null;
  private getKillCounts: () => { p1Kills: number; p2Kills: number } = () => ({ p1Kills: 0, p2Kills: 0 });

  // Achievement popup (displayed in UI scene so it's on top of everything)
  private achievementPopup!: AchievementPopup;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(data: UISceneData): void {
    this.fuelSystem = data.fuelSystem;
    this.inventorySystem = data.inventorySystem;
    this.getShuttleVelocity = data.getShuttleVelocity;
    this.getProgress = data.getProgress;
    this.getLegsExtended = data.getLegsExtended;
    this.getElapsedTime = data.getElapsedTime;
    this.hasPeaceMedal = data.hasPeaceMedal || (() => false);

    // P2 data
    this.playerCount = data.playerCount ?? 1;
    this.fuelSystem2 = data.fuelSystem2 ?? null;
    this.inventorySystem2 = data.inventorySystem2 ?? null;
    this.getP2Velocity = data.getP2Velocity ?? (() => ({ x: 0, y: 0, total: 0 }));
    this.getP2LegsExtended = data.getP2LegsExtended ?? (() => false);
    this.isP2Active = data.isP2Active ?? (() => false);
    this.getKillCounts = data.getKillCounts ?? (() => ({ p1Kills: 0, p2Kills: 0 }));

    // Reset state variables (Phaser may reuse scene instances)
    this.lastVelocity = -1;
    this.lastLegsState = false;
    this.lastTime = -1;
    this.lastMedalState = false;
    this.currentScore = 0;
    this.lastP2Velocity = -1;
    this.lastP2LegsState = false;
    this.p2FuelBarBg = null;
    this.p2FuelBar = null;
    this.p2FuelText = null;
    this.p2InventoryContainer = null;
    this.killTallyContainer = null;
    this.p1TallyGraphics = null;
    this.p2TallyGraphics = null;

    this.createFuelGauge();
    this.createVelocityMeter();
    this.createGearIndicator();
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

  private createVelocityMeter(): void {
    // Background box
    const velBg = this.add.graphics();
    velBg.fillStyle(0xFFFFFF, 0.9);
    velBg.fillRoundedRect(20, 315, 70, 50, 8);
    velBg.lineStyle(2, 0x333333);
    velBg.strokeRoundedRect(20, 315, 70, 50, 8);

    this.velocityText = this.add.text(55, 340, '', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '12px',
      color: '#333333',
      fontStyle: 'bold',
      align: 'center',
    });
    this.velocityText.setOrigin(0.5, 0.5);
  }

  private updateVelocityMeter(): void {
    const velocity = this.getShuttleVelocity();
    const total = velocity.total;

    // Only update if velocity changed significantly
    if (Math.abs(total - this.lastVelocity) < 0.1) {
      return;
    }
    this.lastVelocity = total;

    let color = '#4CAF50'; // Green
    let status = 'SAFE';

    if (total > MAX_SAFE_LANDING_VELOCITY * 1.5) {
      color = '#F44336'; // Red
      status = 'DANGER';
    } else if (total > MAX_SAFE_LANDING_VELOCITY) {
      color = '#FFA000'; // Orange
      status = 'CAUTION';
    }

    this.velocityText.setText(`VEL: ${total.toFixed(1)}\n${status}`);
    this.velocityText.setColor(color);
  }

  private createInventoryDisplay(): void {
    // Position below timer (40), score (25), and medal indicator (24) with padding
    this.inventoryContainer = this.add.container(GAME_WIDTH - 90, 120);

    // Background panel will be redrawn dynamically based on content
    const bg = this.add.graphics();
    this.inventoryContainer.add(bg);

    // Show 'P1 CARGO' in 2-player mode, 'CARGO' in single player
    const titleText = this.playerCount === 2 ? 'P1 CARGO' : 'CARGO';
    const title = this.add.text(0, 0, titleText, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '12px',
      color: '#333333',
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

    const title = this.add.text(0, 0, 'P2 CARGO', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '12px',
      color: '#1565C0', // Blue to match P2's shuttle tint
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

    let yOffset = 18;
    const panelWidth = 140;

    // Regular cargo items - single column with full names
    if (regularItems.length > 0) {
      for (let i = 0; i < regularItems.length; i++) {
        const item = regularItems[i];
        const colorHex = '#' + item.color.toString(16).padStart(6, '0');
        const name = this.getItemDisplayName(item.type);
        const text = this.add.text(0, yOffset, `${name} ×${item.count}`, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '11px',
          color: colorHex,
          fontStyle: 'bold',
        });
        text.setOrigin(0.5, 0);
        container.add(text);
        yOffset += 16;
      }
      yOffset += 2;
    }

    // Contrabands section - single column
    if (contrabandItems.length > 0) {
      // Separator line
      const sep = this.add.graphics();
      sep.lineStyle(1, 0xCC0000, 0.5);
      sep.lineBetween(-panelWidth / 2 + 10, yOffset, panelWidth / 2 - 10, yOffset);
      container.add(sep);
      yOffset += 6;

      // Contrabands header
      const contrabandHeader = this.add.text(0, yOffset, '💣 BOMBS', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10px',
        color: '#8B0000',
        fontStyle: 'bold',
      });
      contrabandHeader.setOrigin(0.5, 0);
      container.add(contrabandHeader);
      yOffset += 14;

      // Contraband items in single column
      for (let i = 0; i < contrabandItems.length; i++) {
        const item = contrabandItems[i];
        const name = this.getItemDisplayName(item.type);
        const text = this.add.text(0, yOffset, `${name} ×${item.count}`, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '11px',
          color: '#CC3333',
          fontStyle: 'bold',
        });
        text.setOrigin(0.5, 0);
        container.add(text);
        yOffset += 16;
      }
      yOffset += 2;
    }

    // Total fuel value
    const totalValue = inventorySys.getTotalFuelValue();
    if (totalValue > 0) {
      const totalText = this.add.text(0, yOffset, `⛽ ${totalValue}`, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11px',
        color: '#2E7D32',
        fontStyle: 'bold',
      });
      totalText.setOrigin(0.5, 0);
      container.add(totalText);
      yOffset += 16;
    }

    // Redraw background to fit content
    const bg = container.getAt(0) as Phaser.GameObjects.Graphics;
    const hasContent = regularItems.length > 0 || contrabandItems.length > 0 || totalValue > 0;
    const panelHeight = hasContent ? yOffset + 8 : 30;
    bg.clear();
    bg.fillStyle(0xFFFFFF, 0.9);
    bg.fillRoundedRect(-panelWidth / 2, -10, panelWidth, panelHeight, 10);
    bg.lineStyle(2, 0x333333);
    bg.strokeRoundedRect(-panelWidth / 2, -10, panelWidth, panelHeight, 10);
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

  private createGearIndicator(): void {
    // Background box below velocity meter
    this.gearBg = this.add.graphics();
    this.gearBg.fillStyle(0xFFFFFF, 0.9);
    this.gearBg.fillRoundedRect(20, 375, 70, 35, 8);
    this.gearBg.lineStyle(2, 0x333333);
    this.gearBg.strokeRoundedRect(20, 375, 70, 35, 8);

    this.gearIndicator = this.add.text(55, 392, 'GEAR\nUP', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#F44336',
      fontStyle: 'bold',
      align: 'center',
    });
    this.gearIndicator.setOrigin(0.5, 0.5);
  }

  private updateGearIndicator(): void {
    const legsExtended = this.getLegsExtended();

    // Only update if state changed
    if (legsExtended === this.lastLegsState) {
      return;
    }
    this.lastLegsState = legsExtended;

    if (legsExtended) {
      this.gearIndicator.setText('GEAR\nDOWN');
      this.gearIndicator.setColor('#4CAF50');
      this.gearBg.clear();
      this.gearBg.fillStyle(0xE8F5E9, 0.95);
      this.gearBg.fillRoundedRect(20, 375, 70, 35, 8);
      this.gearBg.lineStyle(2, 0x4CAF50);
      this.gearBg.strokeRoundedRect(20, 375, 70, 35, 8);
    } else {
      this.gearIndicator.setText('GEAR\nUP');
      this.gearIndicator.setColor('#F44336');
      this.gearBg.clear();
      this.gearBg.fillStyle(0xFFEBEE, 0.95);
      this.gearBg.fillRoundedRect(20, 375, 70, 35, 8);
      this.gearBg.lineStyle(2, 0xF44336);
      this.gearBg.strokeRoundedRect(20, 375, 70, 35, 8);
    }
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
    this.updateVelocityMeter();
    this.updateProgressBar();
    this.updateGearIndicator();
    this.updateTimer();
    this.updateMedalIndicator();
  }
}
