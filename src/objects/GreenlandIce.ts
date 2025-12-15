import Phaser from 'phaser';
import { GAME_HEIGHT } from '../constants';
import { BobbingObject } from '../core/base';

export class GreenlandIce extends BobbingObject {
  public isAttached: boolean = false;

  private graphics: Phaser.GameObjects.Graphics;
  private signText: Phaser.GameObjects.Text;
  private waterSurface: number;

  constructor(scene: Phaser.Scene, x: number) {
    // Position at ocean surface level
    const oceanHeight = GAME_HEIGHT * 0.75;

    super(scene, x, oceanHeight, {
      collisionWidth: 90,
      collisionHeight: 60,
      boundsAlignment: 'top',
      extraHeight: 20, // Extend down into water
      pointValue: 0, // No points for destroying ice
      name: 'Greenland Ice',
      bobbing: {
        bobAmplitude: 6,
        bobFrequency: 1.2,
        rotationAmplitude: 0.04,
        rotationFrequency: 0.7,
        rotationPhaseOffset: 0.3,
      },
    });

    this.waterSurface = oceanHeight;

    // Create graphics
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(15);

    // Create sign text
    this.signText = scene.add.text(x, oceanHeight - 69, 'GREENLAND', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '8px',
      color: '#2F4F4F',
      fontStyle: 'bold',
    });
    this.signText.setOrigin(0.5, 0.5);
    this.signText.setDepth(16);

    this.drawIce();

