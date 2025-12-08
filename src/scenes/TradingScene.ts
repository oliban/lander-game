import Phaser from 'phaser';
import { InventorySystem } from '../systems/InventorySystem';
import { FuelSystem } from '../systems/FuelSystem';
import { GAME_WIDTH, GAME_HEIGHT, COLLECTIBLE_TYPES, BOMB_DROPPABLE_TYPES } from '../constants';
import { CollectibleType } from '../objects/Collectible';

interface TradingSceneData {
  inventorySystem: InventorySystem;
  fuelSystem: FuelSystem;
  padName: string;
  landingQuality: 'perfect' | 'good' | 'rough';
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
  private selectedQuoteIndex: number = 0;

  constructor() {
    super({ key: 'TradingScene' });
  }

  create(data: TradingSceneData): void {
    this.inventorySystem = data.inventorySystem;
    this.fuelSystem = data.fuelSystem;
    this.onComplete = data.onComplete;
    this.onScoreChange = data.onScoreChange;
    // Landing bonus: perfect = 25%, good = 10%, rough = no bonus
    this.landingBonus = data.landingQuality === 'perfect' ? 1.25 : data.landingQuality === 'good' ? 1.1 : 1.0;

    // Select random trade quote (used for both audio and text)
    this.selectedQuoteIndex = Math.floor(Math.random() * SATIRICAL_QUOTES.length);
    this.sound.play(`trade${this.selectedQuoteIndex + 1}`);

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
    let badgeColor: number;
    let badgeText: string;
    if (data.landingQuality === 'perfect') {
      badgeColor = 0x228B22;
      badgeText = '★ PERFECT LANDING +25% ★';
    } else if (data.landingQuality === 'good') {
      badgeColor = 0xDAA520;
      badgeText = '✓ Good Landing +10%';
    } else {
      badgeColor = 0x888888;
      badgeText = '⚠ Rough Landing (No Bonus)';
    }

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

    // Quote (uses same index as audio)
    const quote = SATIRICAL_QUOTES[this.selectedQuoteIndex];
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
    itemsBg.fillRoundedRect(panelX + 30, itemsY, panelW - 60, 280, 8);
    itemsBg.lineStyle(1, 0xDEB887);
    itemsBg.strokeRoundedRect(panelX + 30, itemsY, panelW - 60, 280, 8);

    // Create item selectors
    this.createItemSelectors(itemsY + 15);

    // Fuel preview with fancy styling
    const previewY = itemsY + 295;
    const previewBg = this.add.graphics();
    previewBg.fillStyle(0x2F4F4F, 0.9);
    previewBg.fillRoundedRect(GAME_WIDTH / 2 - 200, previewY, 400, 35, 8);

    this.fuelPreview = this.add.text(GAME_WIDTH / 2, previewY + 17, 'Select items to trade', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#90EE90',
      fontStyle: 'bold',
    });
    this.fuelPreview.setOrigin(0.5, 0.5);

    // Auto-sell section: "Will sell" list inside panel with button below
    const autoSellItems = this.getAutoSellItemsList();
    const autoSellBoxY = previewY + 45;

    // Auto-sell box background
    const autoSellBg = this.add.graphics();
    autoSellBg.fillStyle(0x1a3a5c, 0.9);
    autoSellBg.fillRoundedRect(panelX + 35, autoSellBoxY, 160, 75, 8);
    autoSellBg.lineStyle(2, 0x1E90FF, 0.6);
    autoSellBg.strokeRoundedRect(panelX + 35, autoSellBoxY, 160, 75, 8);

