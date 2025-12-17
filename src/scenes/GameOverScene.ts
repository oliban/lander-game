import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, COLLECTIBLE_TYPES } from '../constants';
import { InventoryItem } from '../systems/InventorySystem';
import { createColoredButton } from '../ui/UIButton';
import {
  submitScore,
  fetchAllScores,
  getLocalScores,
  ScoreCategory,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  HighScoreEntry,
  AllScoresResponse,
} from '../services/ScoreService';
import { isMobileDevice } from '../utils/DeviceDetection';

interface DestroyedBuilding {
  name: string;
  points: number;
  textureKey: string;
  country: string;
}

interface GameOverData {
  victory: boolean;
  message: string;
  score?: number;
  elapsedTime?: number;
  inventory?: InventoryItem[];
  fuelRemaining?: number;
  hasPeaceMedal?: boolean;
  skipHighScoreCheck?: boolean;
  debugModeUsed?: boolean;
  noShake?: boolean;
  destroyedBuildings?: DestroyedBuilding[];
  // 2-player mode data
  playerCount?: number;
  p1Kills?: number;
  p2Kills?: number;
  // Death cause (projectile type, etc.)
  cause?: string;
}

// Using HighScoreEntry from ScoreService

const STORAGE_KEY = 'peaceShuttle_highScores';

const SUGGESTED_NAMES = [
  'Ivanka', 'Don Jr', 'Eric', 'Barron', 'Melania',
  'Jared', 'Tiffany', 'MAGA Mike', 'Bigly Winner',
  'Stable Genius', 'Very Smart', 'Tremendous',
  'The Best', 'Covfefe King', 'Deal Maker',
];

const CRASH_QUOTES = [
  "\"That was a perfect crash. Nobody crashes better than me.\"",
  "\"Fake news! The ground came up too fast!\"",
  "\"I meant to do that. Tremendous landing.\"",
  "\"The Europeans are jealous of our crashes.\"",
  "\"This is the Democrats' fault, believe me.\"",
];

const VICTORY_QUOTES = [
  "\"This is the greatest peace deal ever made!\"",
  "\"Putino and I, we have tremendous chemistry.\"",
  "\"I told you I could do it. Nobody believed me!\"",
  "\"We're going to have the best peace. Beautiful peace.\"",
  "\"Another perfect mission. I'm a stable genius.\"",
];

export class GameOverScene extends Phaser.Scene {
  private currentScore: number = 0;
  private isNewHighScore: boolean = false;
  private highScoreRank: number = -1;
  private nameEntryActive: boolean = false;
  private playerName: string = '';
  private nameInputText!: Phaser.GameObjects.Text;
  private cursorBlink!: Phaser.Time.TimerEvent;
  private mobileInput: HTMLInputElement | null = null;
  private wasVictory: boolean = false; // Track if this was a victory for high score restart
  // 2-player mode data to preserve across restart
  private playerCount: number = 1;
  private p1Kills: number = 0;
  private p2Kills: number = 0;
  // Pagination state for highscores
  private currentCategory: ScoreCategory = 'alltime';
  private displayedScores: HighScoreEntry[] = [];
  // Cache for all score categories (loaded once)
  private scoreCache: Partial<Record<ScoreCategory, HighScoreEntry[]>> = {};
  private cacheTimestamp: number = 0;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private scoreDisplayElements: Phaser.GameObjects.GameObject[] = [];
  private categoryLabel!: Phaser.GameObjects.Text;
  private isLoadingScores: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  /** Get restart data for GameScene, preserving 2-player kills */
  private getRestartData(): { playerCount: number; p1Kills: number; p2Kills: number } {
    return {
      playerCount: this.playerCount,
      p1Kills: this.p1Kills,
      p2Kills: this.p2Kills,
    };
  }

