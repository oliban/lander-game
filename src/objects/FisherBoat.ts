import Phaser from 'phaser';
import { GAME_HEIGHT } from '../constants';

export class FisherBoat extends Phaser.GameObjects.Container {
  public isDestroyed: boolean = false;
  public readonly pointValue: number = 300;
  public readonly boatName: string = 'Drug Kingpin boat';
  public hasFishPackage: boolean = false; // 15% chance to have contraband
  public fishPackageCollected: boolean = false; // Already picked up
  public shuttleNearby: boolean = false; // Stop bobbing when shuttle is close

  private hullGraphics: Phaser.GameObjects.Graphics;  // Hull and deck - in front of shuttle
  private cabinGraphics: Phaser.GameObjects.Graphics; // Cabin - behind shuttle
  private baseY: number;
  private collisionWidth: number = 70;
  private collisionHeight: number = 50;
  private deckWidth: number = 64;
  private deckY: number = -5; // Relative to container (matches deck graphic at y=-5)
  private deckBody: MatterJS.BodyType | null = null;

  constructor(scene: Phaser.Scene, x: number) {
    // Position at ocean surface level
    const oceanHeight = GAME_HEIGHT * 0.75;
    super(scene, x, oceanHeight);

    this.baseY = oceanHeight;

    // Cabin graphics (behind shuttle at depth 10, so depth 5)
    this.cabinGraphics = scene.add.graphics();
    this.cabinGraphics.setDepth(5);

    // Hull graphics (in front of shuttle at depth 10, so depth 15)
    this.hullGraphics = scene.add.graphics();
    this.hullGraphics.setDepth(15);

    this.drawBoat();

    // Create physics body for deck (static, acts like landing pad)
    const Matter = (scene as any).matter;
    if (Matter) {
      this.deckBody = Matter.add.rectangle(
        x,
        oceanHeight - 15 + this.deckY + 4, // Deck surface Y (stable position)
        this.deckWidth,
        8,
        {
          isStatic: true,
          label: 'boatDeck',
          collisionFilter: {
            category: 2, // terrain category
            mask: 1, // collide with shuttles
          },
        }
      );
    }

    scene.add.existing(this);
  }

