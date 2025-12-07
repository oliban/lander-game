import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../constants';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // Solid sky background (failsafe)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x87CEEB);

    // Sky gradient background
    const graphics = this.add.graphics();

    // Draw gradient from light blue to darker blue
    for (let y = 0; y < GAME_HEIGHT; y++) {
      const ratio = y / GAME_HEIGHT;
      const r = Math.floor(135 - ratio * 50);
      const g = Math.floor(206 - ratio * 80);
      const b = Math.floor(235 - ratio * 50);
      graphics.fillStyle((r << 16) | (g << 8) | b);
      graphics.fillRect(0, y, GAME_WIDTH, 1);
    }

    // Fluffy clouds
    this.drawCloud(200, 100, 1.2);
    this.drawCloud(600, 150, 0.8);
    this.drawCloud(1000, 80, 1.0);
    this.drawCloud(400, 200, 0.6);

    // Title art image - hero element at top
    const titleArt = this.add.image(GAME_WIDTH / 2, 180, 'title-art');
    titleArt.setScale(0.55);

    // Title with shadow - below the image
    const titleShadow = this.add.text(GAME_WIDTH / 2 + 3, 363, 'PEACE SHUTTLE', {
      fontSize: '48px',
      color: '#666666',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    titleShadow.setOrigin(0.5, 0.5);

    const title = this.add.text(GAME_WIDTH / 2, 360, 'PEACE SHUTTLE', {
      fontSize: '48px',
      color: '#FF6B35',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);

    // Subtitle
    const subtitle = this.add.text(GAME_WIDTH / 2, 400, "Trumpleton's Mission to Russia", {
      fontSize: '20px',
      color: '#D4380D',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    subtitle.setOrigin(0.5, 0.5);

    // Brief story text
    const story = [
      'Deliver "peace" to Putino in Russia!',
      'Dodge cannons, collect cargo, refuel at stops.',
    ];

    const storyText = this.add.text(GAME_WIDTH / 2, 440, story.join('\n'), {
      fontSize: '16px',
      color: '#444444',
      fontFamily: 'Arial, Helvetica, sans-serif',
      align: 'center',
      lineSpacing: 6,
    });
    storyText.setOrigin(0.5, 0);

    // Controls
    const controls = this.add.text(GAME_WIDTH / 2, 500,
      'UP = Thrust    LEFT/RIGHT = Rotate    SPACE = Landing Gear', {
      fontSize: '16px',
      color: '#555555',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    controls.setOrigin(0.5, 0.5);

    // Start button
    const startButton = this.createButton(GAME_WIDTH / 2, 560, 'START MISSION', () => {
      this.startGame();
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
    const enterHint = this.add.text(GAME_WIDTH / 2, 605, 'Press ENTER to start', {
      fontSize: '14px',
      color: '#888888',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    enterHint.setOrigin(0.5, 0.5);

    // Listen for Enter key
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.startGame();
    });

    // Version/credits
    const credits = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20,
      'A satirical comedy game - All in good fun!', {
      fontSize: '12px',
      color: '#666666',
      fontFamily: 'Arial, Helvetica, sans-serif',
    });
    credits.setOrigin(0.5, 1);
  }

  private startGame(): void {
    this.scene.start('GameScene');
  }

  private drawCloud(x: number, y: number, scale: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xFFFFFF, 0.9);

    // Draw overlapping circles to make cloud shape
    graphics.fillCircle(x, y, 30 * scale);
    graphics.fillCircle(x + 25 * scale, y - 10 * scale, 25 * scale);
    graphics.fillCircle(x + 50 * scale, y, 35 * scale);
    graphics.fillCircle(x + 25 * scale, y + 10 * scale, 20 * scale);
    graphics.fillCircle(x - 20 * scale, y + 5 * scale, 22 * scale);
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