  private loadHighScores(): HighScoreEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load high scores:', e);
    }
    return [];
  }

  private isHighScore(score: number): { isHigh: boolean; rank: number } {
    const highScores = this.loadHighScores();
    if (highScores.length < 10) {
      return { isHigh: true, rank: highScores.length };
    }
    for (let i = 0; i < highScores.length; i++) {
      if (score > highScores[i].score) {
        return { isHigh: true, rank: i };
      }
    }
    return { isHigh: false, rank: -1 };
  }

  create(data: GameOverData): void {
    // Solid sky background (failsafe)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x87CEEB);

    // Sky gradient background (cartoon style)
    const graphics = this.add.graphics();
    for (let y = 0; y < GAME_HEIGHT; y++) {
      const ratio = y / GAME_HEIGHT;
      const r = Math.floor(135 - ratio * 30);
      const g = Math.floor(206 - ratio * 50);
      const b = Math.floor(235 - ratio * 20);
      graphics.fillStyle((r << 16) | (g << 8) | b);
      graphics.fillRect(0, y, GAME_WIDTH, 1);
    }

    // Some cartoon clouds
    this.drawCloud(150, 80, 1.0);
    this.drawCloud(500, 120, 0.7);
    this.drawCloud(900, 60, 0.9);
    this.drawCloud(1100, 140, 0.6);

    // Store victory state for high score restart
    this.wasVictory = data.victory;

    // Store 2-player mode data for restart
    this.playerCount = data.playerCount ?? 1;
    this.p1Kills = data.p1Kills ?? 0;
    this.p2Kills = data.p2Kills ?? 0;

    if (data.victory) {
      this.createVictoryScreen(data);
    } else {
      this.createCrashScreen(data);
    }
  }

  private drawCloud(x: number, y: number, scale: number): void {
    const cloud = this.add.graphics();

    // Shadow layer (grey, offset down)
    cloud.fillStyle(0xCCCCCC, 0.4);
    cloud.fillCircle(x, y + 4 * scale, 25 * scale);
    cloud.fillCircle(x + 20 * scale, y - 8 * scale + 4 * scale, 20 * scale);
    cloud.fillCircle(x + 40 * scale, y + 4 * scale, 28 * scale);
    cloud.fillCircle(x + 20 * scale, y + 8 * scale + 4 * scale, 18 * scale);

    // Main white layer
    cloud.fillStyle(0xFFFFFF, 0.9);
    cloud.fillCircle(x, y, 25 * scale);
    cloud.fillCircle(x + 20 * scale, y - 8 * scale, 20 * scale);
    cloud.fillCircle(x + 40 * scale, y, 28 * scale);
    cloud.fillCircle(x + 20 * scale, y + 8 * scale, 18 * scale);

    // Highlight (brighter, offset up)
    cloud.fillStyle(0xFFFFFF, 0.4);
    cloud.fillCircle(x + 5 * scale, y - 5 * scale, 12 * scale);
  }

  private selectedVictoryQuoteIndex: number = 0;

  private createVictoryScreen(data: GameOverData): void {
    // Play random victory quote (use same index for audio and text)
    this.selectedVictoryQuoteIndex = Math.floor(Math.random() * VICTORY_QUOTES.length);
    this.sound.play(`victory${this.selectedVictoryQuoteIndex + 1}`);

    // Play fanfare and show confetti for victory!
    this.createCelebrationParticles();
    if (this.cache.audio.exists('fanfare')) {
      this.sound.play('fanfare', { volume: 0.8 });
    }

    // Calculate score first
    const scoreDetails = this.calculateScore(data);
    const finalScore = scoreDetails.total + (data.score || 0); // Add destruction score
    this.currentScore = finalScore;

    // Check if this is a high score (skip if debug mode was used)
    if (data.debugModeUsed) {
      this.isNewHighScore = false;
      this.highScoreRank = -1;
    } else {
      const highScoreCheck = this.isHighScore(finalScore);
      this.isNewHighScore = highScoreCheck.isHigh;
      this.highScoreRank = highScoreCheck.rank;
    }

    // Title with shadow (cartoon style)
    const titleShadow = this.add.text(GAME_WIDTH / 2 + 3, 38, 'MISSION COMPLETE!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '36px',
      color: '#2E7D32',
      fontStyle: 'bold',
    });
    titleShadow.setOrigin(0.5, 0.5);

    const title = this.add.text(GAME_WIDTH / 2, 35, 'MISSION COMPLETE!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '36px',
      color: '#4CAF50',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);

    // Message
    this.add.text(GAME_WIDTH / 2, 68, data.message, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#333333',
    }).setOrigin(0.5, 0.5);

    // Layout constants - 3 columns
    const leftPanelX = 30;
    const middlePanelX = 430;
    const rightPanelX = 830;
    const panelTop = 95;
    const panelWidth = 380;
    const mainPanelHeight = 420;

    // === LEFT PANEL: Score Tally ===
    const leftPanel = this.add.graphics();
    leftPanel.fillStyle(0xFFFFFF, 0.95);
    leftPanel.fillRoundedRect(leftPanelX, panelTop, panelWidth, mainPanelHeight, 12);
    leftPanel.lineStyle(2, 0x333333);
    leftPanel.strokeRoundedRect(leftPanelX, panelTop, panelWidth, mainPanelHeight, 12);

    this.add.text(leftPanelX + panelWidth / 2, panelTop + 15, 'SCORE BREAKDOWN', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '18px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    let yPos = panelTop + 45;

    // Time bonus
    const timeStr = this.formatTime(data.elapsedTime || 0);
    this.add.text(leftPanelX + 15, yPos, `⏱ Time: ${timeStr}`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#333333',
    });
    this.add.text(leftPanelX + panelWidth - 15, yPos, `+${scoreDetails.timeBonus}`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#4CAF50',
      fontStyle: 'bold',
    }).setOrigin(1, 0);
    yPos += 28;

    // Divider
    const div1 = this.add.graphics();
    div1.lineStyle(1, 0xDDDDDD);
    div1.lineBetween(leftPanelX + 15, yPos, leftPanelX + panelWidth - 15, yPos);
    yPos += 10;

    // Goods Delivered header
    this.add.text(leftPanelX + 15, yPos, 'Goods Delivered:', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#333333',
      fontStyle: 'bold',
    });
    yPos += 22;

    // Inventory items with actual cargo images
    if (data.inventory) {
      for (const item of data.inventory) {
        if (item.count > 0) {
          // Get texture key from item type (same logic as Collectible.ts)
          const textureKey = item.type.toLowerCase().replace('_', '');

          // Draw small cargo image
          try {
            const itemImage = this.add.image(leftPanelX + 30, yPos + 10, textureKey);
            itemImage.setDisplaySize(20, 20);
          } catch {
            // Fallback colored square if texture not found
            const fallback = this.add.graphics();
            fallback.fillStyle(item.color, 1);
            fallback.fillRect(leftPanelX + 20, yPos + 2, 16, 16);
          }

          const itemPoints = this.getItemPoints(item);
          this.add.text(leftPanelX + 50, yPos + 2, `${item.name} x${item.count}`, {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '13px',
            color: '#333333',
          });
          this.add.text(leftPanelX + panelWidth - 15, yPos + 2, `+${itemPoints}`, {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '13px',
            color: itemPoints > 0 ? '#4CAF50' : '#999999',
          }).setOrigin(1, 0);
          yPos += 22;
        }
      }
    }

    if (scoreDetails.itemsTotal === 0) {
      this.add.text(leftPanelX + 20, yPos, '(None)', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '13px',
        color: '#999999',
        fontStyle: 'italic',
      });
      yPos += 22;
    }

    yPos += 5;

    // Peace Medal bonus
    if (data.hasPeaceMedal) {
      const div2 = this.add.graphics();
      div2.lineStyle(1, 0xDDDDDD);
      div2.lineBetween(leftPanelX + 15, yPos, leftPanelX + panelWidth - 15, yPos);
      yPos += 10;

      this.add.text(leftPanelX + 15, yPos, '🏅 PEACE MEDAL!', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '14px',
        color: '#FFD700',
        fontStyle: 'bold',
      });
      this.add.text(leftPanelX + panelWidth - 15, yPos, '+5000', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '14px',
        color: '#FFD700',
        fontStyle: 'bold',
      }).setOrigin(1, 0);
      yPos += 25;
    }

    // Destruction bonus
    if (data.score && data.score > 0) {
      this.add.text(leftPanelX + 15, yPos, '💥 Destruction Bonus:', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '14px',
        color: '#FF6600',
        fontStyle: 'bold',
      });
      this.add.text(leftPanelX + panelWidth - 15, yPos, `+${data.score}`, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '14px',
        color: '#FF6600',
        fontStyle: 'bold',
      }).setOrigin(1, 0);
      yPos += 25;
    }

    // Total Score at bottom of left panel
    const totalY = panelTop + mainPanelHeight - 50;
    const divTotal = this.add.graphics();
    divTotal.lineStyle(2, 0x333333);
    divTotal.lineBetween(leftPanelX + 15, totalY - 5, leftPanelX + panelWidth - 15, totalY - 5);

    this.add.text(leftPanelX + panelWidth / 2 + 2, totalY + 12, `TOTAL: ${finalScore}`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '22px',
      color: '#B8860B',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(leftPanelX + panelWidth / 2, totalY + 10, `TOTAL: ${finalScore}`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '22px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // === MIDDLE PANEL: Destruction Tally ===
    const middlePanel = this.add.graphics();
    middlePanel.fillStyle(0x2D2D2D, 0.95);
    middlePanel.fillRoundedRect(middlePanelX, panelTop, panelWidth, mainPanelHeight, 12);
    middlePanel.lineStyle(2, 0xFF6600);
    middlePanel.strokeRoundedRect(middlePanelX, panelTop, panelWidth, mainPanelHeight, 12);

    this.add.text(middlePanelX + panelWidth / 2, panelTop + 15, '💥 DESTRUCTION REPORT', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '18px',
      color: '#FF6600',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    const destroyedBuildings = data.destroyedBuildings || [];
    let destructionY = panelTop + 50;

    // Separate cannons from other buildings
    const cannons = destroyedBuildings.filter(b => b.name === 'Cannon');
    const buildings = destroyedBuildings.filter(b => b.name !== 'Cannon');
    const totalCannonPoints = cannons.reduce((sum, c) => sum + c.points, 0);

    if (destroyedBuildings.length === 0) {
      this.add.text(middlePanelX + panelWidth / 2, panelTop + mainPanelHeight / 2, 'No buildings destroyed\n\n(Peaceful mission!)', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '14px',
        color: '#888888',
        fontStyle: 'italic',
        align: 'center',
      }).setOrigin(0.5, 0.5);
    } else {
      // Show cannons summary first (if any)
      if (cannons.length > 0) {
        // Try to show cannon thumbnail
        try {
          const thumb = this.add.image(middlePanelX + 30, destructionY + 14, 'cannon');
          thumb.setDisplaySize(28, 28);
          thumb.setOrigin(0.5, 0.5);
        } catch {
          const placeholder = this.add.graphics();
          placeholder.fillStyle(0x666666, 1);
          placeholder.fillRect(middlePanelX + 16, destructionY, 28, 28);
        }

        this.add.text(middlePanelX + 50, destructionY + 2, `Cannons x${cannons.length}`, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '12px',
          color: '#FFFFFF',
        });

        this.add.text(middlePanelX + 50, destructionY + 16, 'Various countries', {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '10px',
          color: '#888888',
        });

        this.add.text(middlePanelX + panelWidth - 15, destructionY + 8, `+${totalCannonPoints}`, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '13px',
          color: '#FF6600',
          fontStyle: 'bold',
        }).setOrigin(1, 0);

        destructionY += 36;
      }

      // Show up to 9 buildings with their images (leaving room for cannon row)
      const maxToShow = Math.min(buildings.length, cannons.length > 0 ? 9 : 10);
      for (let i = 0; i < maxToShow; i++) {
        const building = buildings[i];

        // Try to show building thumbnail
        try {
          const thumb = this.add.image(middlePanelX + 30, destructionY + 14, building.textureKey);
          thumb.setDisplaySize(28, 28);
          thumb.setOrigin(0.5, 0.5);
        } catch {
          // If texture not found, draw a placeholder
          const placeholder = this.add.graphics();
          placeholder.fillStyle(0x666666, 1);
          placeholder.fillRect(middlePanelX + 16, destructionY, 28, 28);
        }

        // Building name (truncate if too long)
        const displayName = building.name.length > 20 ? building.name.substring(0, 18) + '...' : building.name;
        this.add.text(middlePanelX + 50, destructionY + 2, displayName, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '12px',
          color: '#FFFFFF',
        });

        // Country
        this.add.text(middlePanelX + 50, destructionY + 16, building.country, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '10px',
          color: '#888888',
        });

        // Points
        this.add.text(middlePanelX + panelWidth - 15, destructionY + 8, `+${building.points}`, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '13px',
          color: '#FF6600',
          fontStyle: 'bold',
        }).setOrigin(1, 0);

        destructionY += 36;
      }

      const remainingBuildings = buildings.length - maxToShow;
      if (remainingBuildings > 0) {
        this.add.text(middlePanelX + panelWidth / 2, destructionY + 10, `...and ${remainingBuildings} more!`, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '12px',
          color: '#888888',
          fontStyle: 'italic',
        }).setOrigin(0.5, 0);
      }
    }

    // === RIGHT PANEL: High Scores ===
    const rightPanel = this.add.graphics();
    rightPanel.fillStyle(0x1A1A2E, 0.95);
    rightPanel.fillRoundedRect(rightPanelX, panelTop, panelWidth, mainPanelHeight, 12);
    rightPanel.lineStyle(2, 0xFFD700);
    rightPanel.strokeRoundedRect(rightPanelX, panelTop, panelWidth, mainPanelHeight, 12);

    this.add.text(rightPanelX + panelWidth / 2, panelTop + 15, '🏆 HIGH SCORES', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // High scores list
    const highScores = this.loadHighScores();
    const medalEmojis = ['🥇', '🥈', '🥉', '4.', '5.', '6.', '7.', '8.', '9.', '10'];
    const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#AAAAAA', '#AAAAAA', '#AAAAAA', '#AAAAAA', '#AAAAAA', '#AAAAAA', '#AAAAAA'];
    let scoreY = panelTop + 55;

    if (highScores.length === 0) {
      this.add.text(rightPanelX + panelWidth / 2, panelTop + mainPanelHeight / 2, 'No scores yet!\n\nBe the first!', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '16px',
        color: '#AAAAAA',
        align: 'center',
      }).setOrigin(0.5, 0.5);
    } else {
      for (let i = 0; i < 10; i++) {
        if (i < highScores.length) {
          const entry = highScores[i];
          const isCurrentScore = entry.score === finalScore && this.highScoreRank === i;

          if (isCurrentScore) {
            const highlight = this.add.graphics();
            highlight.fillStyle(0xFFD700, 0.15);
            highlight.fillRoundedRect(rightPanelX + 10, scoreY - 2, panelWidth - 20, 28, 5);
          }

          // Medal/rank
          this.add.text(rightPanelX + 25, scoreY + 10, medalEmojis[i], {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
            color: medalColors[i],
          }).setOrigin(0.5, 0.5);

          // Name
          this.add.text(rightPanelX + 45, scoreY + 10, entry.name, {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
            color: isCurrentScore ? '#FFD700' : '#FFFFFF',
            fontStyle: isCurrentScore ? 'bold' : 'normal',
          }).setOrigin(0, 0.5);

          // Score
          this.add.text(rightPanelX + panelWidth - 20, scoreY + 10, entry.score.toString(), {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
            color: isCurrentScore ? '#FFD700' : '#90EE90',
            fontStyle: 'bold',
          }).setOrigin(1, 0.5);

          scoreY += 35;
        } else {
          // Empty slot
          this.add.text(rightPanelX + 25, scoreY + 10, medalEmojis[i], {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
            color: '#444444',
          }).setOrigin(0.5, 0.5);
          this.add.text(rightPanelX + 45, scoreY + 10, '---', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
            color: '#444444',
          }).setOrigin(0, 0.5);
          scoreY += 35;
        }
      }
    }

    // Celebration confetti
    this.createCelebrationParticles();

    // Quote at bottom (synced with audio)
    const quote = VICTORY_QUOTES[this.selectedVictoryQuoteIndex];
    this.add.text(GAME_WIDTH / 2, panelTop + mainPanelHeight + 25, quote, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '12px',
      color: '#4a5568',
      fontStyle: 'italic',
    }).setOrigin(0.5, 0);

    // Show name entry or buttons
    const buttonY = panelTop + mainPanelHeight + 70;
    if (this.isNewHighScore) {
      this.createNameEntryUI(GAME_WIDTH / 2, buttonY - 20, finalScore);
    } else {
      // Buttons
      createColoredButton(this, GAME_WIDTH / 2 - 120, buttonY, 'PLAY AGAIN', 0x4CAF50, () => {
        this.scene.start('GameScene', this.getRestartData());
      }, 'medium');

      createColoredButton(this, GAME_WIDTH / 2 + 120, buttonY, 'MAIN MENU', 0x607D8B, () => {
        this.scene.start('MenuScene');
      }, 'medium');

      // Key hints
      this.add.text(GAME_WIDTH / 2, buttonY + 55, 'ENTER to retry  |  1 for 1P  |  2 for 2P  |  3 for Dogfight', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '13px',
        color: '#2d3748',
        fontStyle: 'italic',
      }).setOrigin(0.5, 0.5);

      // Enter key to play again (preserves kills in 2-player mode)
      this.input.keyboard!.on('keydown-ENTER', () => {
        if (!this.nameEntryActive) {
          this.scene.start('GameScene', this.getRestartData());
        }
      });

      // Keys 1/2/3 start fresh game with selected mode (does not preserve kills)
      // Key 1 for 1 player mode - key code 49 is '1'
      const key1 = this.input.keyboard!.addKey(49);
      key1.on('down', () => {
        if (!this.nameEntryActive) {
          this.scene.start('GameScene', { playerCount: 1 });
        }
      });

      // Key 2 for 2 player mode - key code 50 is '2'
      const key2 = this.input.keyboard!.addKey(50);
      key2.on('down', () => {
        if (!this.nameEntryActive) {
          this.scene.start('GameScene', { playerCount: 2 });
        }
      });

      // Key 3 for dogfight mode - key code 51 is '3'
      const key3 = this.input.keyboard!.addKey(51);
      key3.on('down', () => {
        if (!this.nameEntryActive) {
          this.scene.start('GameScene', { playerCount: 2, gameMode: 'dogfight' });
        }
      });
    }
  }

  private calculateScore(data: GameOverData): { timeBonus: number; itemsTotal: number; peaceMedalBonus: number; total: number } {
    // Time bonus: faster = more points (max 5000 for under 2 minutes)
    const seconds = Math.floor((data.elapsedTime || 0) / 1000);
    const timeBonus = Math.max(0, 5000 - seconds * 10);

    // Items bonus - MAGA hats are most valuable
    let itemsTotal = 0;
    if (data.inventory) {
      for (const item of data.inventory) {
        itemsTotal += this.getItemPoints(item);
      }
    }

    // Peace Medal bonus is already added to destruction score in GameScene (5000 points)
    const peaceMedalBonus = 0;

    return {
      timeBonus,
      itemsTotal,
      peaceMedalBonus,
      total: timeBonus + itemsTotal + peaceMedalBonus,
    };
  }

  private getItemPoints(item: InventoryItem): number {
    // Point values for different cargo types (score, not fuel!)
    const pointValues: Record<string, number> = {
      // Bomb items (lower value as they're common and droppable)
      'Burger': 50,
      'Hamberder': 50,
      'Diet Coke': 50,
      'Trump Steak': 50,
      'Vodka': 50,
      // Tradeable items
      'Dollar': 10,
      'Covfefe': 50,
      'Hair Spray': 50,
      'Twitter Bird': 200,
      // Rare items
      'Casino Chip': 150,
      'MAGA Hat': 500,
      'NFT': 0, // Worthless!
      'Bitcoin': 80,
      // Very rare
      'Classified Docs': 200,
      'Golden Toilet': 300,
      // Russian items
      'Matryoshka': 100,
      'Oligarch Gold': 250,
      // Easter egg
      'Tan Suit': 75,
      // Power-ups (no trade value but bonus points for having them)
      'Trump Tower': 100,
      'Red Tie': 100,
    };
    return (pointValues[item.name] ?? 50) * item.count;
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private selectedCrashQuoteIndex: number = 0;

  private createCrashScreen(data: GameOverData): void {
    // Special handling for space death - show victory-style screen
    const isSpaceDeath = data.cause === 'space';

    // Play random crash quote (use same index for audio and text)
    this.selectedCrashQuoteIndex = Math.floor(Math.random() * CRASH_QUOTES.length);

    // Play special sound for baguette death, skip sound for space death (already played)
    if (!isSpaceDeath) {
      if (data.cause === 'baguette' && this.cache.audio.exists('baguette_death')) {
        this.sound.play('baguette_death');
      } else {
        this.sound.play(`crash${this.selectedCrashQuoteIndex + 1}`);
      }
    }

    const score = data.score || 0;
    this.currentScore = score;

    // Check if this is a high score (skip if we just saved or debug mode was used)
    if (data.skipHighScoreCheck || data.debugModeUsed) {
      this.isNewHighScore = false;
      this.highScoreRank = -1;
    } else {
      const highScoreCheck = this.isHighScore(score);
      this.isNewHighScore = highScoreCheck.isHigh && score > 0;
      this.highScoreRank = highScoreCheck.rank;
    }

    // Title with shadow (cartoon style) - Gold for space, red for crash
    const titleText = isSpaceDeath ? 'YOU WON!' : 'MISSION FAILED';
    const titleColor = isSpaceDeath ? '#FFD700' : '#F44336';
    const titleShadowColor = isSpaceDeath ? '#B8860B' : '#8B0000';
    const titleY = isSpaceDeath ? 50 : 70;

    const titleShadow = this.add.text(GAME_WIDTH / 2 + 3, titleY + 3, titleText, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '48px',
      color: titleShadowColor,
      fontStyle: 'bold',
    });
    titleShadow.setOrigin(0.5, 0.5);

    const title = this.add.text(GAME_WIDTH / 2, titleY, titleText, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '48px',
      color: titleColor,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);

    // Different layout for space death vs normal crash
    let nextY: number;

    if (isSpaceDeath) {
      // Space death: Show congratulations and space message nicely spaced
      const congratsText = this.add.text(GAME_WIDTH / 2, 100, 'Congratulations!', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '24px',
        color: '#228B22',
        fontStyle: 'bold',
      });
      congratsText.setOrigin(0.5, 0.5);

      // Space message with rocket emojis
      const spaceMessage = this.add.text(GAME_WIDTH / 2, 155, '🚀 Trump will now perform very important work in space. 🚀\nMaking the galaxy great again!', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '18px',
        color: '#4169E1',
        align: 'center',
        lineSpacing: 8,
      });
      spaceMessage.setOrigin(0.5, 0.5);

      // Score below the message
      this.add.text(GAME_WIDTH / 2, 215, `SCORE: ${score}`, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '28px',
        color: '#FFD700',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);

      nextY = 250;

      // Celebration confetti and fanfare for space victory!
      this.createCelebrationParticles();
      if (this.cache.audio.exists('fanfare')) {
        this.sound.play('fanfare', { volume: 0.8 });
      }
    } else {
      // Normal crash: Original layout
      const message = this.add.text(GAME_WIDTH / 2, 120, data.message, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '20px',
        color: '#333333',
        align: 'center',
      });
      message.setOrigin(0.5, 0.5);

      // Show score
      this.add.text(GAME_WIDTH / 2, 160, `SCORE: ${score}`, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '28px',
        color: '#FFD700',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);

      nextY = 210;
    }

    // Quote (synced with audio) - special quote for baguette death, skip for space death
    if (!isSpaceDeath) {
      const quote = data.cause === 'baguette'
        ? "\"It was a beautiful baguette, in a way. Very long. Very gold. Tremendous crust.\""
        : CRASH_QUOTES[this.selectedCrashQuoteIndex];
      const quoteText = this.add.text(GAME_WIDTH / 2, 210, quote, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '14px',
        color: '#666666',
        fontStyle: 'italic',
        wordWrap: { width: 500 },
        align: 'center',
      });
      quoteText.setOrigin(0.5, 0.5);
    }

    // Show name entry or leaderboard
    if (this.isNewHighScore) {
      this.createNameEntryUI(GAME_WIDTH / 2, 240, score);
    } else {
      // Show leaderboard
      this.createLeaderboard(GAME_WIDTH / 2, 250, score);

      // Buttons below leaderboard
      createColoredButton(this, GAME_WIDTH / 2 - 110, 480, 'TRY AGAIN', 0xFF9800, () => {
        this.scene.start('GameScene', this.getRestartData());
      }, 'medium');

      createColoredButton(this, GAME_WIDTH / 2 + 110, 480, 'MAIN MENU', 0x607D8B, () => {
        this.scene.start('MenuScene');
      }, 'medium');

      // Key hints
      const enterHint = this.add.text(GAME_WIDTH / 2, 540, 'ENTER to retry  |  1 for 1P  |  2 for 2P  |  3 for Dogfight', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '14px',
        color: '#888888',
      });
      enterHint.setOrigin(0.5, 0.5);

      // Enter key to try again (preserves kills in 2-player mode)
      this.input.keyboard!.on('keydown-ENTER', () => {
        if (!this.nameEntryActive) {
          this.scene.start('GameScene', this.getRestartData());
        }
      });

      // Keys 1/2/3 start fresh game with selected mode (does not preserve kills)
      // Key 1 for 1 player mode - key code 49 is '1'
      const key1 = this.input.keyboard!.addKey(49);
      key1.on('down', () => {
        if (!this.nameEntryActive) {
          this.scene.start('GameScene', { playerCount: 1 });
        }
      });

      // Key 2 for 2 player mode - key code 50 is '2'
      const key2 = this.input.keyboard!.addKey(50);
      key2.on('down', () => {
        if (!this.nameEntryActive) {
          this.scene.start('GameScene', { playerCount: 2 });
        }
      });

      // Key 3 for dogfight mode - key code 51 is '3'
      const key3 = this.input.keyboard!.addKey(51);
      key3.on('down', () => {
        if (!this.nameEntryActive) {
          this.scene.start('GameScene', { playerCount: 2, gameMode: 'dogfight' });
        }
      });
    }
  }

  private createCelebrationParticles(): void {
    // Cartoon confetti - colorful shapes floating down
    const colors = [0xFF5722, 0x4CAF50, 0x2196F3, 0xFFEB3B, 0x9C27B0, 0xE91E63];

    for (let i = 0; i < 30; i++) {
      this.time.delayedCall(i * 100, () => {
        const startX = Math.random() * GAME_WIDTH;
        const color = colors[Math.floor(Math.random() * colors.length)];

        // Use a simple rectangle sprite instead of graphics for proper tweening
        const confetti = this.add.rectangle(startX, -20, 10, 15, color);
        confetti.setOrigin(0.5, 0.5);

        // Random shape - make some circular by adjusting corner radius look
        if (Math.random() > 0.5) {
          confetti.setSize(12, 12);
        }

        this.tweens.add({
          targets: confetti,
          y: GAME_HEIGHT + 50,
          x: startX + (Math.random() - 0.5) * 200,
          angle: Math.random() * 720,
          duration: 2000 + Math.random() * 1000,
          ease: 'Sine.easeIn',
          onComplete: () => confetti.destroy(),
        });
      });
    }
  }

  private createNameEntryUI(x: number, y: number, score: number): void {
    this.nameEntryActive = true;
    this.playerName = '';

    // Background panel - taller to fit everything
    const panel = this.add.graphics();
    panel.fillStyle(0x2F4F4F, 0.95);
    panel.fillRoundedRect(x - 180, y, 360, 220, 12);
    panel.lineStyle(3, 0xFFD700);
    panel.strokeRoundedRect(x - 180, y, 360, 220, 12);

    // Title
    this.add.text(x, y + 18, '🏆 NEW HIGH SCORE! 🏆', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Instruction
    this.add.text(x, y + 48, 'Enter your name:', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF',
    }).setOrigin(0.5, 0);

    // Name input field background
    const inputBg = this.add.graphics();
    inputBg.fillStyle(0xFFFFFF, 1);
    inputBg.fillRoundedRect(x - 100, y + 68, 200, 35, 6);
    inputBg.lineStyle(2, 0x333333);
    inputBg.strokeRoundedRect(x - 100, y + 68, 200, 35, 6);

    // On mobile, create an actual HTML input to trigger keyboard
    if (isMobileDevice()) {
      this.createMobileInput(x, y, score);
    }

    // Name input text (display only on mobile, input on desktop)
    this.nameInputText = this.add.text(x, y + 85, '|', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '18px',
      color: '#333333',
      fontStyle: 'bold',
    });
    this.nameInputText.setOrigin(0.5, 0.5);

    // Make the input area tappable on mobile to focus the hidden input
    if (isMobileDevice()) {
      const inputHitArea = this.add.rectangle(x, y + 85, 200, 35, 0x000000, 0);
      inputHitArea.setInteractive();
      inputHitArea.on('pointerdown', () => {
        if (this.mobileInput) {
          this.mobileInput.focus();
        }
      });
    }

    // Cursor blinking
    this.cursorBlink = this.time.addEvent({
      delay: 500,
      callback: () => {
        const current = this.nameInputText.text;
        if (current.endsWith('|')) {
          this.nameInputText.setText(this.playerName);
        } else {
          this.nameInputText.setText(this.playerName + '|');
        }
      },
      loop: true,
    });

    // Suggested names - show 4 random short ones to fit
    const shortNames = SUGGESTED_NAMES.filter(n => n.length <= 10);
    const shuffled = [...shortNames].sort(() => Math.random() - 0.5);
    const suggestions = shuffled.slice(0, 4);

    this.add.text(x, y + 112, 'Quick picks:', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#AAAAAA',
    }).setOrigin(0.5, 0);

    // Calculate total width of chips to center them
    const chipWidths = suggestions.map(name => Math.max(55, name.length * 7 + 14));
    const totalChipsWidth = chipWidths.reduce((sum, w) => sum + w, 0) + (suggestions.length - 1) * 6;
    let chipX = x - totalChipsWidth / 2;

    for (let i = 0; i < suggestions.length; i++) {
      const name = suggestions[i];
      const chipWidth = chipWidths[i];
      const chip = this.add.container(chipX + chipWidth / 2, y + 138);

      const chipBg = this.add.graphics();
      chipBg.fillStyle(0x4169E1, 1);
      chipBg.fillRoundedRect(-chipWidth / 2, -11, chipWidth, 22, 11);

      const chipText = this.add.text(0, 0, name, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10px',
        color: '#FFFFFF',
      });
      chipText.setOrigin(0.5, 0.5);

      chip.add([chipBg, chipText]);
      chip.setInteractive(new Phaser.Geom.Rectangle(-chipWidth / 2, -11, chipWidth, 22), Phaser.Geom.Rectangle.Contains);

      chip.on('pointerover', () => {
        chipBg.clear();
        chipBg.fillStyle(0x6495ED, 1);
        chipBg.fillRoundedRect(-chipWidth / 2, -11, chipWidth, 22, 11);
      });

      chip.on('pointerout', () => {
        chipBg.clear();
        chipBg.fillStyle(0x4169E1, 1);
        chipBg.fillRoundedRect(-chipWidth / 2, -11, chipWidth, 22, 11);
      });

      chip.on('pointerdown', () => {
        this.playerName = name;
        this.nameInputText.setText(name + '|');
        // Sync with mobile input if present
        if (this.mobileInput) {
          this.mobileInput.value = name;
        }
      });

      chipX += chipWidth + 6;
    }

    // Keyboard input
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (!this.nameEntryActive) return;

      if (event.key === 'Enter' && this.playerName.length > 0) {
        this.submitHighScore(score);
      } else if (event.key === 'Backspace') {
        this.playerName = this.playerName.slice(0, -1);
        this.nameInputText.setText(this.playerName + '|');
      } else if (event.key.length === 1 && this.playerName.length < 12) {
        this.playerName += event.key;
        this.nameInputText.setText(this.playerName + '|');
      }
    });

    // Save button - positioned inside the panel (panel is 220px tall)
    const saveBtn = this.add.container(x, y + 185);

    const saveBtnBg = this.add.graphics();
    saveBtnBg.fillStyle(0x32CD32, 1);
    saveBtnBg.fillRoundedRect(-60, -15, 120, 30, 8);
    saveBtnBg.lineStyle(2, 0x228B22);
    saveBtnBg.strokeRoundedRect(-60, -15, 120, 30, 8);

    const saveBtnText = this.add.text(0, 0, 'SAVE SCORE', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    saveBtnText.setOrigin(0.5, 0.5);

    saveBtn.add([saveBtnBg, saveBtnText]);
    saveBtn.setInteractive(new Phaser.Geom.Rectangle(-60, -15, 120, 30), Phaser.Geom.Rectangle.Contains);

    saveBtn.on('pointerover', () => {
      saveBtnBg.clear();
      saveBtnBg.fillStyle(0x28a428, 1);
      saveBtnBg.fillRoundedRect(-60, -15, 120, 30, 8);
      saveBtnBg.lineStyle(2, 0x228B22);
      saveBtnBg.strokeRoundedRect(-60, -15, 120, 30, 8);
    });

    saveBtn.on('pointerout', () => {
      saveBtnBg.clear();
      saveBtnBg.fillStyle(0x32CD32, 1);
      saveBtnBg.fillRoundedRect(-60, -15, 120, 30, 8);
      saveBtnBg.lineStyle(2, 0x228B22);
      saveBtnBg.strokeRoundedRect(-60, -15, 120, 30, 8);
    });

    saveBtn.on('pointerdown', () => {
      if (this.playerName.length > 0) {
        this.submitHighScore(score);
      }
    });
  }

  private createMobileInput(x: number, y: number, score: number): void {
    // Create an HTML input element for mobile keyboard
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 12;
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.style.cssText = `
      position: absolute;
      opacity: 0;
      pointer-events: none;
      width: 1px;
      height: 1px;
      z-index: 9999;
    `;
    document.body.appendChild(input);
    this.mobileInput = input;

    // Sync input value to playerName
    input.addEventListener('input', () => {
      this.playerName = input.value.substring(0, 12);
      this.nameInputText.setText(this.playerName + '|');
    });

    // Handle Enter key from mobile keyboard
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.playerName.length > 0) {
        e.preventDefault();
        input.blur();
        this.submitHighScore(score);
      }
    });

    // Focus the input immediately to show keyboard
    setTimeout(() => {
      input.focus();
    }, 100);
  }

  private removeMobileInput(): void {
    if (this.mobileInput) {
      this.mobileInput.remove();
      this.mobileInput = null;
    }
  }

  private async submitHighScore(score: number): Promise<void> {
    if (!this.nameEntryActive) return;
    this.nameEntryActive = false;

    if (this.cursorBlink) {
      this.cursorBlink.destroy();
    }

    // Clean up mobile input
    this.removeMobileInput();

    // Submit to server (also saves locally as fallback via ScoreService)
    await submitScore(this.playerName, score);

    // Start a new game after saving the high score
    this.scene.start('GameScene', this.getRestartData());
  }

  private createLeaderboard(x: number, y: number, currentScore: number): void {
    const highScores = this.loadHighScores();

    // Panel background
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.7);
    panel.fillRoundedRect(x - 120, y, 240, 200, 10);
    panel.lineStyle(2, 0xFFD700);
    panel.strokeRoundedRect(x - 120, y, 240, 200, 10);

    // Title
    this.add.text(x, y + 15, '🏆 HIGH SCORES 🏆', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Medal colors for top 3
    const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#FFFFFF', '#FFFFFF'];
    const medalEmojis = ['🥇', '🥈', '🥉', '4.', '5.'];

    let rowY = y + 45;

    if (highScores.length === 0) {
      this.add.text(x, rowY + 40, 'No scores yet!\nBe the first!', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '14px',
        color: '#AAAAAA',
        align: 'center',
      }).setOrigin(0.5, 0);
    } else {
      for (let i = 0; i < 5; i++) {
        if (i < highScores.length) {
          const entry = highScores[i];
          const isCurrentScore = entry.score === currentScore && this.highScoreRank === i;

          // Highlight if this is the player's new entry
          if (isCurrentScore) {
            const highlight = this.add.graphics();
            highlight.fillStyle(0xFFD700, 0.2);
            highlight.fillRoundedRect(x - 110, rowY - 2, 220, 26, 4);
          }

          // Rank/Medal
          this.add.text(x - 100, rowY + 10, medalEmojis[i], {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
            color: medalColors[i],
          }).setOrigin(0, 0.5);

          // Name
          this.add.text(x - 70, rowY + 10, entry.name, {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
            color: isCurrentScore ? '#FFD700' : '#FFFFFF',
            fontStyle: isCurrentScore ? 'bold' : 'normal',
          }).setOrigin(0, 0.5);

          // Score
          this.add.text(x + 100, rowY + 10, entry.score.toString(), {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
            color: isCurrentScore ? '#FFD700' : '#90EE90',
            fontStyle: 'bold',
          }).setOrigin(1, 0.5);

          rowY += 28;
        } else {
          // Empty slot
          this.add.text(x - 100, rowY + 10, medalEmojis[i], {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
            color: '#666666',
          }).setOrigin(0, 0.5);

          this.add.text(x - 70, rowY + 10, '---', {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
            color: '#666666',
          }).setOrigin(0, 0.5);

          rowY += 28;
        }
      }
    }
  }

  // ============ API-based Score Methods ============

  /**
   * Load all scores once and cache them
   */
  private async loadAllScoresOnce(): Promise<void> {
    // Check if cache is still valid (within TTL)
    const now = Date.now();
    const cacheValid = Object.keys(this.scoreCache).length > 0 &&
                       (now - this.cacheTimestamp) < GameOverScene.CACHE_TTL_MS;
    if (cacheValid) {
      return; // Cache still valid
    }
    this.isLoadingScores = true;
    try {
      const allScores = await fetchAllScores();
      this.scoreCache = allScores;
      this.cacheTimestamp = now;
    } catch (error) {
      console.error('Failed to fetch scores from API:', error);
      // Fallback to local scores
      const localScores = getLocalScores();
      this.scoreCache = {
        alltime: localScores,
        today: localScores,
        week: localScores,
        local: localScores,
      };
      this.cacheTimestamp = now;
    } finally {
      this.isLoadingScores = false;
    }
  }

  /**
   * Get scores from cache (no API request)
   */
  private getScoresFromCache(category: ScoreCategory): HighScoreEntry[] {
    return this.scoreCache[category] || getLocalScores();
  }

  private cycleCategory(direction: 'next' | 'prev'): void {
    const currentIndex = CATEGORY_ORDER.indexOf(this.currentCategory);
    let newIndex: number;

    if (direction === 'next') {
      newIndex = (currentIndex + 1) % CATEGORY_ORDER.length;
    } else {
      newIndex = (currentIndex - 1 + CATEGORY_ORDER.length) % CATEGORY_ORDER.length;
    }

    this.currentCategory = CATEGORY_ORDER[newIndex];
    this.refreshScoreDisplay();
  }

  private refreshScoreDisplay(): void {
    // Update category label
    if (this.categoryLabel) {
      this.categoryLabel.setText(CATEGORY_LABELS[this.currentCategory]);
    }

    // Get scores from cache (no API call needed - cache loaded once on scene creation)
    this.displayedScores = this.getScoresFromCache(this.currentCategory);

    // Update the score display
    this.updateScoreListDisplay();
  }

  private updateScoreListDisplay(): void {
    // Clear existing score elements
    for (const element of this.scoreDisplayElements) {
      element.destroy();
    }
    this.scoreDisplayElements = [];

    // This will be called by the actual display methods
    // The implementation depends on which panel is being updated
  }

  shutdown(): void {
    // Clean up mobile input when scene shuts down
    this.removeMobileInput();
  }
}
