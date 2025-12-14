import Phaser from 'phaser';
import { GAME_HEIGHT } from '../constants';

export type SharkState = 'alive' | 'coughing' | 'dead';

export class Shark extends Phaser.GameObjects.Container {
  public isDestroyed: boolean = false;
  public state: SharkState = 'alive';
  public readonly pointValue: number = 500;
  public readonly sharkName: string = 'Atlantic Shark';

  private graphics: Phaser.GameObjects.Graphics;
  private baseY: number;
  private patrolMinX: number;
  private patrolMaxX: number;
  private direction: number = 1; // 1 = right, -1 = left
  private speed: number = 1.5;
  private collisionWidth: number = 80;
  private collisionHeight: number = 30;

  // Animation state
  private tailAngle: number = 0;
  private coughTimer: number = 0;
  private floatProgress: number = 0;

  // Food attraction
  private targetFood: { x: number; y: number } | null = null;

  // Dead shark fumes
  private reachedSurface: boolean = false;
  private surfaceTimer: number = 0;
  private fumeTimer: number = 0;

  // Water surface level
  private waterSurface: number;

  constructor(scene: Phaser.Scene, x: number, patrolMinX: number, patrolMaxX: number) {
    const waterSurface = GAME_HEIGHT * 0.75;
    const depthUnderwater = 80 + Math.random() * 40; // 80-120px below surface
    super(scene, x, waterSurface + depthUnderwater);

    this.waterSurface = waterSurface;
    this.baseY = waterSurface + depthUnderwater;
    this.patrolMinX = patrolMinX;
    this.patrolMaxX = patrolMaxX;
    this.direction = Math.random() > 0.5 ? 1 : -1;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(48); // Below water surface effects

    this.drawShark();
    scene.add.existing(this);
  }

