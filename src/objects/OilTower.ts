import Phaser from 'phaser';

export class OilTower {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private oilSpurts: Phaser.GameObjects.Graphics[] = [];
  private spurtInterval: Phaser.Time.TimerEvent | null = null;

  public x: number;
  public y: number;
  public buildingName: string = 'Oil Derrick';
  public pointValue: number = 100;
  public isDestroyed: boolean = false;
  public country: string;
  public collisionWidth: number = 36;
  public collisionHeight: number = 55;

  constructor(scene: Phaser.Scene, x: number, y: number, country: string) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.country = country;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(4);

    this.draw();
    this.createOilSpurtAnimation();
  }

  private draw(): void {
    const towerX = this.x;
    const baseY = this.y;

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

    // Top cap
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillCircle(towerX, baseY - 50, 5);

    // Base platform
    this.graphics.fillStyle(0x666666, 1);
    this.graphics.fillRect(towerX - 18, baseY - 3, 36, 6);
  }

  private createOilSpurtAnimation(): void {
    const spurtX = this.x;
    const spurtY = this.y - 55;

    const createSpurt = () => {
      if (this.isDestroyed) return;

      const spurt = this.scene.add.graphics();
      spurt.setDepth(3);

      // Draw elongated oil droplet for more fluid look
      spurt.fillStyle(0x1a1a1a, 0.9);
      spurt.fillEllipse(0, 0, 2, 5);

      spurt.setPosition(spurtX + (Math.random() - 0.5) * 4, spurtY);
      this.oilSpurts.push(spurt);

      // Spurt upward like a geyser then fall back down
      const height = 30 + Math.random() * 25;
      const spread = (Math.random() - 0.5) * 15;
      const duration = 500 + Math.random() * 200;

      this.scene.tweens.add({
        targets: spurt,
        x: spurtX + spread,
        y: spurtY + 30,
        scaleY: 0.3,
        alpha: 0,
        duration: duration,
        ease: 'Quad.easeIn',
        onUpdate: (tween) => {
          const progress = tween.progress;
          if (progress < 0.4) {
            spurt.y = spurtY - height * (progress / 0.4);
            spurt.scaleY = 1 + progress;
          } else {
            const fallProgress = (progress - 0.4) / 0.6;
            spurt.y = spurtY - height + (height + 30) * fallProgress;
          }
        },
        onComplete: () => {
          spurt.destroy();
          const idx = this.oilSpurts.indexOf(spurt);
          if (idx >= 0) this.oilSpurts.splice(idx, 1);
        },
      });
    };

    this.spurtInterval = this.scene.time.addEvent({
      delay: 150,
      callback: createSpurt,
      loop: true,
    });
  }

  getCollisionBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.collisionWidth / 2,
      y: this.y - this.collisionHeight,
      width: this.collisionWidth,
      height: this.collisionHeight,
    };
  }

  explode(): { name: string; points: number; textureKey: string; country: string } {
    if (this.isDestroyed) return { name: this.buildingName, points: 0, textureKey: '', country: this.country };

    this.isDestroyed = true;

    // Stop oil spurts
    if (this.spurtInterval) {
      this.spurtInterval.destroy();
      this.spurtInterval = null;
    }

    // Clean up existing spurts
    for (const spurt of this.oilSpurts) {
      spurt.destroy();
    }
    this.oilSpurts = [];

    // Create explosion effect
    const x = this.x;
    const y = this.y - 25;

    // Explosion flash
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xFF6600, 1);
    flash.fillCircle(x, y, 30);
    flash.fillStyle(0xFFFF00, 1);
    flash.fillCircle(x, y, 18);
    flash.fillStyle(0xFFFFFF, 1);
    flash.fillCircle(x, y, 8);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 400,
      onComplete: () => flash.destroy(),
    });

    // Flying debris
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const debris = this.scene.add.graphics();
      debris.fillStyle(0x444444, 1);
      debris.fillRect(-2, -2, 4, 4);
      debris.setPosition(x, y);

      this.scene.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * 40,
        y: y + Math.sin(angle) * 40 + 20,
        angle: Math.random() * 360,
        alpha: 0,
        duration: 400,
        onComplete: () => debris.destroy(),
      });
    }

    // Create violent oil explosion splatter - chaotic, messy, realistic
    const spillX = this.x;
    const spillY = this.y;

    // Main pooling oil that spreads from the base
    const mainPool = this.scene.add.graphics();
    mainPool.setDepth(1);
    mainPool.fillStyle(0x111111, 0.95);
    // Irregular blob shape
    mainPool.fillEllipse(spillX, spillY + 3, 40, 15);
    mainPool.fillEllipse(spillX - 15, spillY + 5, 25, 12);
    mainPool.fillEllipse(spillX + 20, spillY + 2, 30, 10);
    // Glossy highlight
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

      // Vary the splat shapes - some round, some elongated drips
      const isDroplet = Math.random() > 0.5;
      splat.fillStyle(0x0a0a0a, 0.85 + Math.random() * 0.15);

      if (isDroplet) {
        // Teardrop/drip shape
        splat.fillCircle(0, 0, 3 + Math.random() * 4);
        splat.fillEllipse(0, -4, 2, 5);
      } else {
        // Irregular splat blob
        const size = 4 + Math.random() * 6;
        splat.fillCircle(0, 0, size);
        splat.fillCircle(size * 0.5, size * 0.3, size * 0.6);
        splat.fillCircle(-size * 0.4, size * 0.2, size * 0.5);
      }

      splat.setPosition(spillX, spillY - 30);

      // Random chaotic directions - all land at ground level (spillY)
      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 100;
      const finalX = spillX + Math.cos(angle) * distance;
      const finalY = spillY + Math.random() * 8; // Land on or just below ground

      // Splatter flies out in arc then lands on ground
      this.scene.tweens.add({
        targets: splat,
        x: finalX,
        y: finalY,
        scaleX: 0.8 + Math.random() * 0.6,
        scaleY: 0.4 + Math.random() * 0.3, // Flatten when landing
        duration: 300 + Math.random() * 400,
        ease: 'Quad.easeIn',
      });
    }

    // Large splat stains on the ground
    for (let i = 0; i < 12; i++) {
      const stain = this.scene.add.graphics();
      stain.setDepth(1);
      stain.fillStyle(0x080808, 0.8);

      // Messy irregular stain shape
      const baseSize = 8 + Math.random() * 12;
      stain.fillCircle(0, 0, baseSize);
      // Add random blobs around the edge for splatter effect
      for (let j = 0; j < 4; j++) {
        const blobAngle = Math.random() * Math.PI * 2;
        const blobDist = baseSize * 0.7;
        stain.fillCircle(
          Math.cos(blobAngle) * blobDist,
          Math.sin(blobAngle) * blobDist * 0.5,
          baseSize * 0.4
        );
      }

      // Position randomly around explosion - all at ground level
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 80;
      stain.setPosition(
        spillX + Math.cos(angle) * distance,
        spillY + Math.random() * 10 // On ground
      );
      stain.setAlpha(0);
      stain.setScale(0.3);

      // Stains appear with slight delay as splatter lands
      this.scene.tweens.add({
        targets: stain,
        alpha: 0.85,
        scaleX: 1 + Math.random() * 0.5,
        scaleY: 0.5 + Math.random() * 0.3, // Flattened on ground
        delay: 200 + Math.random() * 400,
        duration: 200,
        ease: 'Quad.easeOut',
      });
    }

    // Small spray dots on the ground (fine mist of oil)
    for (let i = 0; i < 30; i++) {
      const dot = this.scene.add.graphics();
      dot.setDepth(1);
      dot.fillStyle(0x0a0a0a, 0.7);
      dot.fillCircle(0, 0, 1 + Math.random() * 2);

      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 120;
      dot.setPosition(
        spillX + Math.cos(angle) * distance,
        spillY + Math.random() * 5 // On ground
      );
      dot.setAlpha(0);

      this.scene.tweens.add({
        targets: dot,
        alpha: 0.6 + Math.random() * 0.3,
        delay: 100 + Math.random() * 300,
        duration: 150,
      });
    }

    // Hide the tower
    this.graphics.setVisible(false);

    return { name: this.buildingName, points: this.pointValue, textureKey: '', country: this.country };
  }

  destroy(): void {
    if (this.spurtInterval) {
      this.spurtInterval.destroy();
    }
    for (const spurt of this.oilSpurts) {
      spurt.destroy();
    }
    this.graphics.destroy();
  }
}
