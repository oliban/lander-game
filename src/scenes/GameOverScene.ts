import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../constants';

interface GameOverData {
  victory: boolean;
  message: string;
  score: number;
}

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
  constructor() {
    super({ key: 'GameOverScene' });
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

    if (data.victory) {
      this.createVictoryScreen(data);
    } else {
      this.createCrashScreen(data);
    }
  }

  private drawCloud(x: number, y: number, scale: number): void {
    const cloud = this.add.graphics();
    cloud.fillStyle(0xFFFFFF, 0.9);
    cloud.fillCircle(x, y, 25 * scale);
    cloud.fillCircle(x + 20 * scale, y - 8 * scale, 20 * scale);
    cloud.fillCircle(x + 40 * scale, y, 28 * scale);
    cloud.fillCircle(x + 20 * scale, y + 8 * scale, 18 * scale);
  }

  private createVictoryScreen(data: GameOverData): void {
    // Title with shadow (cartoon style)
    const titleShadow = this.add.text(GAME_WIDTH / 2 + 3, 123, 'MISSION COMPLETE!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '56px',
      color: '#2E7D32',
      fontStyle: 'bold',
    });
    titleShadow.setOrigin(0.5, 0.5);

    const title = this.add.text(GAME_WIDTH / 2, 120, 'MISSION COMPLETE!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '56px',
      color: '#4CAF50',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);

    // Message
    const message = this.add.text(GAME_WIDTH / 2, 200, data.message, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '24px',
      color: '#333333',
    });
    message.setOrigin(0.5, 0.5);

    // Score with shadow
    const scoreShadow = this.add.text(GAME_WIDTH / 2 + 2, 282, `Final Score: ${data.score}`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '32px',
      color: '#B8860B',
      fontStyle: 'bold',
    });
    scoreShadow.setOrigin(0.5, 0.5);

    const scoreText = this.add.text(GAME_WIDTH / 2, 280, `Final Score: ${data.score}`, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '32px',
      color: '#FFD700',
      fontStyle: 'bold',
    });
    scoreText.setOrigin(0.5, 0.5);

    // Random quote
    const quote = VICTORY_QUOTES[Math.floor(Math.random() * VICTORY_QUOTES.length)];
    const quoteText = this.add.text(GAME_WIDTH / 2, 360, quote, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '18px',
      color: '#666666',
      fontStyle: 'italic',
      wordWrap: { width: 600 },
      align: 'center',
    });
    quoteText.setOrigin(0.5, 0.5);

    // Celebration confetti
    this.createCelebrationParticles();

    // Buttons
    this.createButton(GAME_WIDTH / 2, 480, 'PLAY AGAIN', 0x4CAF50, () => {
      this.scene.start('GameScene');
    });

    this.createButton(GAME_WIDTH / 2, 550, 'MAIN MENU', 0x607D8B, () => {
      this.scene.start('MenuScene');
    });

    // Enter key hint
    const enterHint = this.add.text(GAME_WIDTH / 2, 610, 'Press ENTER to play again', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#888888',
    });
    enterHint.setOrigin(0.5, 0.5);

    // Enter key to play again
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.scene.start('GameScene');
    });
  }

  private createCrashScreen(data: GameOverData): void {
    // Title with shadow (cartoon style)
    const titleShadow = this.add.text(GAME_WIDTH / 2 + 3, 123, 'MISSION FAILED', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '56px',
      color: '#8B0000',
      fontStyle: 'bold',
    });
    titleShadow.setOrigin(0.5, 0.5);

    const title = this.add.text(GAME_WIDTH / 2, 120, 'MISSION FAILED', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '56px',
      color: '#F44336',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);

    // Shake effect
    this.cameras.main.shake(500, 0.01);

    // Message
    const message = this.add.text(GAME_WIDTH / 2, 200, data.message, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '24px',
      color: '#333333',
    });
    message.setOrigin(0.5, 0.5);

    // Random quote
    const quote = CRASH_QUOTES[Math.floor(Math.random() * CRASH_QUOTES.length)];
    const quoteText = this.add.text(GAME_WIDTH / 2, 300, quote, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '18px',
      color: '#666666',
      fontStyle: 'italic',
      wordWrap: { width: 600 },
      align: 'center',
    });
    quoteText.setOrigin(0.5, 0.5);

    // Buttons
    this.createButton(GAME_WIDTH / 2, 420, 'TRY AGAIN', 0xFF9800, () => {
      this.scene.start('GameScene');
    });

    this.createButton(GAME_WIDTH / 2, 490, 'MAIN MENU', 0x607D8B, () => {
      this.scene.start('MenuScene');
    });

    // Enter key hint
    const enterHint = this.add.text(GAME_WIDTH / 2, 550, 'Press ENTER to try again', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#888888',
    });
    enterHint.setOrigin(0.5, 0.5);

    // Enter key to try again
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.scene.start('GameScene');
    });
  }

  private createCelebrationParticles(): void {
    // Cartoon confetti - colorful shapes floating down
    const colors = [0xFF5722, 0x4CAF50, 0x2196F3, 0xFFEB3B, 0x9C27B0, 0xE91E63];

    for (let i = 0; i < 30; i++) {
      this.time.delayedCall(i * 100, () => {
        const x = Math.random() * GAME_WIDTH;
        const confetti = this.add.graphics();
        const color = colors[Math.floor(Math.random() * colors.length)];
        confetti.fillStyle(color, 1);

        // Random shape - rectangle or circle
        if (Math.random() > 0.5) {
          confetti.fillRect(x, -20, 10, 15);
        } else {
          confetti.fillCircle(x, -10, 6);
        }

        this.tweens.add({
          targets: confetti,
          y: GAME_HEIGHT + 50,
          x: x + (Math.random() - 0.5) * 200,
          angle: Math.random() * 720,
          duration: 2000 + Math.random() * 1000,
          ease: 'Sine.easeIn',
          onComplete: () => confetti.destroy(),
        });
      });
    }
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    color: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Cartoon style button with solid fill
    const darkerColor = this.darkenColor(color, 0.7);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-100, -22, 200, 44, 12);
    bg.lineStyle(3, darkerColor);
    bg.strokeRoundedRect(-100, -22, 200, 44, 12);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);

    container.add([bg, text]);

    container.setInteractive(new Phaser.Geom.Rectangle(-100, -22, 200, 44), Phaser.Geom.Rectangle.Contains);

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(this.lightenColor(color, 1.2), 1);
      bg.fillRoundedRect(-100, -22, 200, 44, 12);
      bg.lineStyle(3, darkerColor);
      bg.strokeRoundedRect(-100, -22, 200, 44, 12);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-100, -22, 200, 44, 12);
      bg.lineStyle(3, darkerColor);
      bg.strokeRoundedRect(-100, -22, 200, 44, 12);
    });

    container.on('pointerdown', callback);

    return container;
  }

  private darkenColor(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xFF) * factor);
    const g = Math.floor(((color >> 8) & 0xFF) * factor);
    const b = Math.floor((color & 0xFF) * factor);
    return (r << 16) | (g << 8) | b;
  }

  private lightenColor(color: number, factor: number): number {
    const r = Math.min(255, Math.floor(((color >> 16) & 0xFF) * factor));
    const g = Math.min(255, Math.floor(((color >> 8) & 0xFF) * factor));
    const b = Math.min(255, Math.floor((color & 0xFF) * factor));
    return (r << 16) | (g << 8) | b;
  }
}
