import Phaser from 'phaser';
import { InventorySystem } from '../systems/InventorySystem';
import { FuelSystem } from '../systems/FuelSystem';
import { GAME_WIDTH, GAME_HEIGHT, COLLECTIBLE_TYPES } from '../constants';
import { CollectibleType } from '../objects/Collectible';

interface TradingSceneData {
  inventorySystem: InventorySystem;
  fuelSystem: FuelSystem;
  padName: string;
  landingQuality: 'perfect' | 'good';
  onComplete: () => void;
}

const SATIRICAL_QUOTES = [
  "\"This is the best trade deal in the history of trade deals!\"",
  "\"Nobody trades better than me, believe me.\"",
  "\"We're making fuel great again!\"",
  "\"I know more about fuel than anybody.\"",
  "\"This is tremendous. Just tremendous.\"",
  "\"We have the best cargo. Everyone says so.\"",
  "\"I'm like, really smart about fuel trading.\"",
];

export class TradingScene extends Phaser.Scene {
  private inventorySystem!: InventorySystem;
  private fuelSystem!: FuelSystem;
  private onComplete!: () => void;
  private landingBonus: number = 1;
  private selectedItems: Map<CollectibleType, number> = new Map();
  private fuelPreview!: Phaser.GameObjects.Text;
  private quoteText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'TradingScene' });
  }

  create(data: TradingSceneData): void {
    this.inventorySystem = data.inventorySystem;
    this.fuelSystem = data.fuelSystem;
    this.onComplete = data.onComplete;
    this.landingBonus = data.landingQuality === 'perfect' ? 1.5 : 1.2;

    // Reset selection
    this.selectedItems.clear();

    // Sky blue background (in case GameScene isn't rendering)
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x87CEEB,
      1
    );

    // Semi-transparent overlay
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.5
    );

    // Panel (cartoon style with white background)
    const panel = this.add.graphics();
    panel.fillStyle(0xFFFFFF, 0.98);
    panel.fillRoundedRect(GAME_WIDTH / 2 - 300, 80, 600, 500, 20);
    panel.lineStyle(4, 0x333333);
    panel.strokeRoundedRect(GAME_WIDTH / 2 - 300, 80, 600, 500, 20);

    // Title with shadow
    const titleShadow = this.add.text(GAME_WIDTH / 2 + 2, 112, `FUEL STOP: ${data.padName}`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '28px',
      color: '#666666',
      fontStyle: 'bold',
    });
    titleShadow.setOrigin(0.5, 0);

    const title = this.add.text(GAME_WIDTH / 2, 110, `FUEL STOP: ${data.padName}`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '28px',
      color: '#D4380D',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0);

    // Landing quality bonus
    const bonusText = data.landingQuality === 'perfect'
      ? 'PERFECT LANDING! +50% bonus'
      : 'Good landing! +20% bonus';
    const bonusColor = data.landingQuality === 'perfect' ? '#4CAF50' : '#FFA000';

    const bonus = this.add.text(GAME_WIDTH / 2, 145, bonusText, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '16px',
      color: bonusColor,
      fontStyle: 'bold',
    });
    bonus.setOrigin(0.5, 0);

    // Random quote
    const quote = SATIRICAL_QUOTES[Math.floor(Math.random() * SATIRICAL_QUOTES.length)];
    this.quoteText = this.add.text(GAME_WIDTH / 2, 175, quote, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#666666',
      fontStyle: 'italic',
    });
    this.quoteText.setOrigin(0.5, 0);

    // Current fuel display
    const currentFuel = this.add.text(GAME_WIDTH / 2, 210,
      `Current Fuel: ${Math.floor(this.fuelSystem.getFuel())}/${this.fuelSystem.getMaxFuel()}`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '18px',
      color: '#2E7D32',
      fontStyle: 'bold',
    });
    currentFuel.setOrigin(0.5, 0);

    // Item selection
    this.createItemSelectors();

    // Fuel preview
    this.fuelPreview = this.add.text(GAME_WIDTH / 2, 450, 'Select items to trade', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '20px',
      color: '#666666',
      fontStyle: 'bold',
    });
    this.fuelPreview.setOrigin(0.5, 0);

    // Trade button (green)
    const tradeButton = this.createButton(GAME_WIDTH / 2 - 80, 500, 'TRADE', 0x4CAF50, () => {
      this.executeTrade();
    });

    // Skip button (orange)
    const skipButton = this.createButton(GAME_WIDTH / 2 + 80, 500, 'SKIP', 0xFF9800, () => {
      this.close();
    });

    // Enter key to skip/continue
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.close();
    });

    // Escape key also skips
    this.input.keyboard!.on('keydown-ESC', () => {
      this.close();
    });

    // Update preview initially
    this.updateFuelPreview();
  }

  private createItemSelectors(): void {
    const items = this.inventorySystem.getAllItems();
    const startY = 260;
    const spacing = 45;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const y = startY + i * spacing;

      // Item name and count
      const colorHex = '#' + item.color.toString(16).padStart(6, '0');
      const nameText = this.add.text(GAME_WIDTH / 2 - 200, y, item.name, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '18px',
        color: colorHex,
        fontStyle: 'bold',
      });

      // Count and value
      const valueText = this.add.text(GAME_WIDTH / 2, y,
        `Have: ${item.count}  (${item.fuelValue} fuel each)`, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '14px',
        color: '#666666',
      });
      valueText.setOrigin(0.5, 0);

      // Selector buttons
      if (item.count > 0) {
        // Initialize selection to 0
        this.selectedItems.set(item.type, 0);

        const minusBtn = this.createSmallButton(GAME_WIDTH / 2 + 100, y, '-', () => {
          const current = this.selectedItems.get(item.type) || 0;
          if (current > 0) {
            this.selectedItems.set(item.type, current - 1);
            this.updateFuelPreview();
            this.updateCountDisplay(countText, item.type);
          }
        });

        const countText = this.add.text(GAME_WIDTH / 2 + 140, y, '0', {
          fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '18px',
          color: '#ffffff',
        });
        countText.setOrigin(0.5, 0);

        const plusBtn = this.createSmallButton(GAME_WIDTH / 2 + 180, y, '+', () => {
          const current = this.selectedItems.get(item.type) || 0;
          if (current < item.count) {
            this.selectedItems.set(item.type, current + 1);
            this.updateFuelPreview();
            this.updateCountDisplay(countText, item.type);
          }
        });

        // All button
        const allBtn = this.createSmallButton(GAME_WIDTH / 2 + 230, y, 'ALL', () => {
          this.selectedItems.set(item.type, item.count);
          this.updateFuelPreview();
          this.updateCountDisplay(countText, item.type);
        });
      }
    }
  }

  private updateCountDisplay(text: Phaser.GameObjects.Text, type: CollectibleType): void {
    const count = this.selectedItems.get(type) || 0;
    text.setText(count.toString());
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    color: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 0.3);
    bg.fillRoundedRect(-60, -18, 120, 36, 8);
    bg.lineStyle(2, color);
    bg.strokeRoundedRect(-60, -18, 120, 36, 8);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);

    container.add([bg, text]);

    container.setInteractive(new Phaser.Geom.Rectangle(-60, -18, 120, 36), Phaser.Geom.Rectangle.Contains);

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(color, 0.6);
      bg.fillRoundedRect(-60, -18, 120, 36, 8);
      bg.lineStyle(2, color);
      bg.strokeRoundedRect(-60, -18, 120, 36, 8);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(color, 0.3);
      bg.fillRoundedRect(-60, -18, 120, 36, 8);
      bg.lineStyle(2, color);
      bg.strokeRoundedRect(-60, -18, 120, 36, 8);
    });

    container.on('pointerdown', callback);

    return container;
  }

  private createSmallButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const size = label === 'ALL' ? 40 : 28;
    const bg = this.add.graphics();
    bg.fillStyle(0x444444, 0.8);
    bg.fillRoundedRect(-size / 2, -14, size, 28, 4);
    bg.lineStyle(1, 0x666666);
    bg.strokeRoundedRect(-size / 2, -14, size, 28, 4);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: label === 'ALL' ? '12px' : '18px',
      color: '#ffffff',
    });
    text.setOrigin(0.5, 0.5);

    container.add([bg, text]);

    container.setInteractive(new Phaser.Geom.Rectangle(-size / 2, -14, size, 28), Phaser.Geom.Rectangle.Contains);

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x666666, 0.8);
      bg.fillRoundedRect(-size / 2, -14, size, 28, 4);
      bg.lineStyle(1, 0x888888);
      bg.strokeRoundedRect(-size / 2, -14, size, 28, 4);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x444444, 0.8);
      bg.fillRoundedRect(-size / 2, -14, size, 28, 4);
      bg.lineStyle(1, 0x666666);
      bg.strokeRoundedRect(-size / 2, -14, size, 28, 4);
    });

    container.on('pointerdown', callback);

    return container;
  }

  private calculateFuelGain(): number {
    let baseFuel = 0;

    for (const [type, count] of this.selectedItems) {
      baseFuel += count * COLLECTIBLE_TYPES[type].fuelValue;
    }

    return Math.floor(baseFuel * this.landingBonus);
  }

  private updateFuelPreview(): void {
    const fuelGain = this.calculateFuelGain();

    if (fuelGain > 0) {
      const newTotal = Math.min(
        this.fuelSystem.getFuel() + fuelGain,
        this.fuelSystem.getMaxFuel()
      );
      this.fuelPreview.setText(
        `Trade for +${fuelGain} fuel → ${Math.floor(newTotal)}/${this.fuelSystem.getMaxFuel()}`
      );
      this.fuelPreview.setColor('#4CAF50');
    } else {
      this.fuelPreview.setText('Select items to trade');
      this.fuelPreview.setColor('#666666');
    }
  }

  private executeTrade(): void {
    const fuelGain = this.calculateFuelGain();

    if (fuelGain <= 0) {
      // Flash the preview text
      this.tweens.add({
        targets: this.fuelPreview,
        alpha: 0,
        duration: 100,
        yoyo: true,
        repeat: 2,
      });
      return;
    }

    // Remove items from inventory
    for (const [type, count] of this.selectedItems) {
      if (count > 0) {
        this.inventorySystem.remove(type, count);
      }
    }

    // Add fuel
    this.fuelSystem.add(fuelGain);

    // Show success message with shadow
    const successShadow = this.add.text(GAME_WIDTH / 2 + 3, GAME_HEIGHT / 2 + 3, `+${fuelGain} FUEL!`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '48px',
      color: '#2E7D32',
      fontStyle: 'bold',
    });
    successShadow.setOrigin(0.5, 0.5);

    const success = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `+${fuelGain} FUEL!`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '48px',
      color: '#4CAF50',
      fontStyle: 'bold',
    });
    success.setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: [success, successShadow],
      y: GAME_HEIGHT / 2 - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        success.destroy();
        successShadow.destroy();
        this.close();
      },
    });
  }

  private close(): void {
    this.scene.stop();
    this.onComplete();
  }
}