  private calculateDepthTint(): number {
    const maxDepth = 150; // pixels below surface for full tint
    const depth = this.y - this.waterSurface;
    return Math.min(1, Math.max(0, depth / maxDepth));
  }

  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  private drawShark(): void {
    // Reuse graphics object - just clear it each frame
    if (!this.graphics) {
      this.graphics = this.scene.add.graphics();
      this.graphics.setDepth(20);
    }
    this.graphics.clear();
    this.graphics.setPosition(this.x, this.y);
    this.graphics.setRotation(this.rotation);

    const isFlipped = this.direction === -1;

    // Calculate depth-based tinting
    const depthTint = this.state === 'dead' ? 0 : this.calculateDepthTint();
    const alpha = 1 - depthTint * 0.4; // Fade to 60% at max depth

    // Body colors with depth tinting
    const bodyColorShallow = this.state === 'dead' ? 0x6a7a8a : 0x4a6080;
    const bodyColorDeep = 0x3a4a5a;
    const bellyColorShallow = 0xc8d8e8;
    const bellyColorDeep = 0x607080;

    const bodyColor = this.lerpColor(bodyColorShallow, bodyColorDeep, depthTint);
    const bellyColor = this.lerpColor(bellyColorShallow, bellyColorDeep, depthTint);
    const finColor = this.lerpColor(0x3a5070, 0x2a3a4a, depthTint);

    // Apply scale flip for direction (all drawing is done facing right)
    this.graphics.setScale(isFlipped ? -1 : 1, 1);

    const tailSwing = Math.sin(this.tailAngle) * 8;

    // === TAIL FIN (simple solid boomerang - no inner curves) ===
    this.graphics.fillStyle(finColor, alpha);
    this.graphics.beginPath();
    // Simple path: base top -> upper tip -> base center -> lower tip -> base bottom
    this.graphics.moveTo(-26, -3);                          // Top of base
    this.graphics.lineTo(-50 + tailSwing, -16);             // Upper tip
    this.graphics.lineTo(-30 + tailSwing * 0.2, 0);         // Center of base (the notch)
    this.graphics.lineTo(-48 + tailSwing, 13);              // Lower tip
    this.graphics.lineTo(-26, 3);                           // Bottom of base
    this.graphics.closePath();
    this.graphics.fillPath();

    // === MAIN BODY (single unified shape) ===
    this.graphics.fillStyle(bodyColor, alpha);
    this.graphics.beginPath();
    // Start at tail
    this.graphics.moveTo(-32, 0);
    // Top edge - tail to back
    this.graphics.lineTo(-25, -5);
    this.graphics.lineTo(-15, -8);
    // Dorsal fin notch
    this.graphics.lineTo(-8, -9);
    this.graphics.lineTo(-5, -9);
    // Back to head
    this.graphics.lineTo(5, -8);
    this.graphics.lineTo(18, -6);
    this.graphics.lineTo(28, -4);
    // Snout
    this.graphics.lineTo(38, -1);
    this.graphics.lineTo(42, 0);
    // Bottom of snout
    this.graphics.lineTo(38, 2);
    this.graphics.lineTo(28, 5);
    // Belly
    this.graphics.lineTo(15, 8);
    this.graphics.lineTo(0, 9);
    this.graphics.lineTo(-12, 7);
    this.graphics.lineTo(-22, 5);
    // Back to tail
    this.graphics.lineTo(-28, 2);
    this.graphics.lineTo(-32, 0);
    this.graphics.closePath();
    this.graphics.fillPath();

    // === BELLY HIGHLIGHT ===
    this.graphics.fillStyle(bellyColor, alpha);
    this.graphics.beginPath();
    this.graphics.moveTo(-20, 3);
    this.graphics.lineTo(-10, 6);
    this.graphics.lineTo(5, 7);
    this.graphics.lineTo(20, 5);
    this.graphics.lineTo(32, 2);
    this.graphics.lineTo(36, 1);
    this.graphics.lineTo(32, 3);
    this.graphics.lineTo(20, 6);
    this.graphics.lineTo(5, 8);
    this.graphics.lineTo(-10, 7);
    this.graphics.lineTo(-20, 4);
    this.graphics.closePath();
    this.graphics.fillPath();

    // === DORSAL FIN ===
    this.graphics.fillStyle(finColor, alpha);
    this.graphics.beginPath();
    this.graphics.moveTo(-8, -9);
    this.graphics.lineTo(-4, -14);
    this.graphics.lineTo(0, -20);
    this.graphics.lineTo(3, -18);
    this.graphics.lineTo(6, -12);
    this.graphics.lineTo(6, -9);
    this.graphics.lineTo(-8, -9);
    this.graphics.closePath();
    this.graphics.fillPath();

    // === PECTORAL FIN ===
    this.graphics.beginPath();
    this.graphics.moveTo(8, 7);
    this.graphics.lineTo(4, 12);
    this.graphics.lineTo(6, 16);
    this.graphics.lineTo(14, 14);
    this.graphics.lineTo(20, 10);
    this.graphics.lineTo(16, 8);
    this.graphics.closePath();
    this.graphics.fillPath();

    // === SMALL REAR FINS ===
    // Anal fin
    this.graphics.beginPath();
    this.graphics.moveTo(-16, 6);
    this.graphics.lineTo(-18, 10);
    this.graphics.lineTo(-22, 9);
    this.graphics.lineTo(-18, 6);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Second dorsal (small)
    this.graphics.beginPath();
    this.graphics.moveTo(-18, -7);
    this.graphics.lineTo(-16, -11);
    this.graphics.lineTo(-14, -7);
    this.graphics.closePath();
    this.graphics.fillPath();

    // === EYE ===
    if (this.state === 'dead') {
      this.graphics.lineStyle(2, 0xff0000, alpha);
      this.graphics.beginPath();
      this.graphics.moveTo(26, -4);
      this.graphics.lineTo(30, 0);
      this.graphics.moveTo(30, -4);
      this.graphics.lineTo(26, 0);
      this.graphics.strokePath();
    } else {
      // Eye
      this.graphics.fillStyle(0x000000, alpha);
      this.graphics.fillCircle(28, -2, 2.5);
      this.graphics.fillStyle(0xffffff, alpha * 0.7);
      this.graphics.fillCircle(29, -3, 1);
    }

    // === GILL SLITS ===
    const gillColor = this.lerpColor(0x2a4060, 0x1a2a3a, depthTint);
    this.graphics.lineStyle(1.5, gillColor, alpha * 0.6);
    for (let i = 0; i < 3; i++) {
      const gx = 14 + i * 4;
      this.graphics.beginPath();
      this.graphics.moveTo(gx, -4);
      this.graphics.lineTo(gx, 3);
      this.graphics.strokePath();
    }
  }