    const listTitle = this.add.text(panelX + 115, autoSellBoxY + 8, 'Auto-sell will trade:', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#AAAAAA',
    });
    listTitle.setOrigin(0.5, 0);

    if (autoSellItems.length > 0) {
      const autoSellList = this.add.text(panelX + 115, autoSellBoxY + 22, autoSellItems.slice(0, 3).join('\n'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#90EE90',
        lineSpacing: 2,
        align: 'center',
      });
      autoSellList.setOrigin(0.5, 0);
    } else {
      const noItems = this.add.text(panelX + 115, autoSellBoxY + 30, '(nothing needed)', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#666666',
        fontStyle: 'italic',
      });
      noItems.setOrigin(0.5, 0);
    }

    // Action buttons
    const btnY = autoSellBoxY + 95;

    // Auto-sell button under the auto-sell box
    this.createFancyButton(panelX + 115, btnY, 'AUTO-SELL [Enter]', 0x1E90FF, 0x4169E1, 150, () => this.autoTrade());

    // Trade and Skip buttons on the right
    this.createFancyButton(GAME_WIDTH / 2 + 80, btnY, 'TRADE', 0x32CD32, 0x228B22, 100, () => this.executeTrade());
    this.createFancyButton(GAME_WIDTH / 2 + 210, btnY, 'SKIP [Esc]', 0xFFA500, 0xFF8C00, 110, () => this.close());

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
    // Filter out bomb items - they're for dropping, not trading
    const displayItems = items.filter(item =>
      item.count > 0 &&
      (item.fuelValue > 0 || item.isMystery) &&
      !BOMB_DROPPABLE_TYPES.includes(item.type)
    );

    const cols = 2;
    const spacing = 38;
    const colWidth = 290;
    const totalWidth = colWidth * cols;
    const leftColX = GAME_WIDTH / 2 - totalWidth / 2 + 15;

    for (let i = 0; i < displayItems.length; i++) {
      const item = displayItems[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = leftColX + col * colWidth;
      const y = startY + row * spacing;

      // Item row background (alternating with good contrast)
      const rowBg = this.add.graphics();
      rowBg.fillStyle(row % 2 === 0 ? 0xF5F5DC : 0xE8E8D0, 0.9);
      rowBg.fillRoundedRect(x - 10, y - 2, colWidth - 25, 32, 4);
      rowBg.lineStyle(1, 0xCCCCCC, 0.5);
      rowBg.strokeRoundedRect(x - 10, y - 2, colWidth - 25, 32, 4);

      // Colored item indicator square (more visible than dot)
      const dot = this.add.graphics();
      dot.fillStyle(item.color, 1);
      dot.fillRoundedRect(x - 2, y + 6, 14, 14, 3);
      dot.lineStyle(2, 0x222222);
      dot.strokeRoundedRect(x - 2, y + 6, 14, 14, 3);

      // Item name - left aligned, dark text for readability
      let displayName = item.name;
      if (displayName.length > 14) {
        displayName = displayName.substring(0, 13) + '…';
      }
      const nameText = this.add.text(x + 18, y + 6, displayName, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#1a1a1a',
        fontStyle: 'bold',
      });

      // Fuel value badge - show "?" for mystery items
      const valueBadge = this.add.graphics();
      const isMystery = item.isMystery;
      valueBadge.fillStyle(isMystery ? 0x6B21A8 : 0x166534, 1);
      valueBadge.fillRoundedRect(x + 108, y + 4, 38, 20, 4);

      const valueDisplay = isMystery ? '???' : `+${item.fuelValue}`;
      const valueText = this.add.text(x + 127, y + 14, valueDisplay, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      });
      valueText.setOrigin(0.5, 0.5);

      // Have count - darker for readability
      const haveText = this.add.text(x + 152, y + 14, `×${item.count}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#333333',
        fontStyle: 'bold',
      });
      haveText.setOrigin(0, 0.5);

      // Selection controls
      this.selectedItems.set(item.type, 0);

      // Minus button
      this.createRoundButton(x + 185, y + 12, '-', 0xDC2626, () => {
        const current = this.selectedItems.get(item.type) || 0;
        if (current > 0) {
          this.selectedItems.set(item.type, current - 1);
          this.updateFuelPreview();
          this.updateCountDisplay(item.type);
        }
      });

      // Selected count display
      const countBg = this.add.graphics();
      countBg.fillStyle(0x1e293b, 1);
      countBg.fillRoundedRect(x + 200, y + 2, 28, 24, 4);

      const countText = this.add.text(x + 214, y + 14, '0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#FFD700',
        fontStyle: 'bold',
      });
      countText.setOrigin(0.5, 0.5);
      this.countTexts.set(item.type, countText);

      // Plus button
      this.createRoundButton(x + 243, y + 12, '+', 0x16A34A, () => {
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

  private createFancyButton(x: number, y: number, label: string, color: number, darkColor: number, width: number, callback: () => void): void {
    const container = this.add.container(x, y);
    const halfW = width / 2;

    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(-halfW - 2, -16, width + 4, 38, 8);

    // Main button
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-halfW, -18, width, 36, 8);
    bg.lineStyle(3, darkColor);
    bg.strokeRoundedRect(-halfW, -18, width, 36, 8);

    // Shine effect
    const shine = this.add.graphics();
    shine.fillStyle(0xFFFFFF, 0.3);
    shine.fillRoundedRect(-halfW + 4, -16, width - 8, 12, 6);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    text.setShadow(1, 1, '#000000', 2);

    container.add([shadow, bg, shine, text]);
    container.setInteractive(new Phaser.Geom.Rectangle(-halfW, -18, width, 36), Phaser.Geom.Rectangle.Contains);

    container.on('pointerover', () => {
      container.setScale(1.05);
      bg.clear();
      bg.fillStyle(darkColor, 1);
      bg.fillRoundedRect(-halfW, -18, width, 36, 8);
      bg.lineStyle(3, color);
      bg.strokeRoundedRect(-halfW, -18, width, 36, 8);
    });

    container.on('pointerout', () => {
      container.setScale(1);
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-halfW, -18, width, 36, 8);
      bg.lineStyle(3, darkColor);
      bg.strokeRoundedRect(-halfW, -18, width, 36, 8);
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

    // Close immediately - no delay
    this.close();
  }

  private hasItemsToTrade(): boolean {
    const items = this.inventorySystem.getAllItems();
    return items.some(item =>
      item.count > 0 &&
      (item.fuelValue > 0 || item.isMystery) &&
      !BOMB_DROPPABLE_TYPES.includes(item.type)
    );
  }

  private getAutoSellItemsList(): string[] {
    const items = this.inventorySystem.getAllItems();
    const currentFuel = this.fuelSystem.getFuel();
    const maxFuel = this.fuelSystem.getMaxFuel();
    const fuelNeeded = maxFuel - currentFuel;

    if (fuelNeeded <= 0) return [];

    const tradeableItems = [...items].filter(item =>
      item.count > 0 &&
      (item.fuelValue > 0 || item.isMystery) &&
      !BOMB_DROPPABLE_TYPES.includes(item.type)
    );

    if (tradeableItems.length === 0) return [];

    // Sort by fuel value ascending (cheapest first)
    const sortedAsc = [...tradeableItems].sort((a, b) => {
      if (a.isMystery && !b.isMystery) return 1;
      if (!a.isMystery && b.isMystery) return -1;
      return a.fuelValue - b.fuelValue;
    });

    const casinoChipValues = this.inventorySystem.getCasinoChipValues();

    // Strategy 1: Accumulate from cheapest items
    const strategyCheap: { type: string; name: string; count: number }[] = [];
    let sumCheap = 0;
    let chipIdx1 = 0;
    for (const item of sortedAsc) {
      if (sumCheap >= fuelNeeded) break;
      let countToSell = 0;
      for (let i = 0; i < item.count; i++) {
        if (sumCheap >= fuelNeeded) break;
        countToSell++;
        if (item.type === 'CASINO_CHIP') {
          sumCheap += Math.floor((casinoChipValues[chipIdx1] || 0) * this.landingBonus);
          chipIdx1++;
        } else {
          sumCheap += Math.floor(item.fuelValue * this.landingBonus);
        }
      }
      if (countToSell > 0) {
        strategyCheap.push({ type: item.type, name: item.name, count: countToSell });
      }
    }

    // Strategy 2: Find cheapest single item type that alone can fill the tank
    let strategySingle: { type: string; name: string; count: number }[] | null = null;
    let sumSingle = Infinity;
    for (const item of sortedAsc) {
      let fuel = 0;
      let countNeeded = 0;
      let chipIdx2 = 0;
      for (let i = 0; i < item.count; i++) {
        countNeeded++;
        if (item.type === 'CASINO_CHIP') {
          fuel += Math.floor((casinoChipValues[chipIdx2] || 0) * this.landingBonus);
          chipIdx2++;
        } else {
          fuel += Math.floor(item.fuelValue * this.landingBonus);
        }
        if (fuel >= fuelNeeded) break;
      }
      if (fuel >= fuelNeeded && fuel < sumSingle) {
        sumSingle = fuel;
        strategySingle = [{ type: item.type, name: item.name, count: countNeeded }];
        break; // Sorted ascending, so this is cheapest single-type option
      }
    }

    // Pick strategy with minimum waste (smaller total fuel)
    const useStrategy = (strategySingle && sumSingle <= sumCheap) ? strategySingle : strategyCheap;

    return useStrategy.map(s => `${s.name} ×${s.count}`);
  }

  private autoTrade(): void {
    const items = this.inventorySystem.getAllItems();
    const currentFuel = this.fuelSystem.getFuel();
    const maxFuel = this.fuelSystem.getMaxFuel();
    const fuelNeeded = maxFuel - currentFuel;

    if (fuelNeeded <= 0) {
      this.close();
      return;
    }

    const tradeableItems = [...items].filter(item =>
      item.count > 0 &&
      (item.fuelValue > 0 || item.isMystery) &&
      !BOMB_DROPPABLE_TYPES.includes(item.type)
    );

    if (tradeableItems.length === 0) {
      this.close();
      return;
    }

    this.selectedItems.clear();
    for (const item of items) {
      this.selectedItems.set(item.type, 0);
    }

    // Sort by fuel value ascending (cheapest first)
    const sortedAsc = [...tradeableItems].sort((a, b) => {
      if (a.isMystery && !b.isMystery) return 1;
      if (!a.isMystery && b.isMystery) return -1;
      return a.fuelValue - b.fuelValue;
    });

    const casinoChipValues = this.inventorySystem.getCasinoChipValues();

    // Strategy 1: Accumulate from cheapest items
    const strategyCheap: Map<CollectibleType, number> = new Map();
    let sumCheap = 0;
    let chipIdx1 = 0;
    for (const item of sortedAsc) {
      if (sumCheap >= fuelNeeded) break;
      let countToSell = 0;
      for (let i = 0; i < item.count; i++) {
        if (sumCheap >= fuelNeeded) break;
        countToSell++;
        if (item.type === 'CASINO_CHIP') {
          sumCheap += Math.floor((casinoChipValues[chipIdx1] || 0) * this.landingBonus);
          chipIdx1++;
        } else {
          sumCheap += Math.floor(item.fuelValue * this.landingBonus);
        }
      }
      if (countToSell > 0) {
        strategyCheap.set(item.type, countToSell);
      }
    }

    // Strategy 2: Find cheapest single item type that alone can fill the tank
    let strategySingle: Map<CollectibleType, number> | null = null;
    let sumSingle = Infinity;
    for (const item of sortedAsc) {
      let fuel = 0;
      let countNeeded = 0;
      let chipIdx2 = 0;
      for (let i = 0; i < item.count; i++) {
        countNeeded++;
        if (item.type === 'CASINO_CHIP') {
          fuel += Math.floor((casinoChipValues[chipIdx2] || 0) * this.landingBonus);
          chipIdx2++;
        } else {
          fuel += Math.floor(item.fuelValue * this.landingBonus);
        }
        if (fuel >= fuelNeeded) break;
      }
      if (fuel >= fuelNeeded && fuel < sumSingle) {
        sumSingle = fuel;
        strategySingle = new Map([[item.type, countNeeded]]);
        break; // Sorted ascending, so this is cheapest single-type option
      }
    }

    // Pick strategy with minimum waste (smaller total fuel)
    const useStrategy = (strategySingle && sumSingle <= sumCheap) ? strategySingle : strategyCheap;

    // Apply selected strategy
    for (const [type, count] of useStrategy) {
      this.selectedItems.set(type, count);
    }

    const totalSelected = Array.from(useStrategy.values()).reduce((a, b) => a + b, 0);
    if (totalSelected === 0) {
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
