import Phaser from 'phaser';
import { GAME_HEIGHT } from '../constants';

export class FisherBoat extends Phaser.GameObjects.Container {
  public isDestroyed: boolean = false;
  public readonly pointValue: number = 300;
  public readonly boatName: string = 'Drug Kingpin boat';

  private graphics: Phaser.GameObjects.Graphics;
  private baseY: number;
  private collisionWidth: number = 70;
  private collisionHeight: number = 50;

  constructor(scene: Phaser.Scene, x: number) {
    // Position at ocean surface level
    const oceanHeight = GAME_HEIGHT * 0.75;
    super(scene, x, oceanHeight);

    this.baseY = oceanHeight;
    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    this.drawBoat();
    this.setDepth(10); // Above ocean, below shuttle

    scene.add.existing(this);
  }

  private drawBoat(): void {
    this.graphics.clear();

    // Colors
    const hullColor = 0x8B4513;      // Saddle brown (dark wood)
    const hullHighlight = 0xA0522D;  // Sienna (lighter wood)
    const cabinColor = 0xCD853F;     // Peru (cabin wood)
    const cabinRoof = 0x8B0000;      // Dark red roof
    const mastColor = 0x696969;      // Dim gray
    const flagColor = 0xFF0000;      // Red flag
    const deckColor = 0xDEB887;      // Burlywood (deck planks)

    // Hull (boat bottom) - curved shape
    this.graphics.fillStyle(hullColor, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(-35, 0);           // Left top of hull
    this.graphics.lineTo(-30, 15);          // Left curve down
    this.graphics.lineTo(-20, 22);          // Bottom left curve
    this.graphics.lineTo(20, 22);           // Bottom flat
    this.graphics.lineTo(30, 15);           // Bottom right curve
    this.graphics.lineTo(35, 0);            // Right top of hull
    this.graphics.closePath();
    this.graphics.fillPath();

    // Hull highlight (left side)
    this.graphics.fillStyle(hullHighlight, 0.6);
    this.graphics.beginPath();
    this.graphics.moveTo(-35, 0);
    this.graphics.lineTo(-30, 15);
    this.graphics.lineTo(-25, 18);
    this.graphics.lineTo(-25, 0);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Deck (flat top of hull)
    this.graphics.fillStyle(deckColor, 1);
    this.graphics.fillRect(-32, -5, 64, 8);

    // Deck planks (lines)
    this.graphics.lineStyle(1, hullColor, 0.5);
    for (let px = -28; px < 30; px += 8) {
      this.graphics.beginPath();
      this.graphics.moveTo(px, -5);
      this.graphics.lineTo(px, 3);
      this.graphics.strokePath();
    }

    // Cabin (wheelhouse)
    this.graphics.fillStyle(cabinColor, 1);
    this.graphics.fillRect(-12, -25, 24, 20);

    // Cabin window
    this.graphics.fillStyle(0x87CEEB, 0.8); // Sky blue glass
    this.graphics.fillRect(-8, -22, 16, 10);

    // Window frame
    this.graphics.lineStyle(2, hullColor, 1);
    this.graphics.strokeRect(-8, -22, 16, 10);
    // Window cross
    this.graphics.beginPath();
    this.graphics.moveTo(0, -22);
    this.graphics.lineTo(0, -12);
    this.graphics.moveTo(-8, -17);
    this.graphics.lineTo(8, -17);
    this.graphics.strokePath();

    // Cabin roof
    this.graphics.fillStyle(cabinRoof, 1);
    this.graphics.fillRect(-14, -28, 28, 4);

    // Fishing pole (angled out from the boat)
    const poleColor = 0x8B4513; // Wood color
    this.graphics.lineStyle(3, poleColor, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(20, -10); // Base of pole on deck
    this.graphics.lineTo(50, -35); // Pole angled out and up
    this.graphics.strokePath();

    // Pole tip (thinner)
    this.graphics.lineStyle(2, poleColor, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(50, -35);
    this.graphics.lineTo(55, -40); // Tip of pole
    this.graphics.strokePath();

    // Fishing line going straight down into water
    this.graphics.lineStyle(1, 0x000000, 0.7);
    this.graphics.beginPath();
    this.graphics.moveTo(55, -40); // From pole tip
    this.graphics.lineTo(55, 35); // Straight down into water
    this.graphics.strokePath();

    // Bobber on the water surface
    this.graphics.fillStyle(0xFF0000, 1); // Red bobber
    this.graphics.fillCircle(55, 15, 4);
    this.graphics.fillStyle(0xFFFFFF, 1); // White bottom of bobber
    this.graphics.fillCircle(55, 18, 3);

    // Small flag on cabin roof
    this.graphics.lineStyle(2, mastColor, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(0, -28);
    this.graphics.lineTo(0, -42);
    this.graphics.strokePath();

    this.graphics.fillStyle(flagColor, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(0, -42);
    this.graphics.lineTo(10, -38);
    this.graphics.lineTo(0, -34);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Hull outline
    this.graphics.lineStyle(2, 0x5D3A1A, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(-35, 0);
    this.graphics.lineTo(-30, 15);
    this.graphics.lineTo(-20, 22);
    this.graphics.lineTo(20, 22);
    this.graphics.lineTo(30, 15);
    this.graphics.lineTo(35, 0);
    this.graphics.strokePath();
  }

  update(waveOffset: number): void {
    if (this.isDestroyed) return;

    // Bob up and down with the waves
    const bobAmplitude = 8;
    const bobY = Math.sin(waveOffset * 1.5) * bobAmplitude;
    this.y = this.baseY + bobY - 15; // Offset to sit on water surface

    // Slight rotation with waves
    const rotationAmplitude = 0.06;
    this.rotation = Math.sin(waveOffset * 0.8 + 0.5) * rotationAmplitude;
  }

  getCollisionBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.collisionWidth / 2,
      y: this.y - this.collisionHeight,
      width: this.collisionWidth,
      height: this.collisionHeight + 20, // Extend down into water
    };
  }

  explode(): { name: string; points: number } {
    if (this.isDestroyed) return { name: this.boatName, points: 0 };

    this.isDestroyed = true;

    const scene = this.scene;
    const x = this.x;
    const y = this.y - 20;

    // Big explosion flash
    const flash = scene.add.graphics();
    flash.fillStyle(0xFF6600, 1);
    flash.fillCircle(0, 0, 50);
    flash.fillStyle(0xFFFF00, 1);
    flash.fillCircle(0, 0, 35);
    flash.fillStyle(0xFFFFFF, 1);
    flash.fillCircle(0, 0, 15);
    flash.setPosition(x, y);
    flash.setDepth(100);

    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.5,
      duration: 500,
      onComplete: () => flash.destroy(),
    });

    // Flying debris (wood pieces)
    const debrisColors = [0x8B4513, 0xCD853F, 0xDEB887, 0x696969];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const debris = scene.add.graphics();
      debris.fillStyle(debrisColors[i % debrisColors.length], 1);

      // Random debris shapes
      if (i % 3 === 0) {
        debris.fillRect(-4, -2, 8, 4); // Plank
      } else if (i % 3 === 1) {
        debris.fillRect(-2, -4, 4, 8); // Vertical plank
      } else {
        debris.fillCircle(0, 0, 3); // Round debris
      }

      debris.setPosition(x, y);
      debris.setDepth(101);

      const distance = 50 + Math.random() * 40;
      scene.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + 40, // Arc down
        angle: Math.random() * 720 - 360,
        alpha: 0,
        duration: 600 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => debris.destroy(),
      });
    }

    // Water splash effect
    for (let i = 0; i < 10; i++) {
      const splashAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      const splashSpeed = 3 + Math.random() * 5;
      const droplet = scene.add.graphics();
      droplet.fillStyle(0x4169E1, 0.8);
      droplet.fillCircle(0, 0, 3 + Math.random() * 4);
      droplet.setPosition(x + (Math.random() - 0.5) * 40, this.baseY);
      droplet.setDepth(99);

      scene.tweens.add({
        targets: droplet,
        x: droplet.x + Math.cos(splashAngle) * splashSpeed * 15,
        y: droplet.y + Math.sin(splashAngle) * splashSpeed * 20 + 50,
        alpha: 0,
        duration: 500 + Math.random() * 300,
        ease: 'Quad.easeOut',
        onComplete: () => droplet.destroy(),
      });
    }

    // Hide the boat
    this.setVisible(false);

    return { name: this.boatName, points: this.pointValue };
  }

  destroy(fromScene?: boolean): void {
    this.graphics.destroy();
    super.destroy(fromScene);
  }
}
