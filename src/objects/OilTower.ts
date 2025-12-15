import Phaser from 'phaser';
import { createExplosion } from '../utils/ExplosionUtils';
import { DestructibleObject } from '../core/base';

interface OilTowerExplosionResult {
  name: string;
  points: number;
  textureKey: string;
  country: string;
}

export class OilTower extends DestructibleObject {
  private graphics: Phaser.GameObjects.Graphics;
  private oilSpurtEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  public readonly country: string;

  constructor(scene: Phaser.Scene, x: number, y: number, country: string) {
    super(scene, x, y, {
      collisionWidth: 36,
      collisionHeight: 55,
      boundsAlignment: 'top',
      pointValue: 100,
      name: 'Oil Derrick',
    });

    this.country = country;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(4);
    this.add(this.graphics);

    this.draw();
    this.createOilSpurtAnimation();
  }

  private draw(): void {
    // Draw relative to container origin (0, 0)
    const towerX = 0;
    const baseY = 0;

    // Draw small triangular oil derrick
    // Main tower frame - smaller and more triangular
    this.graphics.lineStyle(3, 0x444444, 1);
    // Left leg
    this.graphics.lineBetween(towerX - 15, baseY, towerX, baseY - 50);
    // Right leg
    this.graphics.lineBetween(towerX + 15, baseY, towerX, baseY - 50);
    // Cross braces
    this.graphics.lineStyle(2, 0x555555, 1);
    this.graphics.lineBetween(towerX - 10, baseY - 15, towerX + 10, baseY - 15);
    this.graphics.lineBetween(towerX - 6, baseY - 30, towerX + 6, baseY - 30);

    // Base platform
    this.graphics.fillStyle(0x666666, 1);
    this.graphics.fillRect(towerX - 18, baseY - 3, 36, 6);
  }

  private createOilSpurtAnimation(): void {
    const spurtX = this.x;
    const spurtY = this.y - 55;

    // Use particle emitter instead of individual graphics for better performance
    this.oilSpurtEmitter = this.scene.add.particles(spurtX, spurtY, 'particle', {
      speed: { min: 80, max: 120 },
      angle: { min: 250, max: 290 },
      gravityY: 300,
      scale: { start: 0.4, end: 0.2 },
      alpha: { start: 0.9, end: 0.3 },
      lifespan: { min: 500, max: 700 },
      frequency: 150,
      quantity: 1,
      tint: [0x1a1a1a, 0x111111, 0x222222],
      emitting: true,
    });
    this.oilSpurtEmitter.setDepth(3);
  }

  explode(): OilTowerExplosionResult {
    if (this.isDestroyed) {
      return { name: this.objectName, points: 0, textureKey: '', country: this.country };
    }

    this.isDestroyed = true;

    // Stop oil spurt emitter
    if (this.oilSpurtEmitter) {
      this.oilSpurtEmitter.stop();
      this.oilSpurtEmitter.destroy();
      this.oilSpurtEmitter = null;
    }

    // Create explosion effect
    this.onExplode();

    // Hide the tower
    this.setVisible(false);

    return { name: this.objectName, points: this.pointValue, textureKey: '', country: this.country };
  }

