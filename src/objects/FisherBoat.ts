import Phaser from 'phaser';
import { GAME_HEIGHT } from '../constants';
import { createExplosion } from '../utils/ExplosionUtils';
import { BobbingObject } from '../core/base';

export class FisherBoat extends BobbingObject {
  public readonly boatName: string = 'Drug Kingpin boat';
  public hasFishPackage: boolean = false;
  public fishPackageCollected: boolean = false;
  public shuttleNearby: boolean = false;

  private hullGraphics: Phaser.GameObjects.Graphics;
  private cabinGraphics: Phaser.GameObjects.Graphics;
  private deckWidth: number = 64;
  private deckY: number = -5;
  private deckBody: MatterJS.BodyType | null = null;

  constructor(scene: Phaser.Scene, x: number) {
    const oceanHeight = GAME_HEIGHT * 0.75;

    super(scene, x, oceanHeight, {
      collisionWidth: 70,
      collisionHeight: 50,
      boundsAlignment: 'top',
      extraHeight: 20,
      pointValue: 300,
      name: 'Drug Kingpin boat',
      bobbing: {
        bobAmplitude: 8,
        bobFrequency: 1.5,
        rotationAmplitude: 0.06,
        rotationFrequency: 0.8,
        rotationPhaseOffset: 0.5,
      },
    });

    // Cabin graphics (behind shuttle)
    this.cabinGraphics = scene.add.graphics();
    this.cabinGraphics.setDepth(5);

    // Hull graphics (in front of shuttle)
    this.hullGraphics = scene.add.graphics();
    this.hullGraphics.setDepth(15);

    this.drawBoat();

    // Create physics body for deck
    const Matter = (scene as any).matter;
    if (Matter) {
      this.deckBody = Matter.add.rectangle(
        x,
        oceanHeight - 15 + this.deckY + 4,
        this.deckWidth,
        8,
        {
          isStatic: true,
          label: 'boatDeck',
          collisionFilter: {
            category: 2,
            mask: 1,
          },
        }
      );
    }
  }

  private drawBoat(): void {
    this.hullGraphics.clear();
    this.cabinGraphics.clear();

    const hullColor = 0x8B4513;
    const hullHighlight = 0xA0522D;
    const cabinColor = 0xCD853F;
    const cabinRoof = 0x8B0000;
    const mastColor = 0x696969;
    const flagColor = 0xFF0000;
    const deckColor = 0xDEB887;

    // === CABIN LAYER ===
    this.cabinGraphics.fillStyle(cabinColor, 1);
    this.cabinGraphics.fillRect(-12, -25, 24, 20);

    this.cabinGraphics.fillStyle(0x87CEEB, 0.8);
    this.cabinGraphics.fillRect(-8, -22, 16, 10);

    this.cabinGraphics.lineStyle(2, hullColor, 1);
    this.cabinGraphics.strokeRect(-8, -22, 16, 10);
    this.cabinGraphics.beginPath();
    this.cabinGraphics.moveTo(0, -22);
    this.cabinGraphics.lineTo(0, -12);
    this.cabinGraphics.moveTo(-8, -17);
    this.cabinGraphics.lineTo(8, -17);
    this.cabinGraphics.strokePath();

    this.cabinGraphics.fillStyle(cabinRoof, 1);
    this.cabinGraphics.fillRect(-14, -28, 28, 4);

    this.cabinGraphics.lineStyle(2, mastColor, 1);
    this.cabinGraphics.beginPath();
    this.cabinGraphics.moveTo(0, -28);
    this.cabinGraphics.lineTo(0, -42);
    this.cabinGraphics.strokePath();

    this.cabinGraphics.fillStyle(flagColor, 1);
    this.cabinGraphics.beginPath();
    this.cabinGraphics.moveTo(0, -42);
    this.cabinGraphics.lineTo(10, -38);
    this.cabinGraphics.lineTo(0, -34);
    this.cabinGraphics.closePath();
    this.cabinGraphics.fillPath();

    // === HULL LAYER ===
    this.hullGraphics.fillStyle(hullColor, 1);
    this.hullGraphics.beginPath();
    this.hullGraphics.moveTo(-35, 0);
    this.hullGraphics.lineTo(-30, 15);
    this.hullGraphics.lineTo(-20, 22);
    this.hullGraphics.lineTo(20, 22);
    this.hullGraphics.lineTo(30, 15);
    this.hullGraphics.lineTo(35, 0);
    this.hullGraphics.closePath();
    this.hullGraphics.fillPath();

    this.hullGraphics.fillStyle(hullHighlight, 0.6);
    this.hullGraphics.beginPath();
    this.hullGraphics.moveTo(-35, 0);
    this.hullGraphics.lineTo(-30, 15);
    this.hullGraphics.lineTo(-25, 18);
    this.hullGraphics.lineTo(-25, 0);
    this.hullGraphics.closePath();
    this.hullGraphics.fillPath();

    this.hullGraphics.fillStyle(deckColor, 1);
    this.hullGraphics.fillRect(-32, -5, 64, 8);

    this.hullGraphics.lineStyle(1, hullColor, 0.5);
    for (let px = -28; px < 30; px += 8) {
      this.hullGraphics.beginPath();
      this.hullGraphics.moveTo(px, -5);
      this.hullGraphics.lineTo(px, 3);
      this.hullGraphics.strokePath();
    }

    const poleColor = 0x8B4513;
    this.hullGraphics.lineStyle(3, poleColor, 1);
    this.hullGraphics.beginPath();
    this.hullGraphics.moveTo(20, -10);
    this.hullGraphics.lineTo(50, -35);
    this.hullGraphics.strokePath();

    this.hullGraphics.lineStyle(2, poleColor, 1);
    this.hullGraphics.beginPath();
    this.hullGraphics.moveTo(50, -35);
    this.hullGraphics.lineTo(55, -40);
    this.hullGraphics.strokePath();

    this.hullGraphics.lineStyle(1, 0x000000, 0.7);
    this.hullGraphics.beginPath();
    this.hullGraphics.moveTo(55, -40);
    this.hullGraphics.lineTo(55, 35);
    this.hullGraphics.strokePath();

    this.hullGraphics.fillStyle(0xFF0000, 1);
    this.hullGraphics.fillCircle(55, 15, 4);
    this.hullGraphics.fillStyle(0xFFFFFF, 1);
    this.hullGraphics.fillCircle(55, 18, 3);

    this.hullGraphics.lineStyle(2, 0x5D3A1A, 1);
    this.hullGraphics.beginPath();
    this.hullGraphics.moveTo(-35, 0);
    this.hullGraphics.lineTo(-30, 15);
    this.hullGraphics.lineTo(-20, 22);
    this.hullGraphics.lineTo(20, 22);
    this.hullGraphics.lineTo(30, 15);
    this.hullGraphics.lineTo(35, 0);
    this.hullGraphics.strokePath();
  }