  update(
    waveOffset: number,
    pollutionLevel: number,
    foodTargets: { x: number; y: number }[],
    skipGraphics: boolean = false
  ): void {
    if (this.isDestroyed) return;

    // Update pollution state
    this.updatePollutionState(pollutionLevel);

    // Tail animation (faster when alive, slower when coughing/dead)
    const tailSpeed = this.state === 'alive' ? 0.15 : 0.05;
    this.tailAngle += tailSpeed;

    if (this.state === 'dead') {
      // Float to surface
      this.floatToSurface();
    } else {
      // Check for nearby food and set target
      this.findNearestFood(foodTargets);

      // Movement: either toward food or patrol
      const moveSpeed =
        this.state === 'coughing' ? this.speed * 0.5 : this.speed;
      const chaseSpeed = moveSpeed * 1.3; // Faster when chasing food

      if (this.targetFood) {
        // Swim toward food
        const dx = this.targetFood.x - this.x;
        const dy = this.targetFood.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
          this.direction = dx > 0 ? 1 : -1;
          this.x += (dx / dist) * chaseSpeed;
          this.y += (dy / dist) * chaseSpeed * 0.5; // Slower vertical movement
        }
      } else {
        // Normal patrol
        this.x += moveSpeed * this.direction;

        // Turn around at patrol bounds
        if (this.x <= this.patrolMinX) {
          this.direction = 1;
        } else if (this.x >= this.patrolMaxX) {
          this.direction = -1;
        }

        // Gentle vertical wave motion
        const verticalOffset =
          Math.sin(waveOffset * 0.5 + this.x * 0.01) * 5;
        this.y = this.baseY + verticalOffset;
      }

      // Coughing effects
      if (this.state === 'coughing') {
        this.coughTimer++;
        if (this.coughTimer % 60 === 0) {
          this.spawnCoughBubbles();
        }
      }
    }

