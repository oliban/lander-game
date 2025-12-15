import Phaser from 'phaser';
import { GAME_HEIGHT } from '../constants';
import { lerpColor } from '../utils/ColorUtils';
import { createBubbles, createSmokePuffs } from '../utils/ParticleUtils';
import { DestructibleObject } from '../core/base';

export type SharkState = 'alive' | 'coughing' | 'dead';

interface SharkExplosionResult {
  name: string;
  points: number;
  wasDead: boolean;
}

export class Shark extends DestructibleObject {
  public state: SharkState = 'alive';
  public readonly sharkName: string = 'Atlantic Shark';
  public baseY: number;

  private graphics: Phaser.GameObjects.Graphics;
  private patrolMinX: number;
  private patrolMaxX: number;
  private direction: number = 1;
  private speed: number = 1.5;

  // Animation state
  private tailAngle: number = 0;
  private coughTimer: number = 0;
  private floatProgress: number = 0;

  // Food attraction
  private targetFood: { x: number; y: number } | null = null;

  // Food eaten counter - dies after eating too much
  private foodEaten: number = 0;
  private readonly FATAL_FOOD_COUNT = 5;

  // Dead shark fumes
  private reachedSurface: boolean = false;
  private surfaceTimer: number = 0;
  private fumeTimer: number = 0;

  // Water surface level
  private waterSurface: number;

  constructor(scene: Phaser.Scene, x: number, patrolMinX: number, patrolMaxX: number) {
    const waterSurface = GAME_HEIGHT * 0.75;
    const depthUnderwater = 80 + Math.random() * 40;

    super(scene, x, waterSurface + depthUnderwater, {
      collisionWidth: 80,
      collisionHeight: 30,
      boundsAlignment: 'center',
      pointValue: 500,
      name: 'Atlantic Shark',
    });

    this.waterSurface = waterSurface;
    this.baseY = waterSurface + depthUnderwater;
    this.patrolMinX = patrolMinX;
    this.patrolMaxX = patrolMaxX;
    this.direction = Math.random() > 0.5 ? 1 : -1;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(48);

    this.drawShark();
  }

  private calculateDepthTint(): number {
    const maxDepth = 150;
    const depth = this.y - this.waterSurface;
    return Math.min(1, Math.max(0, depth / maxDepth));
  }

  private drawShark(): void {
    if (!this.graphics) {
      this.graphics = this.scene.add.graphics();
      this.graphics.setDepth(20);
    }
    this.graphics.clear();
    this.graphics.setPosition(this.x, this.y);
    this.graphics.setRotation(this.rotation);

    const isFlipped = this.direction === -1;

    const depthTint = this.state === 'dead' ? 0 : this.calculateDepthTint();
    const alpha = 1 - depthTint * 0.4;

    const bodyColorShallow = this.state === 'dead' ? 0x6a7a8a : 0x4a6080;
    const bodyColorDeep = 0x3a4a5a;
    const bellyColorShallow = 0xc8d8e8;
    const bellyColorDeep = 0x607080;

    const bodyColor = lerpColor(bodyColorShallow, bodyColorDeep, depthTint);
    const bellyColor = lerpColor(bellyColorShallow, bellyColorDeep, depthTint);
    const finColor = lerpColor(0x3a5070, 0x2a3a4a, depthTint);

    this.graphics.setScale(isFlipped ? -1 : 1, 1);

    const tailSwing = Math.sin(this.tailAngle) * 8;

    // TAIL FIN
    this.graphics.fillStyle(finColor, alpha);
    this.graphics.beginPath();
    this.graphics.moveTo(-26, -3);
    this.graphics.lineTo(-50 + tailSwing, -16);
    this.graphics.lineTo(-30 + tailSwing * 0.2, 0);
    this.graphics.lineTo(-48 + tailSwing, 13);
    this.graphics.lineTo(-26, 3);
    this.graphics.closePath();
    this.graphics.fillPath();

    // MAIN BODY
    this.graphics.fillStyle(bodyColor, alpha);
    this.graphics.beginPath();
    this.graphics.moveTo(-32, 0);
    this.graphics.lineTo(-25, -5);
    this.graphics.lineTo(-15, -8);
    this.graphics.lineTo(-8, -9);
    this.graphics.lineTo(-5, -9);
    this.graphics.lineTo(5, -8);
    this.graphics.lineTo(18, -6);
    this.graphics.lineTo(28, -4);
    this.graphics.lineTo(38, -1);
    this.graphics.lineTo(42, 0);
    this.graphics.lineTo(38, 2);
    this.graphics.lineTo(28, 5);
    this.graphics.lineTo(15, 8);
    this.graphics.lineTo(0, 9);
    this.graphics.lineTo(-12, 7);
    this.graphics.lineTo(-22, 5);
    this.graphics.lineTo(-28, 2);
    this.graphics.lineTo(-32, 0);
    this.graphics.closePath();
    this.graphics.fillPath();

    // BELLY HIGHLIGHT
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

    // DORSAL FIN
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

    // PECTORAL FIN
    this.graphics.beginPath();
    this.graphics.moveTo(8, 7);
    this.graphics.lineTo(4, 12);
    this.graphics.lineTo(6, 16);
    this.graphics.lineTo(14, 14);
    this.graphics.lineTo(20, 10);
    this.graphics.lineTo(16, 8);
    this.graphics.closePath();
    this.graphics.fillPath();

    // SMALL REAR FINS
    this.graphics.beginPath();
    this.graphics.moveTo(-16, 6);
    this.graphics.lineTo(-18, 10);
    this.graphics.lineTo(-22, 9);
    this.graphics.lineTo(-18, 6);
    this.graphics.closePath();
    this.graphics.fillPath();

    this.graphics.beginPath();
    this.graphics.moveTo(-18, -7);
    this.graphics.lineTo(-16, -11);
    this.graphics.lineTo(-14, -7);
    this.graphics.closePath();
    this.graphics.fillPath();

    // EYE
    if (this.state === 'dead') {
      this.graphics.lineStyle(2, 0xff0000, alpha);
      this.graphics.beginPath();
      this.graphics.moveTo(26, -4);
      this.graphics.lineTo(30, 0);
      this.graphics.moveTo(30, -4);
      this.graphics.lineTo(26, 0);
      this.graphics.strokePath();
    } else {
      this.graphics.fillStyle(0x000000, alpha);
      this.graphics.fillCircle(28, -2, 2.5);
      this.graphics.fillStyle(0xffffff, alpha * 0.7);
      this.graphics.fillCircle(29, -3, 1);
    }

    // GILL SLITS
    const gillColor = lerpColor(0x2a4060, 0x1a2a3a, depthTint);
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

    this.updatePollutionState(pollutionLevel);

    const tailSpeed = this.state === 'alive' ? 0.15 : 0.05;
    this.tailAngle += tailSpeed;

    if (this.state === 'dead') {
      this.floatToSurface();
    } else {
      this.findNearestFood(foodTargets);

      const moveSpeed = this.state === 'coughing' ? this.speed * 0.5 : this.speed;
      const chaseSpeed = moveSpeed * 1.3;

      if (this.targetFood) {
        const dx = this.targetFood.x - this.x;
        const dy = this.targetFood.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
          this.direction = dx > 0 ? 1 : -1;
          this.x += (dx / dist) * chaseSpeed;
          this.y += (dy / dist) * chaseSpeed * 0.5;
        }
      } else {
        this.x += moveSpeed * this.direction;

        if (this.x <= this.patrolMinX) {
          this.direction = 1;
        } else if (this.x >= this.patrolMaxX) {
          this.direction = -1;
        }

        const verticalOffset = Math.sin(waveOffset * 0.5 + this.x * 0.01) * 5;
        this.y = this.baseY + verticalOffset;
      }

      if (this.state === 'coughing') {
        this.coughTimer++;
        if (this.coughTimer % 60 === 0) {
          this.spawnCoughBubbles();
        }
      }
    }

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
    const targetY = this.waterSurface + 5;

