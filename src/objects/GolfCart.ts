import Phaser from 'phaser';
import { Terrain } from './Terrain';
import { createExplosionFlash } from '../utils/ExplosionUtils';

export class GolfCart extends Phaser.GameObjects.Container {
  public isDestroyed: boolean = false;
  public readonly pointValue: number = 500;

  private graphics: Phaser.GameObjects.Graphics;
  private patrolMinX: number;
  private patrolMaxX: number;
  private vx: number = 0.5; // Patrol speed
  private fleeSpeed: number = 2.5; // Flee speed
  private direction: number = 1; // 1 = right, -1 = left
  private isFleeingUntil: number = 0;
  private fleeDirection: number = 1;

  // Speech bubble
  private speechBubble: Phaser.GameObjects.Container | null = null;
  private lastSpeechTime: number = 0;
  private nextSpeechDelay: number = 0;

  // Collision dimensions
  private collisionWidth: number = 60;
  private collisionHeight: number = 55;

  constructor(scene: Phaser.Scene, x: number, patrolMinX: number, patrolMaxX: number) {
    super(scene, x, 0);

    this.patrolMinX = patrolMinX;
    this.patrolMaxX = patrolMaxX;

    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    this.drawCart();
    this.setDepth(10);

    // Random initial speech delay
    this.nextSpeechDelay = 3000 + Math.random() * 5000;

    scene.add.existing(this);
  }