  update(waveOffset: number): void {
    if (this.isDestroyed) return;

    // Custom bobbing behavior - stop when shuttle is nearby
    if (!this.shuttleNearby) {
      this.updateBobbing(waveOffset);
      // Apply offset for water surface
      this.y = this.baseY + Math.sin(waveOffset * this.bobbingConfig.bobFrequency) * this.bobbingConfig.bobAmplitude - 15;
    } else {
      this.y = this.baseY - 15;
      this.rotation = 0;
    }

    // Update graphics positions
    this.hullGraphics.setPosition(this.x, this.y);
    this.hullGraphics.setRotation(this.rotation);
    this.cabinGraphics.setPosition(this.x, this.y);
    this.cabinGraphics.setRotation(this.rotation);

    // Keep physics deck body in sync
    if (this.deckBody) {
      const Matter = (this.scene as any).matter;
      if (Matter) {
        Matter.body.setPosition(this.deckBody, {
          x: this.x,
          y: this.y + this.deckY + 4,
        });
      }
    }
  }

  getLandingBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.deckWidth / 2,
      y: this.y + this.deckY,
      width: this.deckWidth,
      height: 8,
    };
  }

  getDeckY(): number {
    return this.y + this.deckY;
  }

  explode(): { name: string; points: number } {
    if (this.isDestroyed) return { name: this.boatName, points: 0 };

    this.isDestroyed = true;

    // Remove physics body
    if (this.deckBody) {
      const matter = (this.scene as any).matter;
      if (matter && matter.world) {
        matter.world.remove(this.deckBody);
      }
      this.deckBody = null;
    }

    this.onExplode();

    this.hullGraphics.setVisible(false);
    this.cabinGraphics.setVisible(false);

    return { name: this.boatName, points: this.pointValue };
  }

  protected onExplode(): void {
    const scene = this.scene;
    const x = this.x;
    const y = this.y - 20;

    createExplosion(scene, x, y, {
      flashColors: [0xFF6600, 0xFFFF00, 0xFFFFFF],
      flashSizes: [50, 35, 15],
      duration: 500,
      debrisColors: [0x8B4513, 0xCD853F, 0xDEB887, 0x696969],
      debrisCount: 12,
      debrisWidth: 8,
      debrisHeight: 4,
      minDistance: 50,
      maxDistance: 90,
      gravity: 40,
      shakeCamera: false,
    });

    // Water splash effect
    const waterY = this.y + 10;
    for (let i = 0; i < 15; i++) {
      const droplet = scene.add.graphics();
      droplet.fillStyle(0x4169E1, 0.9);
      droplet.fillCircle(0, 0, 4 + Math.random() * 5);
      const startX = x + (Math.random() - 0.5) * 60;
      droplet.setPosition(startX, waterY);
      droplet.setDepth(99);

      const velocityX = (Math.random() - 0.5) * 80;
      const velocityY = -80 - Math.random() * 60;

      scene.tweens.add({
        targets: droplet,
        x: startX + velocityX,
        y: waterY + velocityY * 0.5,
        duration: 250,
        ease: 'Quad.easeOut',
        onComplete: () => {
          scene.tweens.add({
            targets: droplet,
            y: waterY + 30,
            alpha: 0,
            duration: 350,
            ease: 'Quad.easeIn',
            onComplete: () => droplet.destroy(),
          });
        },
      });
    }
  }

  destroy(fromScene?: boolean): void {
    // Remove physics body if still exists
    if (this.deckBody) {
      const matter = (this.scene as any).matter;
      if (matter && matter.world) {
        matter.world.remove(this.deckBody);
      }
      this.deckBody = null;
    }
    this.hullGraphics.destroy();
    this.cabinGraphics.destroy();
    super.destroy(fromScene);
  }
}