    this.floatProgress = Math.min(1, this.floatProgress + 0.01);
    this.y = Phaser.Math.Linear(this.baseY, targetY, this.floatProgress);
    this.rotation = Phaser.Math.Linear(0, Math.PI, this.floatProgress);

    if (this.floatProgress >= 1) {
      this.y = targetY + Math.sin(Date.now() * 0.002) * 3;

      if (!this.reachedSurface) {
        this.reachedSurface = true;
        this.surfaceTimer = 0;
      }

      this.surfaceTimer++;

      if (this.surfaceTimer > 600) {
        this.fumeTimer++;
        if (this.fumeTimer % 10 === 0) {
          this.spawnFumes();
        }
      }
    }
  }

  private spawnFumes(): void {
    createSmokePuffs(this.scene, this.x, this.y - 5, {
      colors: [0x90a040, 0xa0b030, 0x80a020, 0xb0c040],
      minCount: 2,
      maxCountVariation: 3,
      spawnSpreadX: 50,
      depth: 52
    });
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
    const mouthX = this.x + 35 * this.direction;
    createBubbles(this.scene, mouthX, this.y, {
      color: 0xadd8e6,
      count: 5,
      minRadius: 2,
      maxRadius: 5,
      depth: 49
    });
  }

  canEatBomb(): boolean {
    return this.state === 'alive' || this.state === 'coughing';
  }

  eatBomb(): void {
    // Track food eaten
    this.foodEaten++;

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

    this.scene.time.delayedCall(400, () => {
      if (!this.isDestroyed) {
        this.spawnBurpBubbles();

        // Check if shark ate too much and dies
        if (this.foodEaten >= this.FATAL_FOOD_COUNT && this.state !== 'dead') {
          this.dieFromOvereating();
        }
      }
    });
  }

  /**
   * Shark dies from eating too much food
   */
  private dieFromOvereating(): void {
    this.state = 'dead';
    this.floatProgress = 0;
  }

  private spawnBurpBubbles(): void {
    const mouthX = this.x + 35 * this.direction;
    createBubbles(this.scene, mouthX, this.y, {
      color: 0x90ee90,
      count: 8,
      minRadius: 3,
      maxRadius: 7,
      alpha: 0.7,
      depth: 49,
      minRiseDistance: 60,
      maxHorizontalDrift: 30,
      minDuration: 1000
    });
  }

  getEatingBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - 60,
      y: this.y - 30,
      width: 120,
      height: 60,
    };
  }

  explode(): SharkExplosionResult {
    if (this.isDestroyed) {
      return { name: this.sharkName, points: 0, wasDead: this.state === 'dead' };
    }

    const wasDead = this.state === 'dead';
    this.isDestroyed = true;

    this.onExplode();
    this.graphics.setVisible(false);

    return { name: this.sharkName, points: this.pointValue, wasDead };
  }

  protected onExplode(): void {
    const scene = this.scene;
    const x = this.x;
    const y = this.y;

    // Blood splash effect
    const splash = scene.add.graphics();
    splash.fillStyle(0x8b0000, 0.7);
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
  }

  destroy(fromScene?: boolean): void {
    this.graphics.destroy();
    super.destroy(fromScene);
  }
}
