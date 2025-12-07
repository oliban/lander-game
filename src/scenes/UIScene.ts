import Phaser from 'phaser';
import { FuelSystem } from '../systems/FuelSystem';
import { InventorySystem, InventoryItem } from '../systems/InventorySystem';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, MAX_SAFE_LANDING_VELOCITY, BOMB_DROPPABLE_TYPES } from '../constants';

interface UISceneData {
  fuelSystem: FuelSystem;
  inventorySystem: InventorySystem;
  getShuttleVelocity: () => { x: number; y: number; total: number };
  getProgress: () => number;
  getCurrentCountry: () => { name: string; color: number };
  getLegsExtended: () => boolean;
  getElapsedTime: () => number;
  hasPeaceMedal?: () => boolean;
}

export class UIScene extends Phaser.Scene {
  private fuelSystem!: FuelSystem;
  private inventorySystem!: InventorySystem;
  private getShuttleVelocity!: () => { x: number; y: number; total: number };
  private getProgress!: () => number;
  private getLegsExtended!: () => boolean;
  private getElapsedTime!: () => number;
  private hasPeaceMedal!: () => boolean;

  private fuelBarBg!: Phaser.GameObjects.Graphics;
  private fuelBar!: Phaser.GameObjects.Graphics;
  private fuelText!: Phaser.GameObjects.Text;
  private velocityText!: Phaser.GameObjects.Text;
  private inventoryContainer!: Phaser.GameObjects.Container;
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

    this.createFuelGauge();
    this.createVelocityMeter();
    this.createGearIndicator();
    this.createTimer();
    this.createScoreCounter();
    this.createMedalIndicator();
    this.createInventoryDisplay();
    this.createProgressBar();
    this.createControlsHint();

    // Listen for inventory changes
    this.inventorySystem.setOnInventoryChange((items) => {
      this.updateInventoryDisplay(items);
    });

    // Listen for fuel changes
    this.fuelSystem.setOnFuelChange((fuel, max) => {
      this.updateFuelBar(fuel, max);
    });

    // Listen for destruction score updates from GameScene
    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('destructionScore', (score: number) => {
      this.updateScore(score);
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

    // Label with shadow
    const labelShadow = this.add.text(x + width / 2 + 1, y - 9, 'FUEL', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '12px',
      color: '#666666',
      fontStyle: 'bold',
    });
    labelShadow.setOrigin(0.5, 1);

    this.fuelText = this.add.text(x + width / 2, y - 10, 'FUEL', {
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
    this.inventoryContainer = this.add.container(GAME_WIDTH - 90, 100);

    // Background panel will be redrawn dynamically based on content
    const bg = this.add.graphics();
    this.inventoryContainer.add(bg);

    const title = this.add.text(0, 0, 'CARGO', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '12px',
      color: '#333333',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0);

    this.inventoryContainer.add(title);
  }

  // Short abbreviations for item display
  private getItemAbbrev(type: string): string {
    const abbrevs: Record<string, string> = {
      'COVFEFE': 'COV',
      'BRIBE': 'BRB',
      'PEACE_MEDAL': '🏅',
      'BURGER': '🍔',
      'HAMBERDER': '🍔',
      'DIET_COKE': '🥤',
      'TRUMP_STEAK': '🥩',
      'VODKA': '🍸',
    };
    return abbrevs[type] || type.substring(0, 3);
  }

  private updateInventoryDisplay(items: InventoryItem[]): void {
    // Clear existing items (except background and title)
    while (this.inventoryContainer.length > 2) {
      this.inventoryContainer.removeAt(2, true);
    }

    // Split items into regular cargo and contrabands
    const regularItems = items.filter(item => item.count > 0 && !BOMB_DROPPABLE_TYPES.includes(item.type));
    const contrabandItems = items.filter(item => item.count > 0 && BOMB_DROPPABLE_TYPES.includes(item.type));

    let yOffset = 18;
    const panelWidth = 160;
    const colWidth = 75;

    // Regular cargo items - 2 column grid
    if (regularItems.length > 0) {
      for (let i = 0; i < regularItems.length; i++) {
        const item = regularItems[i];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const xPos = col === 0 ? -colWidth / 2 - 5 : colWidth / 2 - 5;
        const yPos = yOffset + row * 18;

        const colorHex = '#' + item.color.toString(16).padStart(6, '0');
        const abbrev = this.getItemAbbrev(item.type);
        const text = this.add.text(xPos, yPos, `${abbrev}×${item.count}`, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '11px',
          color: colorHex,
          fontStyle: 'bold',
        });
        text.setOrigin(0.5, 0);
        this.inventoryContainer.add(text);
      }
      yOffset += Math.ceil(regularItems.length / 2) * 18 + 4;
    }

    // Contrabands section - more compact with emoji grid
    if (contrabandItems.length > 0) {
      // Separator line
      const sep = this.add.graphics();
      sep.lineStyle(1, 0xCC0000, 0.5);
      sep.lineBetween(-panelWidth / 2 + 10, yOffset, panelWidth / 2 - 10, yOffset);
      this.inventoryContainer.add(sep);
      yOffset += 6;

      // Contrabands header
      const contrabandHeader = this.add.text(0, yOffset, '💣 BOMBS', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10px',
        color: '#8B0000',
        fontStyle: 'bold',
      });
      contrabandHeader.setOrigin(0.5, 0);
      this.inventoryContainer.add(contrabandHeader);
      yOffset += 14;

      // Contraband items in 2-column grid
      for (let i = 0; i < contrabandItems.length; i++) {
        const item = contrabandItems[i];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const xPos = col === 0 ? -colWidth / 2 - 5 : colWidth / 2 - 5;
        const yPos = yOffset + row * 18;

        const abbrev = this.getItemAbbrev(item.type);
        const text = this.add.text(xPos, yPos, `${abbrev}×${item.count}`, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '11px',
          color: '#CC3333',
          fontStyle: 'bold',
        });
        text.setOrigin(0.5, 0);
        this.inventoryContainer.add(text);
      }
      yOffset += Math.ceil(contrabandItems.length / 2) * 18 + 2;
    }

    // Total fuel value - compact
    const totalValue = this.inventorySystem.getTotalFuelValue();
    if (totalValue > 0) {
      const totalText = this.add.text(0, yOffset, `⛽ ${totalValue}`, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11px',
        color: '#2E7D32',
        fontStyle: 'bold',
      });
      totalText.setOrigin(0.5, 0);
      this.inventoryContainer.add(totalText);
      yOffset += 16;
    }

    // Redraw background to fit content
    const bg = this.inventoryContainer.getAt(0) as Phaser.GameObjects.Graphics;
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

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0xFFD700, 0.9);
    bg.fillRoundedRect(-50, -12, 100, 24, 6);
    bg.lineStyle(2, 0xB8860B);
    bg.strokeRoundedRect(-50, -12, 100, 24, 6);
    this.medalIndicator.add(bg);

    // Text
    const text = this.add.text(0, 0, 'PEACE MEDAL', {
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