  protected onExplode(): void {
    const x = this.x;
    const y = this.y - 25;

    // Standard explosion flash and debris
    createExplosion(this.scene, x, y, {
      flashColors: [0xFF6600, 0xFFFF00, 0xFFFFFF],
      flashSizes: [30, 18, 8],
      duration: 400,
      debrisColors: [0x444444],
      debrisCount: 6,
      debrisWidth: 4,
      debrisHeight: 4,
      minDistance: 40,
      maxDistance: 40,
      gravity: 20,
      includeSmoke: false,
      shakeCamera: false,
    });

    // Create violent oil explosion splatter
    const spillX = this.x;
    const spillY = this.y;

    // Main pooling oil that spreads from the base
    const mainPool = this.scene.add.graphics();
    mainPool.setDepth(1);
    mainPool.fillStyle(0x111111, 0.95);
    mainPool.fillEllipse(spillX, spillY + 3, 40, 15);
    mainPool.fillEllipse(spillX - 15, spillY + 5, 25, 12);
    mainPool.fillEllipse(spillX + 20, spillY + 2, 30, 10);
    mainPool.fillStyle(0x333333, 0.4);
    mainPool.fillEllipse(spillX - 5, spillY, 15, 6);

    this.scene.tweens.add({
      targets: mainPool,
      scaleX: 3.5,
      scaleY: 2,
      duration: 2000,
      ease: 'Quad.easeOut',
    });

    // Splatter droplets flying outward and landing on ground
    for (let i = 0; i < 25; i++) {
      const splat = this.scene.add.graphics();
      splat.setDepth(1);

      const isDroplet = Math.random() > 0.5;
      splat.fillStyle(0x0a0a0a, 0.85 + Math.random() * 0.15);

      if (isDroplet) {
        splat.fillCircle(0, 0, 3 + Math.random() * 4);
        splat.fillEllipse(0, -4, 2, 5);
      } else {
        const size = 4 + Math.random() * 6;
        splat.fillCircle(0, 0, size);
        splat.fillCircle(size * 0.5, size * 0.3, size * 0.6);
        splat.fillCircle(-size * 0.4, size * 0.2, size * 0.5);
      }

      splat.setPosition(spillX, spillY - 30);

      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 100;
      const finalX = spillX + Math.cos(angle) * distance;
      const finalY = spillY + Math.random() * 8;

      this.scene.tweens.add({
        targets: splat,
        x: finalX,
        y: finalY,
        scaleX: 0.8 + Math.random() * 0.6,
        scaleY: 0.4 + Math.random() * 0.3,
        duration: 300 + Math.random() * 400,
        ease: 'Quad.easeIn',
      });
    }

    // Large splat stains on the ground
    for (let i = 0; i < 12; i++) {
      const stain = this.scene.add.graphics();
      stain.setDepth(1);
      stain.fillStyle(0x080808, 0.8);

      const baseSize = 8 + Math.random() * 12;
      stain.fillCircle(0, 0, baseSize);
      for (let j = 0; j < 4; j++) {
        const blobAngle = Math.random() * Math.PI * 2;
        const blobDist = baseSize * 0.7;
        stain.fillCircle(
          Math.cos(blobAngle) * blobDist,
          Math.sin(blobAngle) * blobDist * 0.5,
          baseSize * 0.4
        );
      }

      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 80;
      stain.setPosition(
        spillX + Math.cos(angle) * distance,
        spillY + Math.random() * 10
      );
      stain.setAlpha(0);
      stain.setScale(0.3);

      this.scene.tweens.add({
        targets: stain,
        alpha: 0.85,
        scaleX: 1 + Math.random() * 0.5,
        scaleY: 0.5 + Math.random() * 0.3,
        delay: 200 + Math.random() * 400,
        duration: 200,
        ease: 'Quad.easeOut',
      });
    }

    // Small spray dots on the ground
    for (let i = 0; i < 30; i++) {
      const dot = this.scene.add.graphics();
      dot.setDepth(1);
      dot.fillStyle(0x0a0a0a, 0.7);
      dot.fillCircle(0, 0, 1 + Math.random() * 2);

      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 120;
      dot.setPosition(
        spillX + Math.cos(angle) * distance,
        spillY + Math.random() * 5
      );
      dot.setAlpha(0);

      this.scene.tweens.add({
        targets: dot,
        alpha: 0.6 + Math.random() * 0.3,
        delay: 100 + Math.random() * 300,
        duration: 150,
      });
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.oilSpurtEmitter) {
      this.oilSpurtEmitter.stop();
      this.oilSpurtEmitter.destroy();
    }
    this.graphics.destroy();
    super.destroy(fromScene);
  }
}
