import Phaser from 'phaser';
import { COLORS } from '../constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '20px',
      color: '#00ffff',
    });
    loadingText.setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(COLORS.SHUTTLE_GLOW, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load title art image
    this.load.image('title-art', 'assets/images/title-art.png');

    // Generate graphics programmatically instead of loading external assets
    this.createGameGraphics();
  }

  create(): void {
    this.scene.start('MenuScene');
  }

  private createGameGraphics(): void {
    // Create shuttle graphic - "Peace One" space shuttle style
    const shuttleGraphics = this.make.graphics({ x: 0, y: 0 });

    // Main body (white fuselage)
    shuttleGraphics.fillStyle(0xE8E8E8);
    shuttleGraphics.fillRect(8, 8, 16, 28); // Main fuselage

    // Nose cone
    shuttleGraphics.fillStyle(0x333333); // Dark nose
    shuttleGraphics.fillTriangle(16, 0, 8, 10, 24, 10);

    // Cockpit windows
    shuttleGraphics.fillStyle(0x4488FF);
    shuttleGraphics.fillRect(12, 10, 8, 6);
    shuttleGraphics.fillStyle(0x66AAFF);
    shuttleGraphics.fillRect(13, 11, 6, 4);

    // Wings (delta shape)
    shuttleGraphics.fillStyle(0xCCCCCC);
    shuttleGraphics.fillTriangle(8, 20, 0, 34, 8, 34); // Left wing
    shuttleGraphics.fillTriangle(24, 20, 32, 34, 24, 34); // Right wing

    // "PEACE ONE" text area (red stripe)
    shuttleGraphics.fillStyle(0xCC0000);
    shuttleGraphics.fillRect(9, 16, 14, 3);

    // Engine section (back)
    shuttleGraphics.fillStyle(0x666666);
    shuttleGraphics.fillRect(10, 32, 12, 6);

    // Engine nozzles
    shuttleGraphics.fillStyle(0x444444);
    shuttleGraphics.fillCircle(13, 36, 3);
    shuttleGraphics.fillCircle(19, 36, 3);

    // Wing stripes (USA-ish)
    shuttleGraphics.lineStyle(1, 0x0000AA);
    shuttleGraphics.lineBetween(2, 32, 8, 24);
    shuttleGraphics.lineBetween(30, 32, 24, 24);

    shuttleGraphics.generateTexture('shuttle', 32, 40);
    shuttleGraphics.destroy();

    // Create shuttle with landing legs extended
    const shuttleLegsGraphics = this.make.graphics({ x: 0, y: 0 });

    // Same body as above
    shuttleLegsGraphics.fillStyle(0xE8E8E8);
    shuttleLegsGraphics.fillRect(8, 8, 16, 28);

    shuttleLegsGraphics.fillStyle(0x333333);
    shuttleLegsGraphics.fillTriangle(16, 0, 8, 10, 24, 10);

    shuttleLegsGraphics.fillStyle(0x4488FF);
    shuttleLegsGraphics.fillRect(12, 10, 8, 6);
    shuttleLegsGraphics.fillStyle(0x66AAFF);
    shuttleLegsGraphics.fillRect(13, 11, 6, 4);

    shuttleLegsGraphics.fillStyle(0xCCCCCC);
    shuttleLegsGraphics.fillTriangle(8, 20, 0, 34, 8, 34);
    shuttleLegsGraphics.fillTriangle(24, 20, 32, 34, 24, 34);

    shuttleLegsGraphics.fillStyle(0xCC0000);
    shuttleLegsGraphics.fillRect(9, 16, 14, 3);

    shuttleLegsGraphics.fillStyle(0x666666);
    shuttleLegsGraphics.fillRect(10, 32, 12, 6);

    shuttleLegsGraphics.fillStyle(0x444444);
    shuttleLegsGraphics.fillCircle(13, 36, 3);
    shuttleLegsGraphics.fillCircle(19, 36, 3);

    shuttleLegsGraphics.lineStyle(1, 0x0000AA);
    shuttleLegsGraphics.lineBetween(2, 32, 8, 24);
    shuttleLegsGraphics.lineBetween(30, 32, 24, 24);

    // Landing legs extended
    shuttleLegsGraphics.lineStyle(3, 0x888888);
    shuttleLegsGraphics.lineBetween(10, 34, 4, 46); // Left leg
    shuttleLegsGraphics.lineBetween(22, 34, 28, 46); // Right leg

    // Leg feet/pads
    shuttleLegsGraphics.fillStyle(0x666666);
    shuttleLegsGraphics.fillRect(2, 44, 6, 4); // Left foot
    shuttleLegsGraphics.fillRect(26, 44, 6, 4); // Right foot

    shuttleLegsGraphics.generateTexture('shuttle-legs', 32, 48);
    shuttleLegsGraphics.destroy();

    // Create particle texture
    const particleGraphics = this.make.graphics({ x: 0, y: 0 });
    particleGraphics.fillStyle(0xffffff);
    particleGraphics.fillCircle(8, 8, 8);
    particleGraphics.generateTexture('particle', 16, 16);
    particleGraphics.destroy();

    // Create cannon texture
    const cannonGraphics = this.make.graphics({ x: 0, y: 0 });
    cannonGraphics.fillStyle(0xff0000);
    cannonGraphics.fillRect(0, 8, 24, 16);
    cannonGraphics.fillCircle(12, 16, 12);
    cannonGraphics.generateTexture('cannon', 32, 32);
    cannonGraphics.destroy();

    // Create projectile texture
    const projectileGraphics = this.make.graphics({ x: 0, y: 0 });
    projectileGraphics.fillStyle(0xff0000);
    projectileGraphics.fillCircle(6, 6, 6);
    projectileGraphics.generateTexture('projectile', 12, 12);
    projectileGraphics.destroy();

    // Create collectible textures
    this.createCollectibleTexture('burger', 0xffaa00);
    this.createCollectibleTexture('dollar', 0x00ff00);
    this.createCollectibleTexture('twitter', 0x00aaff);
    this.createCollectibleTexture('magahat', 0xff0000);
  }

  private createCollectibleTexture(key: string, color: number): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(color);
    graphics.fillCircle(12, 12, 10);
    graphics.lineStyle(2, 0xffffff);
    graphics.strokeCircle(12, 12, 10);
    graphics.generateTexture(key, 24, 24);
    graphics.destroy();
  }
}
