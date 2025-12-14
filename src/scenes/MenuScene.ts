import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../constants';
import { getAchievementSystem } from '../systems/AchievementSystem';
import { getCollectionSystem } from '../systems/CollectionSystem';
import { TIER_COLORS } from '../data/achievements';
import { COLLECTIBLE_TYPES } from '../constants';

export class MenuScene extends Phaser.Scene {
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

    // Main title panel - dark box for contrast
    const titlePanel = this.add.graphics();
    titlePanel.fillStyle(0x000000, 0.7);
    titlePanel.fillRoundedRect(GAME_WIDTH / 2 - 250, 290, 500, 90, 12);

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

    // MISSION BRIEFING - clear objective
    const missionPanel = this.add.graphics();
    missionPanel.fillStyle(0xCC0000, 0.9);
    missionPanel.fillRoundedRect(GAME_WIDTH / 2 - 300, 395, 600, 50, 8);
    missionPanel.lineStyle(3, 0xFFD700);
    missionPanel.strokeRoundedRect(GAME_WIDTH / 2 - 300, 395, 600, 50, 8);

    const missionText = this.add.text(GAME_WIDTH / 2, 420,
      'MISSION: Deliver PEACE to Putino in Russia!', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    missionText.setOrigin(0.5, 0.5);

    // Trump quote box - dark background
    const quoteBox = this.add.graphics();
    quoteBox.fillStyle(0x000000, 0.6);
    quoteBox.fillRoundedRect(GAME_WIDTH / 2 - 290, 455, 580, 55, 8);

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

    const quoteText = this.add.text(GAME_WIDTH / 2, 472, selectedQuote, {
      fontSize: '16px',
      color: '#FFD700',
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
    });
    quoteText.setOrigin(0.5, 0);

    const quoteAttrib = this.add.text(GAME_WIDTH / 2, 492, '- President Trumpleton', {
      fontSize: '12px',
      color: '#AAAAAA',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    quoteAttrib.setOrigin(0.5, 0);

    // Bottom section: 4 panels in a row, then start button below
    const panelY = 520;
    const panelH = 105;
    const panelW = 145;
    const panelSpacing = 155;

    // HIGH SCORES panel on the left
    const scoresPanelX = GAME_WIDTH / 2 - panelSpacing * 1.5;

    const scoresPanel = this.add.graphics();
    scoresPanel.fillStyle(0x000000, 0.6);
    scoresPanel.fillRoundedRect(scoresPanelX - panelW / 2, panelY, panelW, panelH, 8);
    scoresPanel.lineStyle(2, 0xFFD700, 0.5);
    scoresPanel.strokeRoundedRect(scoresPanelX - panelW / 2, panelY, panelW, panelH, 8);

    const scoresTitle = this.add.text(scoresPanelX, panelY + 12, 'TOP SCORES', {
      fontSize: '12px',
      color: '#FFD700',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    scoresTitle.setOrigin(0.5, 0);

    // Load and display high scores (top 10)
    const highScores = this.loadHighScores();
    for (let i = 0; i < 10; i++) {
      const score = highScores[i];
      const yPos = panelY + 30 + i * 12;
      const rank = i + 1;
      const color = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#AAAAAA';

      if (score) {
        const scoreText = this.add.text(scoresPanelX, yPos,
          `${rank.toString().padStart(2, ' ')}. ${score.name.substring(0, 8)} ${score.score}`, {
          fontSize: '10px',
          color: color,
          fontFamily: 'Arial, Helvetica, sans-serif',
        });
        scoreText.setOrigin(0.5, 0);
      } else {
        const emptyText = this.add.text(scoresPanelX, yPos, `${rank.toString().padStart(2, ' ')}. ---`, {
          fontSize: '10px',
          color: '#555555',
          fontFamily: 'Arial, Helvetica, sans-serif',
        });
        emptyText.setOrigin(0.5, 0);
      }
    }

    // ACHIEVEMENTS panel (second from left)
    this.createAchievementsPanel(GAME_WIDTH / 2 - panelSpacing * 0.5, panelY, panelW, panelH);

    // COLLECTION panel (second from right)
    this.createCollectionPanel(GAME_WIDTH / 2 + panelSpacing * 0.5, panelY, panelW, panelH);

    // CONTROLS panel on the right
    const controlsPanelX = GAME_WIDTH / 2 + panelSpacing * 1.5;

    const controlsPanel = this.add.graphics();
    controlsPanel.fillStyle(0x000000, 0.6);
    controlsPanel.fillRoundedRect(controlsPanelX - panelW / 2, panelY, panelW, panelH, 8);
    controlsPanel.lineStyle(2, 0x4CAF50, 0.5);
    controlsPanel.strokeRoundedRect(controlsPanelX - panelW / 2, panelY, panelW, panelH, 8);

    const controlsTitle = this.add.text(controlsPanelX, panelY + 12, 'CONTROLS', {
      fontSize: '12px',
      color: '#4CAF50',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    controlsTitle.setOrigin(0.5, 0);

    const controlsList = [
      '↑ = Thrust',
      '←→ = Rotate',
      'SPACE = Gear',
      '↓ = Bomb',
    ];

    for (let i = 0; i < controlsList.length; i++) {
      const controlText = this.add.text(controlsPanelX, panelY + 30 + i * 16, controlsList[i], {
        fontSize: '11px',
        color: '#FFFFFF',
        fontFamily: 'Arial, Helvetica, sans-serif',
      });
      controlText.setOrigin(0.5, 0);
    }

    // Start button - below all panels with enough space
    const startButton = this.createButton(GAME_WIDTH / 2, panelY + panelH + 45, 'START MISSION', () => {
      this.startGame(1);
    });

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
    const enterHint = this.add.text(GAME_WIDTH / 2, panelY + panelH + 80, 'Press 1 for 1 Player  |  Press 2 for 2 Players', {
      fontSize: '13px',
      color: '#666666',
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

    }

  private startGame(playerCount: number = 1): void {
    this.scene.start('GameScene', { playerCount });
  }

  private createAchievementsPanel(panelX: number, panelY: number, panelW: number, panelH: number): void {
    const achievementSystem = getAchievementSystem();
    const unlocked = achievementSystem.getUnlockedCount();
    const total = achievementSystem.getTotalCount();

    // Panel background
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.6);
    panel.fillRoundedRect(panelX - panelW / 2, panelY, panelW, panelH, 8);
    panel.lineStyle(2, 0xffd700, 0.5);
    panel.strokeRoundedRect(panelX - panelW / 2, panelY, panelW, panelH, 8);

    // Title with trophy icon and progress
    const titleText = this.add.text(panelX, panelY + 12, `🏆 ${unlocked}/${total}`, {
      fontSize: '12px',
      color: '#FFD700',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    titleText.setOrigin(0.5, 0);

    // Show list of recent unlocks (up to 4)
    const recentUnlocks = achievementSystem.getRecentUnlocks(4);

    if (recentUnlocks.length > 0) {
      for (let i = 0; i < recentUnlocks.length; i++) {
        const achievement = recentUnlocks[i];
        const yPos = panelY + 30 + i * 14;
        const tierColor = '#' + TIER_COLORS[achievement.tier].toString(16).padStart(6, '0');

        const achievementText = this.add.text(panelX, yPos, `✓ ${achievement.name}`, {
          fontSize: '10px',
          color: tierColor,
          fontFamily: 'Arial, Helvetica, sans-serif',
        });
        achievementText.setOrigin(0.5, 0);
      }
    } else {
      // No achievements yet - show hint
      const hintText = this.add.text(panelX, panelY + 38, 'Land safely for\nyour first trophy!', {
        fontSize: '10px',
        color: '#888888',
        fontFamily: 'Arial, Helvetica, sans-serif',
        align: 'center',
      });
      hintText.setOrigin(0.5, 0);
    }

    // View All button at bottom of panel
    const viewBtn = this.add.text(panelX, panelY + panelH - 12, '[ VIEW ALL ]', {
      fontSize: '10px',
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
      this.scene.start('AchievementsScene');
    });
  }

  private createCollectionPanel(panelX: number, panelY: number, panelW: number, panelH: number): void {
    const collectionSystem = getCollectionSystem();
    const discovered = collectionSystem.getDiscoveredCount();
    const total = collectionSystem.getTotalCount();

    // Panel background
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.6);
    panel.fillRoundedRect(panelX - panelW / 2, panelY, panelW, panelH, 8);
    panel.lineStyle(2, 0xff6b35, 0.5); // Orange border for collection
    panel.strokeRoundedRect(panelX - panelW / 2, panelY, panelW, panelH, 8);

    // Title with count
    const titleText = this.add.text(panelX, panelY + 12, `ITEMS ${discovered}/${total}`, {
      fontSize: '11px',
      color: '#FF6B35',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    titleText.setOrigin(0.5, 0);

    // Show recent discoveries (up to 4 item names)
    const recentDiscoveries = collectionSystem.getRecentDiscoveries(4);

    if (recentDiscoveries.length > 0) {
      for (let i = 0; i < recentDiscoveries.length; i++) {
        const itemType = recentDiscoveries[i];
        const itemData = COLLECTIBLE_TYPES[itemType as keyof typeof COLLECTIBLE_TYPES];
        if (!itemData) continue;

        const yPos = panelY + 30 + i * 14;
        const itemColor = '#' + itemData.color.toString(16).padStart(6, '0');

        // Truncate long names
        let displayName = itemData.name;
        if (displayName.length > 14) {
          displayName = displayName.substring(0, 12) + '..';
        }

        const itemText = this.add.text(panelX, yPos, `• ${displayName}`, {
          fontSize: '10px',
          color: itemColor,
          fontFamily: 'Arial, Helvetica, sans-serif',
        });
        itemText.setOrigin(0.5, 0);
      }
    } else {
      // No items yet - show hint
      const hintText = this.add.text(panelX, panelY + 38, 'Pick up items\nto discover them!', {
        fontSize: '10px',
        color: '#888888',
        fontFamily: 'Arial, Helvetica, sans-serif',
        align: 'center',
      });
      hintText.setOrigin(0.5, 0);
    }

    // View All button at bottom of panel
    const viewBtn = this.add.text(panelX, panelY + panelH - 12, '[ VIEW ALL ]', {
      fontSize: '10px',
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
      this.scene.start('CollectionScene');
    });
  }

  private loadHighScores(): { name: string; score: number; date: string }[] {
    const STORAGE_KEY = 'peaceShuttle_highScores';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load high scores:', e);
    }
    return [];
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

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x4CAF50, 1);
    bg.fillRoundedRect(-120, -25, 240, 50, 12);
    bg.lineStyle(3, 0x2E7D32);
    bg.strokeRoundedRect(-120, -25, 240, 50, 12);

    const text = this.add.text(0, 0, label, {
      fontSize: '24px',
      color: '#FFFFFF',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);

    container.add([bg, text]);

    container.setInteractive(new Phaser.Geom.Rectangle(-120, -25, 240, 50), Phaser.Geom.Rectangle.Contains);

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x66BB6A, 1);
      bg.fillRoundedRect(-120, -25, 240, 50, 12);
      bg.lineStyle(3, 0x2E7D32);
      bg.strokeRoundedRect(-120, -25, 240, 50, 12);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x4CAF50, 1);
      bg.fillRoundedRect(-120, -25, 240, 50, 12);
      bg.lineStyle(3, 0x2E7D32);
      bg.strokeRoundedRect(-120, -25, 240, 50, 12);
    });

    container.on('pointerdown', callback);

    return container;
  }
}