    // Set initial graphics position
    this.graphics.setPosition(x, oceanHeight);
  }

  private drawIce(): void {
    this.graphics.clear();

    // Scale factor for 50% larger iceberg
    const s = 1.5;

    // Ice colors
    const iceLight = 0xE0FFFF;
    const iceMid = 0xAFEEEE;
    const iceDark = 0x87CEEB;
    const iceHighlight = 0xFFFFFF;
    const signWood = 0x8B4513;
    const signBoard = 0xDEB887;

    // Underwater portion
    this.graphics.fillStyle(iceDark, 0.7);
    this.graphics.beginPath();
    this.graphics.moveTo(-25 * s, 5);
    this.graphics.lineTo(-20 * s, 25 * s);
    this.graphics.lineTo(-5 * s, 30 * s);
    this.graphics.lineTo(10 * s, 28 * s);
    this.graphics.lineTo(22 * s, 20 * s);
    this.graphics.lineTo(25 * s, 5);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Main ice block
    this.graphics.fillStyle(iceMid, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(-30 * s, 0);
    this.graphics.lineTo(-28 * s, -15 * s);
    this.graphics.lineTo(-20 * s, -25 * s);
    this.graphics.lineTo(-5 * s, -20 * s);
    this.graphics.lineTo(5 * s, -28 * s);
    this.graphics.lineTo(15 * s, -18 * s);
    this.graphics.lineTo(25 * s, -12 * s);
    this.graphics.lineTo(28 * s, 0);
    this.graphics.lineTo(-30 * s, 0);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Ice highlights
    this.graphics.fillStyle(iceLight, 0.9);
    this.graphics.beginPath();
    this.graphics.moveTo(-28 * s, -15 * s);
    this.graphics.lineTo(-20 * s, -25 * s);
    this.graphics.lineTo(-10 * s, -22 * s);
    this.graphics.lineTo(-15 * s, -12 * s);
    this.graphics.closePath();
    this.graphics.fillPath();

    this.graphics.fillStyle(iceLight, 0.9);
    this.graphics.beginPath();
    this.graphics.moveTo(0, -22 * s);
    this.graphics.lineTo(5 * s, -28 * s);
    this.graphics.lineTo(12 * s, -20 * s);
    this.graphics.lineTo(5 * s, -18 * s);
    this.graphics.closePath();
    this.graphics.fillPath();

    // White shine spots
    this.graphics.fillStyle(iceHighlight, 0.8);
    this.graphics.fillCircle(-15 * s, -18 * s, 4);
    this.graphics.fillCircle(8 * s, -22 * s, 3);

    // Waterline edge
    this.graphics.lineStyle(1, 0x4A90A4, 0.5);
    this.graphics.beginPath();
    this.graphics.moveTo(-30 * s, 0);
    this.graphics.lineTo(28 * s, 0);
    this.graphics.strokePath();

    // Sign post
    this.graphics.fillStyle(signWood, 1);
    this.graphics.fillRect(-2, -28 * s - 25, 4, 35);

    // Sign board
    this.graphics.fillStyle(signBoard, 1);
    this.graphics.fillRect(-32, -28 * s - 35, 64, 16);

    // Sign border
    this.graphics.lineStyle(2, signWood, 1);
    this.graphics.strokeRect(-32, -28 * s - 35, 64, 16);
  }

  update(waveOffset: number): void {
    if (this.isDestroyed || this.isAttached) return;

    // Use base class bobbing
    this.updateBobbing(waveOffset);

    // Update graphics position to follow the container
    this.graphics.setPosition(this.x, this.y);
    this.graphics.setRotation(this.rotation);

    // Update text position
    this.signText.setPosition(this.x, this.y - 69);
    this.signText.setRotation(this.rotation);
  }

  attach(): void {
    this.isAttached = true;
    this.graphics.setVisible(false);
    this.signText.setVisible(false);
  }

  explode(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    this.onExplode();
    this.graphics.setVisible(false);
    this.signText.setVisible(false);
  }

  protected onExplode(): void {
    const scene = this.scene;
    const x = this.x;
    const y = this.y - 10;

    // Ice chunk colors
    const chunkColors = [0xE0FFFF, 0xAFEEEE, 0x87CEEB, 0xFFFFFF];

    // Flying ice chunks
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const chunk = scene.add.graphics();
      chunk.fillStyle(chunkColors[i % chunkColors.length], 0.9);

      if (i % 3 === 0) {
        chunk.beginPath();
        chunk.moveTo(-5, -3);
        chunk.lineTo(5, -3);
        chunk.lineTo(0, 6);
        chunk.closePath();
        chunk.fillPath();
      } else if (i % 3 === 1) {
        chunk.fillRect(-4, -3, 8, 6);
      } else {
        chunk.beginPath();
        chunk.moveTo(-4, 0);
        chunk.lineTo(-2, -5);
        chunk.lineTo(3, -3);
        chunk.lineTo(5, 2);
        chunk.lineTo(0, 4);
        chunk.closePath();
        chunk.fillPath();
      }

      chunk.setPosition(x, y);
      chunk.setDepth(101);

      const distance = 40 + Math.random() * 50;
      const upwardBias = -30 - Math.random() * 40;

      scene.tweens.add({
        targets: chunk,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + upwardBias + 80,
        angle: Math.random() * 720 - 360,
        alpha: 0,
        duration: 700 + Math.random() * 300,
        ease: 'Quad.easeOut',
        onComplete: () => chunk.destroy(),
      });
    }

    // Water splash effect
    for (let i = 0; i < 8; i++) {
      const splashAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      const splashSpeed = 2 + Math.random() * 4;
      const droplet = scene.add.graphics();
      droplet.fillStyle(0x4169E1, 0.8);
      droplet.fillCircle(0, 0, 2 + Math.random() * 3);
      droplet.setPosition(x + (Math.random() - 0.5) * 40, this.waterSurface);
      droplet.setDepth(99);

      scene.tweens.add({
        targets: droplet,
        x: droplet.x + Math.cos(splashAngle) * splashSpeed * 12,
        y: droplet.y + Math.sin(splashAngle) * splashSpeed * 15 + 40,
        alpha: 0,
        duration: 400 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => droplet.destroy(),
      });
    }

    // Sign debris
    for (let i = 0; i < 4; i++) {
      const signDebris = scene.add.graphics();
      signDebris.fillStyle(0x8B4513, 1);
      signDebris.fillRect(-3, -6, 6, 12);
      signDebris.setPosition(x + (Math.random() - 0.5) * 20, y - 30);
      signDebris.setDepth(100);

      scene.tweens.add({
        targets: signDebris,
        x: signDebris.x + (Math.random() - 0.5) * 60,
        y: signDebris.y + 80 + Math.random() * 40,
        angle: Math.random() * 360,
        alpha: 0,
        duration: 800,
        ease: 'Quad.easeOut',
        onComplete: () => signDebris.destroy(),
      });
    }
  }

  destroy(fromScene?: boolean): void {
    this.graphics.destroy();
    this.signText.destroy();
    super.destroy(fromScene);
  }
}
