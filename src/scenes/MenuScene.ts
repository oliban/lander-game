import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../constants';
import { getAchievementSystem } from '../systems/AchievementSystem';
import { getCollectionSystem } from '../systems/CollectionSystem';
import { COLLECTIBLE_TYPES } from '../constants';
import { createGreenButton } from '../ui/UIButton';
import { LIST_STRIPE_COLORS } from '../ui/UIStyles';
import { fetchScores, getLocalScores, syncPendingScores, ScoreCategory, CATEGORY_LABELS, CATEGORY_ORDER, HighScoreEntry } from '../services/ScoreService';
import { PerformanceSettings, QualityLevel, QUALITY_PRESETS } from '../systems/PerformanceSettings';

export class MenuScene extends Phaser.Scene {
  private currentCategory: ScoreCategory = 'alltime';
  private scoreTexts: Phaser.GameObjects.Text[] = [];
  private categoryLabel!: Phaser.GameObjects.Text;
  private leftArrow!: Phaser.GameObjects.Text;
  private rightArrow!: Phaser.GameObjects.Text;
  private loadingText!: Phaser.GameObjects.Text;

  // Settings panel elements
  private settingsPanel: Phaser.GameObjects.Container | null = null;
  private settingsQualityLabel!: Phaser.GameObjects.Text;
  private settingsAutoLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // Dark navy background for maximum contrast
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d1b2a);

    // Subtle gradient overlay
    const graphics = this.add.graphics();
    for (let y = 0; y < GAME_HEIGHT; y++) {
      const ratio = y / GAME_HEIGHT;
      const alpha = 0.3 * (1 - ratio);
      graphics.fillStyle(0x1b3a5c, alpha);
      graphics.fillRect(0, y, GAME_WIDTH, 1);
    }

    // Title art image at top
    const titleArt = this.add.image(GAME_WIDTH / 2, 150, 'title-art');
    titleArt.setScale(0.45);

    // Main title panel - dark blue for consistency
    const titlePanel = this.add.graphics();
    titlePanel.fillStyle(0x0d1b2a, 0.85);
    titlePanel.fillRoundedRect(GAME_WIDTH / 2 - 250, 290, 500, 90, 12);
    titlePanel.lineStyle(1, 0x1b3a5c, 0.5);
    titlePanel.strokeRoundedRect(GAME_WIDTH / 2 - 250, 290, 500, 90, 12);

    // Title - bright gold on dark
    const title = this.add.text(GAME_WIDTH / 2, 320, 'PEACE SHUTTLE', {
      fontSize: '48px',
      color: '#FFD700',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    title.setOrigin(0.5, 0.5);

    // Subtitle
    const subtitle = this.add.text(GAME_WIDTH / 2, 358, "Trumpleton's Mission to Russia", {
      fontSize: '20px',
      color: '#FFFFFF',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    subtitle.setOrigin(0.5, 0.5);

    // Trump quotes - authentic style (10 quotes)
    const quotes = [
      '"These are numbers that nobody has seen. They don\'t even believe it."',
      '"The charts are at a level that nobody even thought possible."',
      '"Nobody knew peace could be so complicated. I have to tell you."',
      '"These numbers are incredible. Nobody thought these numbers!"',
      '"A lot of people don\'t know this about Russia. A lot of people."',
      '"It\'s coming back at a level far greater than anybody anticipated."',
      '"This peace deal? There\'s never been anything like it. Believe me."',
      '"We\'re seeing things at levels that nobody thought was possible."',
      '"People are saying it\'s the best mission ever. Many people."',
      '"The numbers are so good. You saw the numbers. Incredible."',
    ];
    const selectedQuote = quotes[Math.floor(Math.random() * quotes.length)];

    // Quote panel with dark blue background for consistency
    const quotePanel = this.add.graphics();
    quotePanel.fillStyle(0x0d1b2a, 0.9);
    quotePanel.fillRoundedRect(GAME_WIDTH / 2 - 320, 390, 640, 40, 8);
    quotePanel.lineStyle(1, 0x1b3a5c, 0.5);
    quotePanel.strokeRoundedRect(GAME_WIDTH / 2 - 320, 390, 640, 40, 8);
    quotePanel.setDepth(5);

    const quoteText = this.add.text(GAME_WIDTH / 2, 410, selectedQuote, {
      fontSize: '16px',
      color: '#FFD700',
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
    });
    quoteText.setOrigin(0.5, 0.5);
    quoteText.setDepth(6);

    // Settings button (top-right corner)
    this.createSettingsButton();

    // Bottom section: 3 panels in a row (removed controls panel)
    const panelY = 445;
    const panelH = 130;
    const panelW = 220;
    const panelSpacing = 240;

    // HIGH SCORES panel (left)
    const scoresPanelX = GAME_WIDTH / 2 - panelSpacing;

    this.createPanelBackground(scoresPanelX, panelY, panelW, panelH);

    // Title
    const scoresTitle = this.add.text(scoresPanelX, panelY + 14, 'TOP 5 SCORES', {
      fontSize: '14px',
      color: '#FFD700',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    scoresTitle.setOrigin(0.5, 0);

    // Category navigation row: ◀ All Time ▶
    this.leftArrow = this.add.text(scoresPanelX - 55, panelY + 32, '◀', {
      fontSize: '14px',
      color: '#4CAF50',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    this.leftArrow.setOrigin(0.5, 0);
    this.leftArrow.setInteractive({ useHandCursor: true });
    this.leftArrow.on('pointerdown', () => this.cycleCategory(-1));
    this.leftArrow.on('pointerover', () => this.leftArrow.setColor('#66BB6A'));
    this.leftArrow.on('pointerout', () => this.leftArrow.setColor('#4CAF50'));

    this.categoryLabel = this.add.text(scoresPanelX, panelY + 32, CATEGORY_LABELS[this.currentCategory], {
      fontSize: '12px',
      color: '#AAAAAA',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    this.categoryLabel.setOrigin(0.5, 0);

    this.rightArrow = this.add.text(scoresPanelX + 55, panelY + 32, '▶', {
      fontSize: '14px',
      color: '#4CAF50',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    this.rightArrow.setOrigin(0.5, 0);
    this.rightArrow.setInteractive({ useHandCursor: true });
    this.rightArrow.on('pointerdown', () => this.cycleCategory(1));
    this.rightArrow.on('pointerover', () => this.rightArrow.setColor('#66BB6A'));
    this.rightArrow.on('pointerout', () => this.rightArrow.setColor('#4CAF50'));

    // Loading indicator
    this.loadingText = this.add.text(scoresPanelX, panelY + 70, 'Loading...', {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    this.loadingText.setOrigin(0.5, 0.5);

    // Create placeholder score texts (5 rows)
    const leftX = scoresPanelX - panelW / 2 + 20;
    for (let i = 0; i < 5; i++) {
      const yPos = panelY + 50 + i * 15;
      const nameText = this.add.text(leftX, yPos, '', {
        fontSize: '13px',
        color: '#AAAAAA',
        fontFamily: 'Arial, Helvetica, sans-serif',
      });
      nameText.setOrigin(0, 0);
      this.scoreTexts.push(nameText);

      const scoreText = this.add.text(scoresPanelX + panelW / 2 - 20, yPos, '', {
        fontSize: '13px',
        color: '#AAAAAA',
        fontFamily: 'Arial, Helvetica, sans-serif',
      });
      scoreText.setOrigin(1, 0);
      this.scoreTexts.push(scoreText);
    }

    // Sync pending scores and load initial scores
    syncPendingScores().catch(console.error);
    this.loadScores();

    // ACHIEVEMENTS panel (center)
    this.createAchievementsPanel(GAME_WIDTH / 2, panelY, panelW, panelH);

    // COLLECTION panel (right)
    this.createCollectionPanel(GAME_WIDTH / 2 + panelSpacing, panelY, panelW, panelH);

    // Start button - below all panels with good spacing
    const startButton = createGreenButton(this, GAME_WIDTH / 2, panelY + panelH + 45, 'START MISSION', () => {
      this.startGame(1);
    }, 'large').getContainer();

    // Pulsing animation on start button
    this.tweens.add({
      targets: startButton,
      scale: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Press Enter hint
    const enterHint = this.add.text(GAME_WIDTH / 2, panelY + panelH + 90, 'Press 1 for 1P  |  Press 2 for 2P  |  Press 3 for Dogfight', {
      fontSize: '14px',
      color: '#888888',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    enterHint.setOrigin(0.5, 0.5);

    // Listen for Enter key (starts 1 player)
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.startGame(1);
    });

    // Listen for 1 key (1 player mode) - key code 49 is '1'
    const key1 = this.input.keyboard!.addKey(49);
    key1.on('down', () => {
      this.startGame(1);
    });

    // Listen for 2 key (2 player mode) - key code 50 is '2'
    const key2 = this.input.keyboard!.addKey(50);
    key2.on('down', () => {
      this.startGame(2);
    });

    // Listen for 3 key (dogfight mode) - key code 51 is '3'
    const key3 = this.input.keyboard!.addKey(51);
    key3.on('down', () => {
      this.scene.start('GameScene', { playerCount: 2, gameMode: 'dogfight' });
    });

    }

  private startGame(playerCount: number = 1): void {
    this.scene.start('GameScene', { playerCount });
  }

  private createAchievementsPanel(panelX: number, panelY: number, panelW: number, panelH: number): void {
    const achievementSystem = getAchievementSystem();
    const unlocked = achievementSystem.getUnlockedCount();
    const total = achievementSystem.getTotalCount();

    // Panel background with unified gold border
    this.createPanelBackground(panelX, panelY, panelW, panelH);

    // Title with progress - aligned with other panels
    const titleText = this.add.text(panelX, panelY + 14, `ACHIEVEMENTS ${unlocked}/${total}`, {
      fontSize: '14px',
      color: '#FFD700',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    titleText.setOrigin(0.5, 0);

    // Show list of recent unlocks (up to 5)
    const recentUnlocks = achievementSystem.getRecentUnlocks(5);

    if (recentUnlocks.length > 0) {
      for (let i = 0; i < recentUnlocks.length; i++) {
        const achievement = recentUnlocks[i];
        const yPos = panelY + 36 + i * 15;
        // Use grey/orange tiger stripes for readability
        const achievementColor = LIST_STRIPE_COLORS[i % 2];

        const achievementText = this.add.text(panelX - panelW / 2 + 20, yPos, `✓ ${achievement.name}`, {
          fontSize: '13px',
          color: achievementColor,
          fontFamily: 'Arial, Helvetica, sans-serif',
        });
        achievementText.setOrigin(0, 0);
      }
    } else {
      // No achievements yet - show hint
      const hintText = this.add.text(panelX, panelY + 55, 'Land safely for\nyour first trophy!', {
        fontSize: '12px',
        color: '#888888',
        fontFamily: 'Arial, Helvetica, sans-serif',
        align: 'center',
      });
      hintText.setOrigin(0.5, 0);
    }

    // View All button at bottom of panel
    this.createViewAllButton(panelX, panelY, panelH, 'AchievementsScene');
  }

  private createCollectionPanel(panelX: number, panelY: number, panelW: number, panelH: number): void {
    const collectionSystem = getCollectionSystem();
    const discovered = collectionSystem.getDiscoveredCount();
    const total = collectionSystem.getTotalCount();

    // Panel background with unified gold border
    this.createPanelBackground(panelX, panelY, panelW, panelH);

    // Title with count - aligned with other panels
    const titleText = this.add.text(panelX, panelY + 14, `COLLECTION ${discovered}/${total}`, {
      fontSize: '14px',
      color: '#FFD700',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    titleText.setOrigin(0.5, 0);

    // Show recent discoveries (up to 5 item names)
    const recentDiscoveries = collectionSystem.getRecentDiscoveries(5);

    if (recentDiscoveries.length > 0) {
      for (let i = 0; i < recentDiscoveries.length; i++) {
        const itemType = recentDiscoveries[i];
        const itemData = COLLECTIBLE_TYPES[itemType as keyof typeof COLLECTIBLE_TYPES];
        if (!itemData) continue;

        const yPos = panelY + 36 + i * 15;
        // Use grey/orange tiger stripes for readability
        const itemColor = LIST_STRIPE_COLORS[i % 2];

        // Truncate long names
        let displayName = itemData.name;
        if (displayName.length > 16) {
          displayName = displayName.substring(0, 14) + '..';
        }

        const itemText = this.add.text(panelX - panelW / 2 + 20, yPos, `• ${displayName}`, {
          fontSize: '13px',
          color: itemColor,
          fontFamily: 'Arial, Helvetica, sans-serif',
        });
        itemText.setOrigin(0, 0);
      }
    } else {
      // No items yet - show hint
      const hintText = this.add.text(panelX, panelY + 55, 'Pick up items\nto discover them!', {
        fontSize: '12px',
        color: '#888888',
        fontFamily: 'Arial, Helvetica, sans-serif',
        align: 'center',
      });
      hintText.setOrigin(0.5, 0);
    }

    // View All button at bottom of panel
    this.createViewAllButton(panelX, panelY, panelH, 'CollectionScene');
  }

  private cycleCategory(direction: number): void {
    const currentIndex = CATEGORY_ORDER.indexOf(this.currentCategory);
    const newIndex = (currentIndex + direction + CATEGORY_ORDER.length) % CATEGORY_ORDER.length;
    this.currentCategory = CATEGORY_ORDER[newIndex];
    this.categoryLabel.setText(CATEGORY_LABELS[this.currentCategory]);
    this.loadScores();
  }

  private async loadScores(): Promise<void> {
    // Show loading state
    this.loadingText.setVisible(true);
    this.scoreTexts.forEach(text => text.setText(''));

    // Random animals for positions 4 and 5
    const animals = ['🐸', '🦊', '🐼', '🐨', '🦁', '🐯', '🐮', '🐷', '🐵', '🦄', '🐔', '🐧', '🐻', '🐶', '🐱'];
    const randomAnimal = () => animals[Math.floor(Math.random() * animals.length)];
    const medals = ['🥇', '🥈', '🥉', randomAnimal(), randomAnimal()];

    try {
      const scores = await fetchScores(this.currentCategory);
      this.loadingText.setVisible(false);
      this.updateScoreDisplay(scores, medals);
    } catch (error) {
      console.error('Failed to fetch scores:', error);
      // Fallback to local scores
      const localScores = getLocalScores();
      this.loadingText.setVisible(false);
      this.updateScoreDisplay(localScores, medals);
    }
  }

  private updateScoreDisplay(scores: HighScoreEntry[], medals: string[]): void {
    for (let i = 0; i < 5; i++) {
      const nameText = this.scoreTexts[i * 2];
      const scoreText = this.scoreTexts[i * 2 + 1];
      const color = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#AAAAAA';

      if (scores[i]) {
        nameText.setText(`${medals[i]} ${scores[i].name.substring(0, 10)}`);
        nameText.setColor(color);
        scoreText.setText(`${scores[i].score}`);
        scoreText.setColor(color);
      } else {
        nameText.setText(`${medals[i]} ---`);
        nameText.setColor('#555555');
        scoreText.setText('');
        scoreText.setColor('#555555');
      }
    }
  }

  private createPanelBackground(panelX: number, panelY: number, panelW: number, panelH: number): Phaser.GameObjects.Graphics {
    const panel = this.add.graphics();
    panel.fillStyle(0x0d1b2a, 0.85);
    panel.fillRoundedRect(panelX - panelW / 2, panelY, panelW, panelH, 8);
    panel.lineStyle(1, 0x1b3a5c, 0.6);
    panel.strokeRoundedRect(panelX - panelW / 2, panelY, panelW, panelH, 8);
    return panel;
  }

  private createViewAllButton(panelX: number, panelY: number, panelH: number, targetScene: string): Phaser.GameObjects.Text {
    const viewBtn = this.add.text(panelX, panelY + panelH - 12, '[ VIEW ALL ]', {
      fontSize: '13px',
      color: '#4CAF50',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    viewBtn.setOrigin(0.5, 0.5);
    viewBtn.setInteractive({ useHandCursor: true });

    viewBtn.on('pointerover', () => {
      viewBtn.setColor('#66BB6A');
    });

    viewBtn.on('pointerout', () => {
      viewBtn.setColor('#4CAF50');
    });

    viewBtn.on('pointerdown', () => {
      this.scene.start(targetScene);
    });

    return viewBtn;
  }

  private drawCloud(x: number, y: number, scale: number): void {
    const graphics = this.add.graphics();

    // Shadow layer (darker, offset down) - subtle on dark background
    graphics.fillStyle(0x888888, 0.1);
    graphics.fillCircle(x, y + 4 * scale, 30 * scale);
    graphics.fillCircle(x + 25 * scale, y - 10 * scale + 4 * scale, 25 * scale);
    graphics.fillCircle(x + 50 * scale, y + 4 * scale, 35 * scale);
    graphics.fillCircle(x + 25 * scale, y + 10 * scale + 4 * scale, 20 * scale);
    graphics.fillCircle(x - 20 * scale, y + 5 * scale + 4 * scale, 22 * scale);

    // Main layer - subtle for dark background
    graphics.fillStyle(0xFFFFFF, 0.2);
    graphics.fillCircle(x, y, 30 * scale);
    graphics.fillCircle(x + 25 * scale, y - 10 * scale, 25 * scale);
    graphics.fillCircle(x + 50 * scale, y, 35 * scale);
    graphics.fillCircle(x + 25 * scale, y + 10 * scale, 20 * scale);
    graphics.fillCircle(x - 20 * scale, y + 5 * scale, 22 * scale);

    // Highlight (brighter, offset up)
    graphics.fillStyle(0xFFFFFF, 0.1);
    graphics.fillCircle(x + 5 * scale, y - 5 * scale, 15 * scale);
  }

  private createSettingsButton(): void {
    // Settings gear button in top-right corner
    const settingsBtn = this.add.text(GAME_WIDTH - 20, 20, '⚙', {
      fontSize: '28px',
      color: '#888888',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    settingsBtn.setOrigin(1, 0);
    settingsBtn.setInteractive({ useHandCursor: true });
    settingsBtn.setDepth(100);

    settingsBtn.on('pointerover', () => settingsBtn.setColor('#FFD700'));
    settingsBtn.on('pointerout', () => settingsBtn.setColor('#888888'));
    settingsBtn.on('pointerdown', () => this.toggleSettingsPanel());
  }

  private toggleSettingsPanel(): void {
    if (this.settingsPanel) {
      this.settingsPanel.destroy();
      this.settingsPanel = null;
    } else {
      this.createSettingsPanel();
    }
  }

  private createSettingsPanel(): void {
    const panelW = 300;
    const panelH = 240;
    const panelX = GAME_WIDTH / 2;
    const panelY = GAME_HEIGHT / 2;

    // Container for all settings elements
    this.settingsPanel = this.add.container(panelX, panelY);
    this.settingsPanel.setDepth(1000);

    // Backdrop (semi-transparent overlay)
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.7);
    backdrop.fillRect(-GAME_WIDTH / 2, -GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    backdrop.setInteractive(new Phaser.Geom.Rectangle(-GAME_WIDTH / 2, -GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT), Phaser.Geom.Rectangle.Contains);
    backdrop.on('pointerdown', () => this.toggleSettingsPanel());
    this.settingsPanel.add(backdrop);

    // Panel background - consistent dark blue
    const panel = this.add.graphics();
    panel.fillStyle(0x0d1b2a, 0.98);
    panel.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
    panel.lineStyle(2, 0x1b3a5c, 0.8);
    panel.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
    this.settingsPanel.add(panel);

    // Title
    const title = this.add.text(0, -panelH / 2 + 20, 'GRAPHICS SETTINGS', {
      fontSize: '18px',
      color: '#FFD700',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0);
    this.settingsPanel.add(title);

    // Quality Level row
    const qualityLabel = this.add.text(-panelW / 2 + 20, -30, 'Quality:', {
      fontSize: '16px',
      color: '#FFFFFF',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    qualityLabel.setOrigin(0, 0.5);
    this.settingsPanel.add(qualityLabel);

    // Quality navigation: ◀ Ultra ▶
    const qualityLeftArrow = this.add.text(50, -30, '◀', {
      fontSize: '18px',
      color: '#4CAF50',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    qualityLeftArrow.setOrigin(0.5, 0.5);
    qualityLeftArrow.setInteractive({ useHandCursor: true });
    qualityLeftArrow.on('pointerdown', () => this.cycleQuality(-1));
    qualityLeftArrow.on('pointerover', () => qualityLeftArrow.setColor('#66BB6A'));
    qualityLeftArrow.on('pointerout', () => qualityLeftArrow.setColor('#4CAF50'));
    this.settingsPanel.add(qualityLeftArrow);

    this.settingsQualityLabel = this.add.text(90, -30, QUALITY_PRESETS[PerformanceSettings.getQualityLevel()].name, {
      fontSize: '16px',
      color: '#FFD700',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    this.settingsQualityLabel.setOrigin(0.5, 0.5);
    this.settingsPanel.add(this.settingsQualityLabel);

    const qualityRightArrow = this.add.text(130, -30, '▶', {
      fontSize: '18px',
      color: '#4CAF50',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    qualityRightArrow.setOrigin(0.5, 0.5);
    qualityRightArrow.setInteractive({ useHandCursor: true });
    qualityRightArrow.on('pointerdown', () => this.cycleQuality(1));
    qualityRightArrow.on('pointerover', () => qualityRightArrow.setColor('#66BB6A'));
    qualityRightArrow.on('pointerout', () => qualityRightArrow.setColor('#4CAF50'));
    this.settingsPanel.add(qualityRightArrow);

    // Auto-adjust toggle row
    const autoLabel = this.add.text(-panelW / 2 + 20, 10, 'Auto-adjust:', {
      fontSize: '16px',
      color: '#FFFFFF',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    autoLabel.setOrigin(0, 0.5);
    this.settingsPanel.add(autoLabel);

    this.settingsAutoLabel = this.add.text(90, 10, PerformanceSettings.isAutoAdjustEnabled() ? 'ON' : 'OFF', {
      fontSize: '16px',
      color: PerformanceSettings.isAutoAdjustEnabled() ? '#4CAF50' : '#FF6666',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    this.settingsAutoLabel.setOrigin(0.5, 0.5);
    this.settingsAutoLabel.setInteractive({ useHandCursor: true });
    this.settingsAutoLabel.on('pointerdown', () => this.toggleAutoAdjust());
    this.settingsPanel.add(this.settingsAutoLabel);

    // Description text
    const descText = this.add.text(0, 50, 'Auto-adjust lowers quality when FPS drops.\nLower quality = smoother gameplay.', {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'Arial, Helvetica, sans-serif',
      align: 'center',
    });
    descText.setOrigin(0.5, 0);
    this.settingsPanel.add(descText);

    // Close button
    const closeBtn = this.add.text(0, panelH / 2 - 25, '[ CLOSE ]', {
      fontSize: '14px',
      color: '#4CAF50',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    closeBtn.setOrigin(0.5, 0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#66BB6A'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#4CAF50'));
    closeBtn.on('pointerdown', () => this.toggleSettingsPanel());
    this.settingsPanel.add(closeBtn);
  }

  private cycleQuality(direction: number): void {
    const levels = PerformanceSettings.getAvailableLevels();
    const currentIndex = levels.indexOf(PerformanceSettings.getQualityLevel());
    const newIndex = (currentIndex + direction + levels.length) % levels.length;
    const newLevel = levels[newIndex];

    PerformanceSettings.setQualityLevel(newLevel, true);
    this.settingsQualityLabel.setText(QUALITY_PRESETS[newLevel].name);
  }

  private toggleAutoAdjust(): void {
    const newValue = !PerformanceSettings.isAutoAdjustEnabled();
    PerformanceSettings.setAutoAdjust(newValue);
    this.settingsAutoLabel.setText(newValue ? 'ON' : 'OFF');
    this.settingsAutoLabel.setColor(newValue ? '#4CAF50' : '#FF6666');
  }

}