  private drawBoat(): void {
    this.hullGraphics.clear();
    this.cabinGraphics.clear();

    // Colors
    const hullColor = 0x8B4513;      // Saddle brown (dark wood)
    const hullHighlight = 0xA0522D;  // Sienna (lighter wood)
    const cabinColor = 0xCD853F;     // Peru (cabin wood)
    const cabinRoof = 0x8B0000;      // Dark red roof
    const mastColor = 0x696969;      // Dim gray
    const flagColor = 0xFF0000;      // Red flag
    const deckColor = 0xDEB887;      // Burlywood (deck planks)

    // === CABIN LAYER (behind shuttle) ===
    // Cabin (wheelhouse)
    this.cabinGraphics.fillStyle(cabinColor, 1);
    this.cabinGraphics.fillRect(-12, -25, 24, 20);

    // Cabin window
    this.cabinGraphics.fillStyle(0x87CEEB, 0.8); // Sky blue glass
    this.cabinGraphics.fillRect(-8, -22, 16, 10);

    // Window frame
    this.cabinGraphics.lineStyle(2, hullColor, 1);
    this.cabinGraphics.strokeRect(-8, -22, 16, 10);
    // Window cross
    this.cabinGraphics.beginPath();
    this.cabinGraphics.moveTo(0, -22);
    this.cabinGraphics.lineTo(0, -12);
    this.cabinGraphics.moveTo(-8, -17);
    this.cabinGraphics.lineTo(8, -17);
    this.cabinGraphics.strokePath();

    // Cabin roof
    this.cabinGraphics.fillStyle(cabinRoof, 1);
    this.cabinGraphics.fillRect(-14, -28, 28, 4);

    // Small flag on cabin roof
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

    // === HULL LAYER (in front of shuttle) ===
    // Hull (boat bottom) - curved shape
    this.hullGraphics.fillStyle(hullColor, 1);
    this.hullGraphics.beginPath();
    this.hullGraphics.moveTo(-35, 0);           // Left top of hull
    this.hullGraphics.lineTo(-30, 15);          // Left curve down
    this.hullGraphics.lineTo(-20, 22);          // Bottom left curve
    this.hullGraphics.lineTo(20, 22);           // Bottom flat
    this.hullGraphics.lineTo(30, 15);           // Bottom right curve
    this.hullGraphics.lineTo(35, 0);            // Right top of hull
    this.hullGraphics.closePath();
    this.hullGraphics.fillPath();

    // Hull highlight (left side)
    this.hullGraphics.fillStyle(hullHighlight, 0.6);
    this.hullGraphics.beginPath();
    this.hullGraphics.moveTo(-35, 0);
    this.hullGraphics.lineTo(-30, 15);
    this.hullGraphics.lineTo(-25, 18);
    this.hullGraphics.lineTo(-25, 0);
    this.hullGraphics.closePath();
    this.hullGraphics.fillPath();

    // Deck (flat top of hull)
    this.hullGraphics.fillStyle(deckColor, 1);
    this.hullGraphics.fillRect(-32, -5, 64, 8);

    // Deck planks (lines)
    this.hullGraphics.lineStyle(1, hullColor, 0.5);
    for (let px = -28; px < 30; px += 8) {
      this.hullGraphics.beginPath();
      this.hullGraphics.moveTo(px, -5);
      this.hullGraphics.lineTo(px, 3);
      this.hullGraphics.strokePath();
    }

    // Fishing pole (angled out from the boat)
    const poleColor = 0x8B4513; // Wood color
    this.hullGraphics.lineStyle(3, poleColor, 1);
    this.hullGraphics.beginPath();
    this.hullGraphics.moveTo(20, -10); // Base of pole on deck
    this.hullGraphics.lineTo(50, -35); // Pole angled out and up
    this.hullGraphics.strokePath();

    // Pole tip (thinner)
    this.hullGraphics.lineStyle(2, poleColor, 1);
    this.hullGraphics.beginPath();
    this.hullGraphics.moveTo(50, -35);
    this.hullGraphics.lineTo(55, -40); // Tip of pole
    this.hullGraphics.strokePath();

    // Fishing line going straight down into water
    this.hullGraphics.lineStyle(1, 0x000000, 0.7);
    this.hullGraphics.beginPath();
    this.hullGraphics.moveTo(55, -40); // From pole tip
    this.hullGraphics.lineTo(55, 35); // Straight down into water
    this.hullGraphics.strokePath();

    // Bobber on the water surface
    this.hullGraphics.fillStyle(0xFF0000, 1); // Red bobber
    this.hullGraphics.fillCircle(55, 15, 4);
    this.hullGraphics.fillStyle(0xFFFFFF, 1); // White bottom of bobber
    this.hullGraphics.fillCircle(55, 18, 3);

    // Hull outline
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

    // Don't bob if shuttle is nearby - stay stable for landing
    if (!this.shuttleNearby) {
      // Bob up and down with the waves
      const bobAmplitude = 8;
      const bobY = Math.sin(waveOffset * 1.5) * bobAmplitude;
      this.y = this.baseY + bobY - 15; // Offset to sit on water surface

      // Slight rotation with waves
      const rotationAmplitude = 0.06;
      this.rotation = Math.sin(waveOffset * 0.8 + 0.5) * rotationAmplitude;
    } else {
      // Stable position when shuttle is nearby
      this.y = this.baseY - 15;
      this.rotation = 0;
    }

    // Update graphics positions to follow the container
    this.hullGraphics.setPosition(this.x, this.y);
    this.hullGraphics.setRotation(this.rotation);
    this.cabinGraphics.setPosition(this.x, this.y);
    this.cabinGraphics.setRotation(this.rotation);

    // Keep physics deck body in sync with boat position
    if (this.deckBody) {
      const Matter = (this.scene as any).matter;
      if (Matter) {
        Matter.body.setPosition(this.deckBody, {
          x: this.x,
          y: this.y + this.deckY + 4, // Deck surface
        });
      }
    }
  }

  getCollisionBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.collisionWidth / 2,
      y: this.y - this.collisionHeight,
      width: this.collisionWidth,
      height: this.collisionHeight + 20, // Extend down into water
    };
  }

  // Landing deck bounds - where the shuttle can land
  getLandingBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.deckWidth / 2,
      y: this.y + this.deckY,
      width: this.deckWidth,
      height: 8, // Deck thickness
    };
  }

  // Get the deck surface Y position for landing
  getDeckY(): number {
    return this.y + this.deckY;
  }

  explode(): { name: string; points: number } {
    if (this.isDestroyed) return { name: this.boatName, points: 0 };

    this.isDestroyed = true;

    // Remove physics body
    if (this.deckBody) {
      const Matter = (this.scene as any).matter;
      if (Matter) {
        Matter.world.remove(Matter.world.engine.world, this.deckBody);
      }
      this.deckBody = null;
    }

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

    // Hide the boat graphics
    this.hullGraphics.setVisible(false);
    this.cabinGraphics.setVisible(false);

    return { name: this.boatName, points: this.pointValue };
  }

  destroy(fromScene?: boolean): void {
    this.hullGraphics.destroy();
    this.cabinGraphics.destroy();
    super.destroy(fromScene);
  }
}
