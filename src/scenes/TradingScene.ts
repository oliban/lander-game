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
  onScoreChange?: (delta: number) => void;
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
  private onScoreChange?: (delta: number) => void;
  private landingBonus: number = 1;
  private selectedItems: Map<CollectibleType, number> = new Map();
  private fuelPreview!: Phaser.GameObjects.Text;
  private quoteText!: Phaser.GameObjects.Text;
  private countTexts: Map<CollectibleType, Phaser.GameObjects.Text> = new Map();
  private sparkles: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'TradingScene' });
  }

  create(data: TradingSceneData): void {
    this.inventorySystem = data.inventorySystem;
    this.fuelSystem = data.fuelSystem;
    this.onComplete = data.onComplete;
    this.onScoreChange = data.onScoreChange;
    this.landingBonus = data.landingQuality === 'perfect' ? 1.5 : 1.2;

    // Reset selection
    this.selectedItems.clear();
    this.countTexts.clear();

    // Dark overlay background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);

    // Create animated sparkle background
    this.createSparkleBackground();

    // Main panel with gradient effect
    const panelX = GAME_WIDTH / 2 - 340;
    const panelY = 50;
    const panelW = 680;
    const panelH = 620;

    // Panel shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(panelX + 8, panelY + 8, panelW, panelH, 16);

    // Main panel background (cream/gold gradient look)
    const panel = this.add.graphics();
    panel.fillStyle(0xFFF8DC, 1); // Cornsilk
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 16);

    // Gold border with double line effect
    panel.lineStyle(4, 0xDAA520);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 16);
    panel.lineStyle(2, 0xFFD700);
    panel.strokeRoundedRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 12);

    // Decorative corner stars
    this.drawCornerStar(panelX + 20, panelY + 20);
    this.drawCornerStar(panelX + panelW - 20, panelY + 20);
    this.drawCornerStar(panelX + 20, panelY + panelH - 20);
    this.drawCornerStar(panelX + panelW - 20, panelY + panelH - 20);

    // Header banner
    const bannerY = panelY + 15;
    const banner = this.add.graphics();
    banner.fillStyle(0xB22222, 1); // Firebrick red
    banner.fillRoundedRect(panelX + 50, bannerY, panelW - 100, 50, 8);
    banner.lineStyle(2, 0xFFD700);
    banner.strokeRoundedRect(panelX + 50, bannerY, panelW - 100, 50, 8);

    // Title
    const title = this.add.text(GAME_WIDTH / 2, bannerY + 25, `⛽ ${data.padName.toUpperCase()} ⛽`, {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      color: '#FFD700',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    title.setShadow(2, 2, '#000000', 3);

    // Landing quality badge
    const badgeY = bannerY + 60;
    const isPerfect = data.landingQuality === 'perfect';
    const badgeColor = isPerfect ? 0x228B22 : 0xDAA520;
    const badgeText = isPerfect ? '★ PERFECT LANDING +50% ★' : '✓ Good Landing +20%';

    const badge = this.add.graphics();
    badge.fillStyle(badgeColor, 0.9);
    badge.fillRoundedRect(GAME_WIDTH / 2 - 120, badgeY, 240, 28, 14);
    badge.lineStyle(2, 0xFFFFFF, 0.5);
    badge.strokeRoundedRect(GAME_WIDTH / 2 - 120, badgeY, 240, 28, 14);

    const badgeLabel = this.add.text(GAME_WIDTH / 2, badgeY + 14, badgeText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    badgeLabel.setOrigin(0.5, 0.5);

    // Fuel gauge display
    const gaugeY = badgeY + 40;
    this.createFuelGauge(GAME_WIDTH / 2, gaugeY);

    // Quote
    const quote = SATIRICAL_QUOTES[Math.floor(Math.random() * SATIRICAL_QUOTES.length)];
    this.quoteText = this.add.text(GAME_WIDTH / 2, gaugeY + 45, quote, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#8B4513',
      fontStyle: 'italic',
      wordWrap: { width: 500 },
      align: 'center',
    });
    this.quoteText.setOrigin(0.5, 0.5);

    // Items header
    const itemsHeaderY = gaugeY + 75;
    const itemsHeader = this.add.text(GAME_WIDTH / 2, itemsHeaderY, '━━━ YOUR CARGO ━━━', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#8B4513',
      fontStyle: 'bold',
    });
    itemsHeader.setOrigin(0.5, 0.5);

    // Item selection area with scroll-like background
    const itemsY = itemsHeaderY + 20;
    const itemsBg = this.add.graphics();
    itemsBg.fillStyle(0xFFFAF0, 0.8); // Floral white
    itemsBg.fillRoundedRect(panelX + 30, itemsY, panelW - 60, 320, 8);
    itemsBg.lineStyle(1, 0xDEB887);
    itemsBg.strokeRoundedRect(panelX + 30, itemsY, panelW - 60, 320, 8);

    // Create item selectors
    this.createItemSelectors(itemsY + 15);

    // Fuel preview with fancy styling
    const previewY = itemsY + 335;
    const previewBg = this.add.graphics();
    previewBg.fillStyle(0x2F4F4F, 0.9);
    previewBg.fillRoundedRect(GAME_WIDTH / 2 - 200, previewY, 400, 40, 8);

    this.fuelPreview = this.add.text(GAME_WIDTH / 2, previewY + 20, 'Select items to trade', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#90EE90',
      fontStyle: 'bold',
    });
    this.fuelPreview.setOrigin(0.5, 0.5);

    // Action buttons
    const btnY = previewY + 55;
    this.createFancyButton(GAME_WIDTH / 2 - 170, btnY, 'AUTO-SELL', 0x1E90FF, 0x4169E1, () => this.autoTrade());
    this.createFancyButton(GAME_WIDTH / 2, btnY, 'TRADE', 0x32CD32, 0x228B22, () => this.executeTrade());
    this.createFancyButton(GAME_WIDTH / 2 + 170, btnY, 'SKIP', 0xFFA500, 0xFF8C00, () => this.close());

    // Keyboard shortcuts hint
    const hint = this.add.text(GAME_WIDTH / 2, btnY + 45, 'Press ENTER to auto-sell • ESC to skip', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#666666',
    });
    hint.setOrigin(0.5, 0.5);

    // Keyboard handlers
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (this.hasItemsToTrade()) {
        this.autoTrade();
      } else {
        this.close();
      }
    });

    this.input.keyboard!.on('keydown-ESC', () => this.close());

    // Update preview initially
    this.updateFuelPreview();
  }

  private createSparkleBackground(): void {
    // Create floating sparkle particles
    for (let i = 0; i < 15; i++) {
      const sparkle = this.add.graphics();
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      sparkle.fillStyle(0xFFD700, 0.6);
      // Draw a diamond shape as sparkle
      this.drawDiamond(sparkle, x, y, 4);
      this.sparkles.push(sparkle);

      // Animate sparkle
      this.tweens.add({
        targets: sparkle,
        alpha: { from: 0.3, to: 0.8 },
        scale: { from: 0.5, to: 1.2 },
        duration: 1000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 1000,
      });
    }
  }

  private drawCornerStar(x: number, y: number): void {
    const star = this.add.graphics();
    star.fillStyle(0xFFD700, 1);
    // Draw a 4-point star shape
    this.drawStar(star, x, y, 4, 8, 4);
    star.lineStyle(1, 0xDAA520);
    this.strokeStar(star, x, y, 4, 8, 4);
  }

  private drawDiamond(graphics: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
    graphics.beginPath();
    graphics.moveTo(x, y - size);
    graphics.lineTo(x + size, y);
    graphics.lineTo(x, y + size);
    graphics.lineTo(x - size, y);
    graphics.closePath();
    graphics.fillPath();
  }

  private drawStar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, points: number, outerRadius: number, innerRadius: number): void {
    graphics.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI / points) - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) {
        graphics.moveTo(px, py);
      } else {
        graphics.lineTo(px, py);
      }
    }
    graphics.closePath();
    graphics.fillPath();
  }

  private strokeStar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, points: number, outerRadius: number, innerRadius: number): void {
    graphics.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI / points) - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) {
        graphics.moveTo(px, py);
      } else {
        graphics.lineTo(px, py);
      }
    }
    graphics.closePath();
    graphics.strokePath();
  }

  private createFuelGauge(x: number, y: number): void {
    const currentFuel = this.fuelSystem.getFuel();
    const maxFuel = this.fuelSystem.getMaxFuel();
    const percentage = currentFuel / maxFuel;

    // Gauge background
    const gaugeWidth = 300;
    const gaugeHeight = 24;

    const gaugeBg = this.add.graphics();
    gaugeBg.fillStyle(0x333333, 1);
    gaugeBg.fillRoundedRect(x - gaugeWidth / 2, y, gaugeWidth, gaugeHeight, 12);

    // Fuel fill
    const fillWidth = Math.max(0, (gaugeWidth - 4) * percentage);
    const fillColor = percentage > 0.5 ? 0x32CD32 : percentage > 0.25 ? 0xFFD700 : 0xFF4444;

    const gaugeFill = this.add.graphics();
    gaugeFill.fillStyle(fillColor, 1);
    gaugeFill.fillRoundedRect(x - gaugeWidth / 2 + 2, y + 2, fillWidth, gaugeHeight - 4, 10);

    // Gauge border
    gaugeBg.lineStyle(2, 0x666666);
    gaugeBg.strokeRoundedRect(x - gaugeWidth / 2, y, gaugeWidth, gaugeHeight, 12);

    // Fuel text
    const fuelText = this.add.text(x, y + gaugeHeight / 2, `⛽ ${Math.floor(currentFuel)} / ${maxFuel}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    fuelText.setOrigin(0.5, 0.5);
    fuelText.setShadow(1, 1, '#000000', 2);
  }

  private createItemSelectors(startY: number): void {
    const items = this.inventorySystem.getAllItems();
    // Include mystery items (casino chips) even with 0 fuelValue
    const displayItems = items.filter(item => item.count > 0 && (item.fuelValue > 0 || item.isMystery));

    const cols = 2;
    const spacing = 38;
    const colWidth = 290; // Narrower columns to fit in panel
    const totalWidth = colWidth * cols;
    const leftColX = GAME_WIDTH / 2 - totalWidth / 2 + 15; // Center both columns

    for (let i = 0; i < displayItems.length; i++) {
      const item = displayItems[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = leftColX + col * colWidth;
      const y = startY + row * spacing;

      // Item row background (alternating)
      const rowBg = this.add.graphics();
      rowBg.fillStyle(row % 2 === 0 ? 0xFFFFFF : 0xFFF8DC, 0.5);
      rowBg.fillRoundedRect(x - 10, y - 2, colWidth - 25, 32, 4);

      // Colored item indicator dot
      const dot = this.add.graphics();
      dot.fillStyle(item.color, 1);
      dot.fillCircle(x + 6, y + 14, 7);
      dot.lineStyle(2, 0x333333);
      dot.strokeCircle(x + 6, y + 14, 7);

      // Item name (truncate very long names only)
      let displayName = item.name;
      if (displayName.length > 15) {
        displayName = displayName.substring(0, 14) + '…';
      }
      const nameText = this.add.text(x + 18, y + 4, displayName, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#333333',
        fontStyle: 'bold',
      });

      // Fuel value badge - show "?" for mystery items
      const valueBadge = this.add.graphics();
      const isMystery = item.isMystery;
      valueBadge.fillStyle(isMystery ? 0x9932CC : 0x228B22, 0.8);
      valueBadge.fillRoundedRect(x + 105, y + 2, 40, 20, 4);

      const valueDisplay = isMystery ? '?' : `+${item.fuelValue}`;
      const valueText = this.add.text(x + 125, y + 12, valueDisplay, {
        fontFamily: 'Arial, sans-serif',
        fontSize: isMystery ? '14px' : '10px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      });
      valueText.setOrigin(0.5, 0.5);

      // Have count
      const haveText = this.add.text(x + 152, y + 12, `×${item.count}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#666666',
      });
      haveText.setOrigin(0, 0.5);

      // Selection controls
      this.selectedItems.set(item.type, 0);

      // Minus button
      this.createRoundButton(x + 185, y + 12, '-', 0xFF6B6B, () => {
        const current = this.selectedItems.get(item.type) || 0;
        if (current > 0) {
          this.selectedItems.set(item.type, current - 1);
          this.updateFuelPreview();
          this.updateCountDisplay(item.type);
        }
      });

      // Selected count display
      const countBg = this.add.graphics();
      countBg.fillStyle(0x333333, 0.9);
      countBg.fillRoundedRect(x + 200, y + 2, 28, 24, 4);

      const countText = this.add.text(x + 214, y + 14, '0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#FFD700',
        fontStyle: 'bold',
      });
      countText.setOrigin(0.5, 0.5);
      this.countTexts.set(item.type, countText);

      // Plus button
      this.createRoundButton(x + 243, y + 12, '+', 0x6BCB77, () => {
        const current = this.selectedItems.get(item.type) || 0;
        if (current < item.count) {
          this.selectedItems.set(item.type, current + 1);
          this.updateFuelPreview();
          this.updateCountDisplay(item.type);
        }
      });
    }
  }

  private createRoundButton(x: number, y: number, label: string, color: number, callback: () => void): void {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillCircle(0, 0, 10);
    bg.lineStyle(2, 0xFFFFFF, 0.5);
    bg.strokeCircle(0, 0, 10);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);

    container.add([bg, text]);
    container.setInteractive(new Phaser.Geom.Circle(0, 0, 10), Phaser.Geom.Circle.Contains);

    container.on('pointerover', () => {
      container.setScale(1.15);
    });

    container.on('pointerout', () => {
      container.setScale(1);
    });

    container.on('pointerdown', () => {
      container.setScale(0.9);
      callback();
    });

    container.on('pointerup', () => {
      container.setScale(1.15);
    });
  }

  private createFancyButton(x: number, y: number, label: string, color: number, darkColor: number, callback: () => void): void {
    const container = this.add.container(x, y);

    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(-62, -16, 124, 38, 8);

    // Main button
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-60, -18, 120, 36, 8);
    bg.lineStyle(3, darkColor);
    bg.strokeRoundedRect(-60, -18, 120, 36, 8);

    // Shine effect
    const shine = this.add.graphics();
    shine.fillStyle(0xFFFFFF, 0.3);
    shine.fillRoundedRect(-56, -16, 112, 12, 6);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    text.setShadow(1, 1, '#000000', 2);

    container.add([shadow, bg, shine, text]);
    container.setInteractive(new Phaser.Geom.Rectangle(-60, -18, 120, 36), Phaser.Geom.Rectangle.Contains);

    container.on('pointerover', () => {
      container.setScale(1.05);
      bg.clear();
      bg.fillStyle(darkColor, 1);
      bg.fillRoundedRect(-60, -18, 120, 36, 8);
      bg.lineStyle(3, color);
      bg.strokeRoundedRect(-60, -18, 120, 36, 8);
    });

    container.on('pointerout', () => {
      container.setScale(1);
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-60, -18, 120, 36, 8);
      bg.lineStyle(3, darkColor);
      bg.strokeRoundedRect(-60, -18, 120, 36, 8);
    });

    container.on('pointerdown', callback);
  }

  private updateCountDisplay(type: CollectibleType): void {
    const count = this.selectedItems.get(type) || 0;
    const text = this.countTexts.get(type);
    if (text) {
      text.setText(count.toString());
      // Flash effect
      this.tweens.add({
        targets: text,
        scale: 1.3,
        duration: 100,
        yoyo: true,
      });
    }
  }

  private calculateFuelGain(): number {
    let baseFuel = 0;
    for (const [type, count] of this.selectedItems) {
      if (type === 'CASINO_CHIP' && count > 0) {
        // Use actual random values for casino chips
        baseFuel += this.inventorySystem.getCasinoChipTotalValue(count);
      } else {
        baseFuel += count * COLLECTIBLE_TYPES[type].fuelValue;
      }
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
      this.fuelPreview.setText(`🔥 +${fuelGain} FUEL → ${Math.floor(newTotal)}/${this.fuelSystem.getMaxFuel()} 🔥`);
      this.fuelPreview.setColor('#90EE90');
    } else {
      this.fuelPreview.setText('👆 Select items to trade');
      this.fuelPreview.setColor('#AAAAAA');
    }
  }

  private executeTrade(): void {
    const fuelGain = this.calculateFuelGain();

    if (fuelGain <= 0) {
      this.tweens.add({
        targets: this.fuelPreview,
        alpha: 0,
        duration: 100,
        yoyo: true,
        repeat: 2,
      });
      return;
    }

    // Calculate points lost from selling items (base fuel value, not with bonus)
    let pointsLost = 0;
    for (const [type, count] of this.selectedItems) {
      if (count > 0) {
        if (type === 'CASINO_CHIP') {
          // Use actual random values for casino chips
          pointsLost += this.inventorySystem.getCasinoChipTotalValue(count);
        } else {
          pointsLost += count * COLLECTIBLE_TYPES[type].fuelValue;
        }
        this.inventorySystem.remove(type, count);
      }
    }

    // Deduct points for selling
    if (this.onScoreChange && pointsLost > 0) {
      this.onScoreChange(-pointsLost);
    }

    this.fuelSystem.add(fuelGain);

    // Epic success animation
    const successBg = this.add.graphics();
    successBg.fillStyle(0x000000, 0.7);
    successBg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const success = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `+${fuelGain} FUEL!`, {
      fontFamily: 'Georgia, serif',
      fontSize: '64px',
      color: '#FFD700',
      fontStyle: 'bold',
    });
    success.setOrigin(0.5, 0.5);
    success.setShadow(4, 4, '#000000', 8);

    // Starburst effect
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const star = this.add.graphics();
      star.fillStyle(0xFFD700, 1);
      this.drawStar(star, GAME_WIDTH / 2, GAME_HEIGHT / 2, 5, 10, 5);

      this.tweens.add({
        targets: star,
        x: Math.cos(angle) * 150,
        y: Math.sin(angle) * 150,
        alpha: 0,
        scale: 0.5,
        duration: 600,
        onComplete: () => star.destroy(),
      });
    }

    this.tweens.add({
      targets: success,
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 1, to: 0 },
      duration: 1200,
      ease: 'Back.easeOut',
      onComplete: () => {
        successBg.destroy();
        success.destroy();
        this.close();
      },
    });
  }

  private hasItemsToTrade(): boolean {
    const items = this.inventorySystem.getAllItems();
    return items.some(item => item.count > 0 && (item.fuelValue > 0 || item.isMystery));
  }

  private autoTrade(): void {
    const items = this.inventorySystem.getAllItems();
    const currentFuel = this.fuelSystem.getFuel();
    const maxFuel = this.fuelSystem.getMaxFuel();
    const targetFuel = maxFuel;
    const fuelNeeded = targetFuel - currentFuel;

    if (fuelNeeded <= 0) {
      this.close();
      return;
    }

    const hasItems = items.some(item => item.count > 0 && (item.fuelValue > 0 || item.isMystery));
    if (!hasItems) {
      this.close();
      return;
    }

    this.selectedItems.clear();
    for (const item of items) {
      this.selectedItems.set(item.type, 0);
    }

    // Filter tradeable items, sort by value (mystery items go last since we don't know value)
    const sortedItems = [...items].filter(item => item.count > 0 && (item.fuelValue > 0 || item.isMystery))
      .sort((a, b) => {
        // Non-mystery items first, sorted by value
        if (a.isMystery && !b.isMystery) return 1;
        if (!a.isMystery && b.isMystery) return -1;
        return a.fuelValue - b.fuelValue;
      });

    let fuelGained = 0;
    const casinoChipValues = this.inventorySystem.getCasinoChipValues();
    let casinoChipIndex = 0;

    for (const item of sortedItems) {
      const available = item.count;

      for (let i = 0; i < available; i++) {
        if (fuelGained >= fuelNeeded) break;
        const currentCount = this.selectedItems.get(item.type) || 0;
        this.selectedItems.set(item.type, currentCount + 1);

        // Calculate value per item
        let valuePerItem: number;
        if (item.type === 'CASINO_CHIP') {
          valuePerItem = Math.floor((casinoChipValues[casinoChipIndex] || 0) * this.landingBonus);
          casinoChipIndex++;
        } else {
          valuePerItem = Math.floor(item.fuelValue * this.landingBonus);
        }
        fuelGained += valuePerItem;
      }

      if (fuelGained >= fuelNeeded) break;
    }

    if (fuelGained === 0) {
      this.close();
      return;
    }

    this.updateFuelPreview();
    this.executeTrade();
  }

  private close(): void {
    this.scene.stop();
    this.onComplete();
  }
}