    // Redraw shark (position and rotation applied in drawShark)
    // Skip expensive redraw when shark is off-screen
    if (!skipGraphics) {
      this.drawShark();
    }
  }

  private updatePollutionState(pollutionLevel: number): void {
    if (this.state === 'dead') return;

    if (pollutionLevel >= 0.6) {
      this.state = 'dead';
      this.floatProgress = 0;
    } else if (pollutionLevel >= 0.3) {
      if (this.state === 'alive') {
        this.state = 'coughing';
      }
    } else {
      if (this.state === 'coughing') {
        this.state = 'alive';
      }
    }
  }

  private floatToSurface(): void {
    const targetY = this.waterSurface + 5; // Just below surface, belly up

    this.floatProgress = Math.min(1, this.floatProgress + 0.01);
    this.y = Phaser.Math.Linear(this.baseY, targetY, this.floatProgress);

    // Slowly flip upside down
    this.rotation = Phaser.Math.Linear(0, Math.PI, this.floatProgress);

    // Gentle bob at surface when fully floated
    if (this.floatProgress >= 1) {
      this.y = targetY + Math.sin(Date.now() * 0.002) * 3;

      // Track time at surface
      if (!this.reachedSurface) {
        this.reachedSurface = true;
        this.surfaceTimer = 0;
      }

      this.surfaceTimer++;

      // After 10 seconds (600 frames at 60fps), start emitting fumes
      if (this.surfaceTimer > 600) {
        this.fumeTimer++;
        // Spawn fumes every 10 frames
        if (this.fumeTimer % 10 === 0) {
          this.spawnFumes();
        }
      }
    }
  }

  private spawnFumes(): void {
    // Create 2-4 fume particles per spawn
    const fumeCount = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < fumeCount; i++) {
      const fume = this.scene.add.graphics();

      // Green/yellow toxic fumes
      const fumeColors = [0x90a040, 0xa0b030, 0x80a020, 0xb0c040];
      const color = fumeColors[Math.floor(Math.random() * fumeColors.length)];

      fume.fillStyle(color, 0.6);
      const size = 4 + Math.random() * 6;
      fume.fillCircle(0, 0, size);

      // Spawn from the shark body (belly is up since it's flipped)
      const offsetX = (Math.random() - 0.5) * 50;
      fume.setPosition(this.x + offsetX, this.y - 5);
      fume.setDepth(52); // Above water

      // Float up and dissipate
      this.scene.tweens.add({
        targets: fume,
        y: fume.y - 30 - Math.random() * 40,
        x: fume.x + (Math.random() - 0.5) * 30,
        alpha: 0,
        scaleX: 1.5 + Math.random(),
        scaleY: 1.5 + Math.random(),
        duration: 1500 + Math.random() * 1000,
        ease: 'Quad.easeOut',
        onComplete: () => fume.destroy(),
      });
    }
  }

  private findNearestFood(foodTargets: { x: number; y: number }[]): void {
    const detectionRange = 200;
    let nearestDist = detectionRange;
    let nearest: { x: number; y: number } | null = null;

    for (const food of foodTargets) {
      const dx = food.x - this.x;
      const dy = food.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = food;
      }
    }

    this.targetFood = nearest;
  }

  private spawnCoughBubbles(): void {
    for (let i = 0; i < 5; i++) {
      const bubble = this.scene.add.graphics();
      bubble.fillStyle(0xadd8e6, 0.6);
      bubble.fillCircle(0, 0, 2 + Math.random() * 3);

      const mouthX = this.x + 35 * this.direction;
      bubble.setPosition(mouthX, this.y);
      bubble.setDepth(49);

      this.scene.tweens.add({
        targets: bubble,
        y: bubble.y - 40 - Math.random() * 20,
        x: bubble.x + (Math.random() - 0.5) * 20,
        alpha: 0,
        duration: 800 + Math.random() * 400,
        ease: 'Quad.easeOut',
        onComplete: () => bubble.destroy(),
      });
    }
  }

  canEatBomb(): boolean {
    return this.state === 'alive' || this.state === 'coughing';
  }

  eatBomb(): void {
    // Visual effect - gulp animation
    const gulp = this.scene.add.graphics();
    gulp.fillStyle(0xffff00, 0.5);
    gulp.fillCircle(0, 0, 15);
    gulp.setPosition(this.x + 30 * this.direction, this.y);
    gulp.setDepth(50);

    this.scene.tweens.add({
      targets: gulp,
      scale: 0,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => gulp.destroy(),
    });

    // Burp bubbles after a delay
    this.scene.time.delayedCall(400, () => {
      if (!this.isDestroyed) {
        this.spawnBurpBubbles();
      }
    });
  }

  private spawnBurpBubbles(): void {
    for (let i = 0; i < 8; i++) {
      const bubble = this.scene.add.graphics();
      bubble.fillStyle(0x90ee90, 0.7); // Light green - food digestion
      bubble.fillCircle(0, 0, 3 + Math.random() * 4);

      const mouthX = this.x + 35 * this.direction;
      bubble.setPosition(mouthX, this.y);
      bubble.setDepth(49);

      this.scene.tweens.add({
        targets: bubble,
        y: bubble.y - 60,
        x: bubble.x + (Math.random() - 0.5) * 30,
        alpha: 0,
        duration: 1000 + Math.random() * 500,
        ease: 'Quad.easeOut',
        onComplete: () => bubble.destroy(),
      });
    }
  }

  getCollisionBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.collisionWidth / 2,
      y: this.y - this.collisionHeight / 2,
      width: this.collisionWidth,
      height: this.collisionHeight,
    };
  }

  getEatingBounds(): { x: number; y: number; width: number; height: number } {
    // Larger detection area for eating
    return {
      x: this.x - 60,
      y: this.y - 30,
      width: 120,
      height: 60,
    };
  }

  explode(): { name: string; points: number; wasDead: boolean } {
    if (this.isDestroyed)
      return { name: this.sharkName, points: 0, wasDead: this.state === 'dead' };

    const wasDead = this.state === 'dead';
    this.isDestroyed = true;

    const scene = this.scene;
    const x = this.x;
    const y = this.y;

    // Blood splash effect (underwater)
    const splash = scene.add.graphics();
    splash.fillStyle(0x8b0000, 0.7); // Dark red
    splash.fillCircle(0, 0, 30);
    splash.setPosition(x, y);
    splash.setDepth(49);

    scene.tweens.add({
      targets: splash,
      scale: 2.5,
      alpha: 0,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => splash.destroy(),
    });

    // Flying shark debris
    const debrisColors = [0x4a5568, 0xe2e8f0, 0x2d3748];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const debris = scene.add.graphics();
      debris.fillStyle(debrisColors[i % debrisColors.length], 1);

      // Fin-shaped debris
      if (i % 2 === 0) {
        debris.beginPath();
        debris.moveTo(0, -8);
        debris.lineTo(6, 5);
        debris.lineTo(-6, 5);
        debris.closePath();
        debris.fillPath();
      } else {
        debris.fillEllipse(0, 0, 8, 4);
      }

      debris.setPosition(x, y);
      debris.setDepth(50);

      const distance = 40 + Math.random() * 50;
      scene.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + 30,
        angle: Math.random() * 720 - 360,
        alpha: 0,
        duration: 800 + Math.random() * 300,
        ease: 'Quad.easeOut',
        onComplete: () => debris.destroy(),
      });
    }

    // Bubbles
    for (let i = 0; i < 12; i++) {
      const bubble = scene.add.graphics();
      bubble.fillStyle(0xadd8e6, 0.6);
      bubble.fillCircle(0, 0, 2 + Math.random() * 4);
      bubble.setPosition(
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 20
      );
      bubble.setDepth(51);

      scene.tweens.add({
        targets: bubble,
        y: bubble.y - 80,
        alpha: 0,
        duration: 600 + Math.random() * 400,
        ease: 'Quad.easeOut',
        onComplete: () => bubble.destroy(),
      });
    }

    // Hide the shark
    this.graphics.setVisible(false);

    return { name: this.sharkName, points: this.pointValue, wasDead };
  }

  destroy(fromScene?: boolean): void {
    this.graphics.destroy();
    super.destroy(fromScene);
  }
}