  private drawCart(): void {
    this.graphics.clear();

    // Colors
    const wheelColor = 0x222222;
    const wheelRim = 0x888888;
    const tireHighlight = 0x444444;
    const bodyColor = 0xF5F5F5; // Off-white
    const bodyAccent = 0xE8E8E8;
    const bodyStroke = 0xAAAAAA;
    const canopyColor = 0x2D5A27; // Dark green
    const canopyUnderside = 0x1A3A17;
    const seatColor = 0x654321; // Dark brown leather
    const seatHighlight = 0x8B6914;
    const chromeColor = 0xC0C0C0;
    const golferShirt = 0xCC0000; // Red polo
    const golferShirtShadow = 0x990000;
    const golferPants = 0xF0E68C; // Khaki
    const skinColor = 0xFFDBAC;
    const skinShadow = 0xDEB887;
    const hairColor = 0xCC4400; // Red/orange hair
    const hairHighlight = 0xFF6633; // Lighter red highlight

    // === WHEELS (more detailed) ===
    // Back wheel
    this.graphics.fillStyle(wheelColor, 1);
    this.graphics.fillCircle(-18, 12, 10);
    // Tire tread highlight
    this.graphics.fillStyle(tireHighlight, 1);
    this.graphics.fillCircle(-18, 10, 8);
    // Wheel rim
    this.graphics.fillStyle(wheelRim, 1);
    this.graphics.fillCircle(-18, 12, 5);
    // Hub cap
    this.graphics.fillStyle(chromeColor, 1);
    this.graphics.fillCircle(-18, 12, 2);

    // Front wheel
    this.graphics.fillStyle(wheelColor, 1);
    this.graphics.fillCircle(18, 12, 10);
    this.graphics.fillStyle(tireHighlight, 1);
    this.graphics.fillCircle(18, 10, 8);
    this.graphics.fillStyle(wheelRim, 1);
    this.graphics.fillCircle(18, 12, 5);
    this.graphics.fillStyle(chromeColor, 1);
    this.graphics.fillCircle(18, 12, 2);

    // === CART BODY (more detailed) ===
    // Main body shadow
    this.graphics.fillStyle(0xCCCCCC, 1);
    this.graphics.fillRoundedRect(-28, -2, 56, 16, 4);

    // Main body
    this.graphics.fillStyle(bodyColor, 1);
    this.graphics.fillRoundedRect(-28, -4, 56, 16, 4);

    // Body accent stripe
    this.graphics.fillStyle(bodyAccent, 1);
    this.graphics.fillRect(-26, 4, 52, 4);

    // Front panel detail
    this.graphics.fillStyle(0xDDDDDD, 1);
    this.graphics.fillRoundedRect(20, -2, 8, 10, 2);

    // Headlight
    this.graphics.fillStyle(0xFFFF99, 1);
    this.graphics.fillCircle(25, 2, 3);
    this.graphics.lineStyle(1, 0xCCCC66, 1);
    this.graphics.strokeCircle(25, 2, 3);

    // Body outline
    this.graphics.lineStyle(1, bodyStroke, 1);
    this.graphics.strokeRoundedRect(-28, -4, 56, 16, 4);

    // === SEAT (leather texture) ===
    // Seat back
    this.graphics.fillStyle(seatColor, 1);
    this.graphics.fillRoundedRect(-20, -18, 22, 14, 3);
    // Seat cushion highlight
    this.graphics.fillStyle(seatHighlight, 1);
    this.graphics.fillRoundedRect(-18, -16, 8, 10, 2);
    // Seat stitching
    this.graphics.lineStyle(1, 0x3D2314, 0.5);
    this.graphics.beginPath();
    this.graphics.moveTo(-14, -16);
    this.graphics.lineTo(-14, -6);
    this.graphics.strokePath();

    // === CANOPY/ROOF (with depth) ===
    // Roof supports (chrome poles)
    this.graphics.lineStyle(3, 0x666666, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(-22, -4);
    this.graphics.lineTo(-22, -36);
    this.graphics.moveTo(4, -4);
    this.graphics.lineTo(4, -36);
    this.graphics.strokePath();
    // Support highlights
    this.graphics.lineStyle(1, chromeColor, 0.6);
    this.graphics.beginPath();
    this.graphics.moveTo(-21, -4);
    this.graphics.lineTo(-21, -36);
    this.graphics.moveTo(5, -4);
    this.graphics.lineTo(5, -36);
    this.graphics.strokePath();

    // Canopy underside (shadow)
    this.graphics.fillStyle(canopyUnderside, 1);
    this.graphics.fillRoundedRect(-28, -38, 40, 4, 2);

    // Canopy top
    this.graphics.fillStyle(canopyColor, 1);
    this.graphics.fillRoundedRect(-28, -42, 40, 6, 3);

    // Canopy edge detail
    this.graphics.lineStyle(1, 0x1A3A17, 1);
    this.graphics.strokeRoundedRect(-28, -42, 40, 6, 3);

    // Canopy fringe scallops
    this.graphics.fillStyle(canopyColor, 1);
    for (let i = 0; i < 5; i++) {
      this.graphics.fillCircle(-24 + i * 8, -36, 3);
    }

    // === GOLF BAG (more detailed) ===
    // Bag body
    this.graphics.fillStyle(0x1A1A4E, 1); // Navy blue
    this.graphics.fillRoundedRect(10, -28, 14, 26, 4);
    // Bag pocket
    this.graphics.fillStyle(0x2A2A6E, 1);
    this.graphics.fillRoundedRect(12, -10, 10, 8, 2);
    // Bag strap
    this.graphics.lineStyle(2, 0xCD853F, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(12, -25);
    this.graphics.lineTo(8, -15);
    this.graphics.strokePath();

    // Golf clubs (varied)
    this.graphics.lineStyle(2, 0x888888, 1);
    this.graphics.beginPath();
    // Driver
    this.graphics.moveTo(14, -28);
    this.graphics.lineTo(10, -45);
    // Iron
    this.graphics.moveTo(17, -28);
    this.graphics.lineTo(17, -48);
    // Putter
    this.graphics.moveTo(20, -28);
    this.graphics.lineTo(24, -42);
    this.graphics.strokePath();

    // Club heads
    // Driver head (large)
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillEllipse(8, -46, 5, 4);
    // Iron head
    this.graphics.fillStyle(chromeColor, 1);
    this.graphics.fillRect(15, -50, 5, 3);
    // Putter head
    this.graphics.fillStyle(chromeColor, 1);
    this.graphics.fillRect(22, -44, 6, 3);

    // === GOLFER (Trump-like) ===
    // Big round belly (white polo shirt)
    this.graphics.fillStyle(0xDDDDDD, 1);
    this.graphics.fillEllipse(-8, -12, 14, 12); // Shadow
    this.graphics.fillStyle(0xFFFFFF, 1);
    this.graphics.fillEllipse(-8, -14, 14, 12); // Main belly - white polo

    // Belly bulge detail
    this.graphics.fillStyle(0xEEEEEE, 1);
    this.graphics.fillEllipse(-6, -12, 10, 8);

    // Polo collar
    this.graphics.fillStyle(0xFFFFFF, 1);
    this.graphics.fillRect(-14, -26, 8, 4);

    // Fat arm reaching to steering (white polo)
    this.graphics.fillStyle(0xFFFFFF, 1);
    this.graphics.fillEllipse(0, -14, 8, 5);
    // Forearm (orange-tan skin)
    this.graphics.fillStyle(0xFFB366, 1); // Orange tan
    this.graphics.fillEllipse(4, -12, 5, 4);

    // Chubby hand on wheel (orange tan)
    this.graphics.fillStyle(0xFFB366, 1);
    this.graphics.fillCircle(6, -10, 4);
    // Small fingers
    this.graphics.fillCircle(8, -8, 2);
    this.graphics.fillCircle(9, -10, 2);

    // Pants/legs (white golf pants)
    this.graphics.fillStyle(0xFAFAFA, 1);
    this.graphics.fillRect(-18, -5, 18, 8);
    this.graphics.fillEllipse(-9, -2, 10, 5);

    // Belt
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(-18, -6, 18, 3);
    // Big gold belt buckle
    this.graphics.fillStyle(0xFFD700, 1);
    this.graphics.fillRect(-11, -6, 5, 3);

    // === HEAD (Trump-like) ===
    // Thick neck / double chin area (orange tan)
    this.graphics.fillStyle(0xE8A050, 1);
    this.graphics.fillEllipse(-10, -26, 8, 5);

    // Big round head (orange tan)
    this.graphics.fillStyle(0xFFB366, 1);
    this.graphics.fillCircle(-9, -34, 10);

    // Double chin
    this.graphics.fillStyle(0xE8A050, 1);
    this.graphics.fillEllipse(-9, -25, 7, 4);

    // Jowls / chubby cheeks
    this.graphics.fillStyle(0xFFB366, 1);
    this.graphics.fillEllipse(-15, -32, 4, 5);
    this.graphics.fillEllipse(-3, -32, 4, 5);

    // White around eyes (no tan)
    this.graphics.fillStyle(0xFFE0C0, 1);
    this.graphics.fillEllipse(-6, -36, 5, 3);

    // Ear
    this.graphics.fillStyle(0xE8A050, 1);
    this.graphics.fillEllipse(-19, -34, 3, 4);

    // Small squinty eyes
    this.graphics.fillStyle(0xFFFFFF, 1);
    this.graphics.fillEllipse(-6, -36, 3, 2);
    // Blue eyes
    this.graphics.fillStyle(0x6699CC, 1);
    this.graphics.fillCircle(-5, -36, 1);

    // Eyebrow (blonde)
    this.graphics.fillStyle(0xDDBB77, 1);
    this.graphics.fillEllipse(-7, -39, 4, 1);

    // Nose
    this.graphics.fillStyle(0xE8A050, 1);
    this.graphics.fillEllipse(-5, -33, 3, 3);

    // Pursed mouth / duck lips
    this.graphics.fillStyle(0xCC8888, 1);
    this.graphics.fillEllipse(-6, -28, 3, 2);

    // === HAIR (Trump signature blonde swoosh) ===
    const trumpHairColor = 0xDDBB55; // Blonde-orange
    const trumpHairHighlight = 0xFFDD77;
    const trumpHairShadow = 0xCC9933;

    // Main hair volume - the signature swoosh forward
    this.graphics.fillStyle(trumpHairColor, 1);
    this.graphics.fillEllipse(-7, -44, 12, 5); // Top volume
    this.graphics.fillEllipse(-3, -43, 8, 4); // Forward swoosh

    // The famous front swoop
    this.graphics.fillStyle(trumpHairHighlight, 1);
    this.graphics.fillEllipse(-2, -42, 6, 3);
    this.graphics.fillEllipse(0, -41, 4, 3); // Very front

    // Hair swept back on sides
    this.graphics.fillStyle(trumpHairColor, 1);
    this.graphics.fillEllipse(-16, -40, 4, 5);
    this.graphics.fillEllipse(-17, -36, 3, 4);

    // Back of hair
    this.graphics.fillStyle(trumpHairShadow, 1);
    this.graphics.fillEllipse(-14, -42, 5, 4);

    // Highlight on top
    this.graphics.fillStyle(trumpHairHighlight, 1);
    this.graphics.fillEllipse(-6, -45, 6, 2);

    // === STEERING WHEEL ===
    this.graphics.lineStyle(3, 0x222222, 1);
    this.graphics.strokeCircle(5, -8, 6);
    // Steering column
    this.graphics.lineStyle(2, chromeColor, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(5, -2);
    this.graphics.lineTo(5, 2);
    this.graphics.strokePath();

    // === DASHBOARD ===
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRoundedRect(-2, -6, 16, 5, 2);
    // Speedometer
    this.graphics.fillStyle(0x111111, 1);
    this.graphics.fillCircle(6, -4, 2);
    this.graphics.fillStyle(0x00FF00, 1);
    this.graphics.fillCircle(6, -4, 1);
  }

  update(terrain: Terrain, shuttleX: number, shuttleY: number, time: number): void {
    if (this.isDestroyed) return;

    // Check distance to shuttle
    const dx = this.x - shuttleX;
    const dy = this.y - shuttleY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const FLEE_DISTANCE = 300;
    const FLEE_DURATION = 2000; // ms

    // Trigger flee if shuttle is close
    if (distance < FLEE_DISTANCE) {
      this.isFleeingUntil = time + FLEE_DURATION;
      // Flee away from shuttle (opposite direction)
      this.fleeDirection = shuttleX < this.x ? 1 : -1;
    }

    // Movement
    if (time < this.isFleeingUntil) {
      // Fleeing - move fast away from shuttle
      this.x += this.fleeSpeed * this.fleeDirection;
      this.direction = this.fleeDirection;
    } else {
      // Patrolling - move back and forth
      this.x += this.vx * this.direction;

      // Reverse at boundaries
      if (this.x >= this.patrolMaxX) {
        this.x = this.patrolMaxX;
        this.direction = -1;
      } else if (this.x <= this.patrolMinX) {
        this.x = this.patrolMinX;
        this.direction = 1;
      }
    }

    // Stay on terrain
    const terrainY = terrain.getHeightAt(this.x);
    this.y = terrainY - 10; // Offset so wheels touch ground

    // Flip graphics based on direction
    this.graphics.setScale(this.direction, 1);

    // Speech bubble disabled per user request
  }

  private showSpeechBubble(): void {
    if (this.speechBubble) {
      this.speechBubble.destroy();
    }

    const scene = this.scene;

    // Create speech bubble container
    this.speechBubble = scene.add.container(this.x, this.y - 50);
    this.speechBubble.setDepth(100);

    // Bubble background
    const bg = scene.add.graphics();
    bg.fillStyle(0xFFFFFF, 0.95);
    bg.fillRoundedRect(-70, -15, 140, 30, 8);
    bg.lineStyle(2, 0x333333, 1);
    bg.strokeRoundedRect(-70, -15, 140, 30, 8);

    // Speech bubble tail
    bg.fillStyle(0xFFFFFF, 0.95);
    bg.fillTriangle(0, 15, -10, 15, 0, 25);
    bg.lineStyle(2, 0x333333, 1);
    bg.beginPath();
    bg.moveTo(-10, 15);
    bg.lineTo(0, 25);
    bg.lineTo(0, 15);
    bg.strokePath();

    this.speechBubble.add(bg);

    // Text
    const text = scene.add.text(0, 0, 'Watch this drive!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#333333',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    this.speechBubble.add(text);

    // Animate and remove
    scene.tweens.add({
      targets: this.speechBubble,
      y: this.y - 70,
      alpha: 0,
      duration: 2500,
      delay: 1500,
      ease: 'Power1',
      onComplete: () => {
        if (this.speechBubble) {
          this.speechBubble.destroy();
          this.speechBubble = null;
        }
      },
    });
  }

  getCollisionBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.collisionWidth / 2,
      y: this.y - this.collisionHeight,
      width: this.collisionWidth,
      height: this.collisionHeight + 10,
    };
  }

  explode(): { name: string; points: number; filePositions: { x: number; y: number }[] } {
    if (this.isDestroyed) {
      return { name: 'Golf Cart', points: 0, filePositions: [] };
    }

    this.isDestroyed = true;

    // Remove speech bubble if showing
    if (this.speechBubble) {
      this.speechBubble.destroy();
      this.speechBubble = null;
    }

    const scene = this.scene;
    const x = this.x;
    const y = this.y - 15;

    // Big explosion flash
    createExplosionFlash(scene, x, y, {
      flashColors: [0xFF6600, 0xFFFF00, 0xFFFFFF],
      flashSizes: [45, 30, 12],
      duration: 400,
      depth: 100,
    });

    // Flying debris (cart parts, golf clubs, etc.)
    const debrisColors = [0xFFFAF0, 0x228B22, 0x333333, 0xC0C0C0, 0x8B4513];
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const debris = scene.add.graphics();
      debris.fillStyle(debrisColors[i % debrisColors.length], 1);

      // Random debris shapes
      if (i % 4 === 0) {
        debris.fillRect(-5, -2, 10, 4); // Metal piece
      } else if (i % 4 === 1) {
        debris.fillCircle(0, 0, 4); // Wheel piece
      } else if (i % 4 === 2) {
        debris.fillRect(-2, -6, 4, 12); // Golf club
      } else {
        debris.fillRect(-3, -3, 6, 6); // Square debris
      }

      debris.setPosition(x, y);
      debris.setDepth(101);

      const distance = 60 + Math.random() * 50;
      scene.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + 50,
        angle: Math.random() * 720 - 360,
        alpha: 0,
        duration: 700 + Math.random() * 300,
        ease: 'Quad.easeOut',
        onComplete: () => debris.destroy(),
      });
    }

    // Golf ball flying out
    const golfBall = scene.add.graphics();
    golfBall.fillStyle(0xFFFFFF, 1);
    golfBall.fillCircle(0, 0, 5);
    golfBall.lineStyle(1, 0xCCCCCC, 1);
    golfBall.strokeCircle(0, 0, 5);
    golfBall.setPosition(x, y);
    golfBall.setDepth(102);

    scene.tweens.add({
      targets: golfBall,
      x: x + 150,
      y: y - 100,
      duration: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Golf ball falls down
        scene.tweens.add({
          targets: golfBall,
          y: y + 200,
          duration: 800,
          ease: 'Quad.easeIn',
          onComplete: () => golfBall.destroy(),
        });
      },
    });

    // Hide the cart
    this.setVisible(false);

    // Return positions for Epstein Files to spawn
    const filePositions = [
      { x: x - 40, y: y - 20 },
      { x: x, y: y - 30 },
      { x: x + 40, y: y - 20 },
    ];

    return { name: 'Presidential Getaway', points: this.pointValue, filePositions };
  }

  destroy(fromScene?: boolean): void {
    if (this.speechBubble) {
      this.speechBubble.destroy();
    }
    this.graphics.destroy();
    super.destroy(fromScene);
  }
}
