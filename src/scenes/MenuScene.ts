import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../constants';
import { getAchievementSystem } from '../systems/AchievementSystem';
import { getCollectionSystem } from '../systems/CollectionSystem';
import { TIER_COLORS } from '../data/achievements';
import { COLLECTIBLE_TYPES } from '../constants';
import { createGreenButton } from '../ui/UIButton';

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

    // Quote panel with dark background for readability
    const quotePanel = this.add.graphics();
    quotePanel.fillStyle(0x000000, 0.85);
    quotePanel.fillRoundedRect(GAME_WIDTH / 2 - 320, 390, 640, 40, 8);
    quotePanel.setDepth(5);

    const quoteText = this.add.text(GAME_WIDTH / 2, 410, selectedQuote, {
      fontSize: '16px',
      color: '#FFD700',
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
    });
    quoteText.setOrigin(0.5, 0.5);
    quoteText.setDepth(6);

    // Bottom section: 3 panels in a row (removed controls panel)
    const panelY = 445;
    const panelH = 130;
    const panelW = 220;
    const panelSpacing = 240;

    // HIGH SCORES panel (left)
    const scoresPanelX = GAME_WIDTH / 2 - panelSpacing;

    this.createPanelBackground(scoresPanelX, panelY, panelW, panelH);

    const scoresTitle = this.add.text(scoresPanelX, panelY + 18, 'TOP SCORES', {
      fontSize: '16px',
      color: '#FFD700',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    scoresTitle.setOrigin(0.5, 0);

    // Load and display high scores (top 5)
    const highScores = this.loadHighScores();
    const animals = ['🐸', '🦊', '🐼', '🐨', '🦁', '🐯', '🐮', '🐷', '🐵', '🦄', '🐔', '🐧', '🐻', '🐶', '🐱'];
    const randomAnimal = () => animals[Math.floor(Math.random() * animals.length)];
    const medals = ['🥇', '🥈', '🥉', randomAnimal(), randomAnimal()];
    for (let i = 0; i < 5; i++) {
      const score = highScores[i];
      const yPos = panelY + 36 + i * 16;
      const medal = medals[i];
      const color = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#AAAAAA';
      const leftX = scoresPanelX - panelW / 2 + 20;

      if (score) {
        // Medal and name
        const nameText = this.add.text(leftX, yPos,
          `${medal} ${score.name.substring(0, 10)}`, {
          fontSize: '14px',
          color: color,
          fontFamily: 'Arial, Helvetica, sans-serif',
        });
        nameText.setOrigin(0, 0);
        // Score on the right
        const scoreText = this.add.text(scoresPanelX + panelW / 2 - 20, yPos,
          `${score.score}`, {
          fontSize: '14px',
          color: color,
          fontFamily: 'Arial, Helvetica, sans-serif',
        });
        scoreText.setOrigin(1, 0);
      } else {
        const emptyText = this.add.text(leftX, yPos, `${medal} ---`, {
          fontSize: '14px',
          color: '#555555',
          fontFamily: 'Arial, Helvetica, sans-serif',
        });
        emptyText.setOrigin(0, 0);
      }
    }

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

    // Title with trophy icon and progress
    const titleText = this.add.text(panelX, panelY + 18, `ACHIEVEMENTS ${unlocked}/${total}`, {
      fontSize: '16px',
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
        const yPos = panelY + 38 + i * 16;
        const tierColor = '#' + TIER_COLORS[achievement.tier].toString(16).padStart(6, '0');

        const achievementText = this.add.text(panelX - panelW / 2 + 25, yPos, `✓ ${achievement.name}`, {
          fontSize: '14px',
          color: tierColor,
          fontFamily: 'Arial, Helvetica, sans-serif',
        });
        achievementText.setOrigin(0, 0);
      }
    } else {
      // No achievements yet - show hint
      const hintText = this.add.text(panelX, panelY + 50, 'Land safely for\nyour first trophy!', {
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

    // Title with count
    const titleText = this.add.text(panelX, panelY + 18, `COLLECTION ${discovered}/${total}`, {
      fontSize: '16px',
      color: '#FFD700',
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

        const yPos = panelY + 38 + i * 16;
        const itemColor = '#' + itemData.color.toString(16).padStart(6, '0');

        // Truncate long names
        let displayName = itemData.name;
        if (displayName.length > 16) {
          displayName = displayName.substring(0, 14) + '..';
        }

        const itemText = this.add.text(panelX - panelW / 2 + 25, yPos, `• ${displayName}`, {
          fontSize: '14px',
          color: itemColor,
          fontFamily: 'Arial, Helvetica, sans-serif',
        });
        itemText.setOrigin(0, 0);
      }
    } else {
      // No items yet - show hint
      const hintText = this.add.text(panelX, panelY + 50, 'Pick up items\nto discover them!', {
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

  private createPanelBackground(panelX: number, panelY: number, panelW: number, panelH: number): Phaser.GameObjects.Graphics {
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.6);
    panel.fillRoundedRect(panelX - panelW / 2, panelY, panelW, panelH, 8);
    panel.lineStyle(2, 0xFFD700, 0.3);
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

}
