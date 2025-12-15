import Phaser from 'phaser';
import { Shuttle } from '../objects/Shuttle';

export interface PowerUpCallbacks {
  getShuttle: () => Shuttle;
  getShuttle2: () => Shuttle | null;
  getTimeNow: () => number;
  flashCamera: (duration: number, r: number, g: number, b: number) => void;
}

export class PowerUpManager {
  private scene: Phaser.Scene;
  private callbacks: PowerUpCallbacks;

  // Power-up states
  private cannonsBribed: boolean = false;
  private bribeEndTime: number = 0;
  private _hasSpeedBoost: boolean = false;
  private speedBoostEndTime: number = 0;
  private speedBoostPlayer: number = 1; // Which player has the speed boost
  private bribeGraphics: Phaser.GameObjects.Graphics | null = null;
  private speedBoostTrail: Phaser.GameObjects.Graphics | null = null;
  private tieSegments: { x: number; y: number }[] = []; // For floppy tie physics

  constructor(scene: Phaser.Scene, callbacks: PowerUpCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  initialize(): void {
    this.cannonsBribed = false;
    this.bribeEndTime = 0;
    this._hasSpeedBoost = false;
    this.speedBoostEndTime = 0;
    this.speedBoostPlayer = 1;
    this.bribeGraphics = null;
    this.speedBoostTrail = null;
    this.tieSegments = [];
  }

  update(): void {
    const now = this.callbacks.getTimeNow();
    const shuttle = this.callbacks.getShuttle();

    // Update bribe effect - subtle green outline when cannons are standing down
    if (this.cannonsBribed) {
      if (now >= this.bribeEndTime) {
        this.cannonsBribed = false;
        if (this.bribeGraphics) {
          this.bribeGraphics.clear();
        }
      } else {
        // Draw subtle glow outline around shuttle
        if (this.bribeGraphics) {
          this.bribeGraphics.destroy();
          this.bribeGraphics = this.scene.add.graphics();
          const timeLeft = this.bribeEndTime - now;
          const pulseSpeed = timeLeft < 2000 ? 0.015 : 0.006;
          const baseAlpha = timeLeft < 2000 ? 0.3 : 0.5;
          const alpha = baseAlpha + Math.sin(now * pulseSpeed) * 0.15;

          // Simple thin green outline around shuttle
          this.bribeGraphics.lineStyle(2, 0x32CD32, alpha);
          this.bribeGraphics.strokeCircle(shuttle.x, shuttle.y, 32 + Math.sin(now * 0.008) * 2);
        }
      }
    }

    // Update speed boost
    if (this._hasSpeedBoost) {
      const shuttle2 = this.callbacks.getShuttle2();
      const boostShuttle = this.speedBoostPlayer === 2 && shuttle2 ? shuttle2 : shuttle;
      if (now >= this.speedBoostEndTime) {
        this._hasSpeedBoost = false;
        boostShuttle.setThrustMultiplier(1.0);
        if (this.speedBoostTrail) {
          this.speedBoostTrail.clear();
        }
        this.tieSegments = [];
      } else {
        // Update and draw floppy red tie
        if (this.speedBoostTrail && this.tieSegments.length > 0) {
          this.speedBoostTrail.destroy();
          this.speedBoostTrail = this.scene.add.graphics();
          const timeLeft = this.speedBoostEndTime - now;
          const alpha = timeLeft < 2000 ? (Math.sin(now * 0.02) * 0.3 + 0.5) : 0.9;

          // Tie attaches to bottom of shuttle
          const attachX = boostShuttle.x;
          const attachY = boostShuttle.y + 15;

          // Update tie physics - each segment follows the one before it
          // First segment follows the shuttle
          this.tieSegments[0].x += (attachX - this.tieSegments[0].x) * 0.4;
          this.tieSegments[0].y += (attachY - this.tieSegments[0].y) * 0.4;

          // Each subsequent segment follows the previous one with some lag and gravity
          for (let i = 1; i < this.tieSegments.length; i++) {
            const prev = this.tieSegments[i - 1];
            const curr = this.tieSegments[i];

            // Follow previous segment
            const followStrength = 0.25;
            curr.x += (prev.x - curr.x) * followStrength;
            curr.y += (prev.y - curr.y) * followStrength;

            // Add gravity
            curr.y += 0.8;

            // Add some wind/flutter based on shuttle velocity
            const vel = boostShuttle.getVelocity();
            curr.x -= vel.x * 0.05;
            curr.y -= vel.y * 0.03;

            // Add flutter/wave motion
            const flutter = Math.sin(now * 0.015 + i * 0.8) * (2 + i * 0.5);
            curr.x += flutter;

            // Constrain distance from previous segment
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 8;
            if (dist > maxDist) {
              const scale = maxDist / dist;
              curr.x = prev.x + dx * scale;
              curr.y = prev.y + dy * scale;
            }
          }

          // Draw the tie
          // Tie knot at top (small triangle)
          this.speedBoostTrail.fillStyle(0xAA0000, alpha);
          this.speedBoostTrail.fillTriangle(
            this.tieSegments[0].x - 4, this.tieSegments[0].y,
            this.tieSegments[0].x + 4, this.tieSegments[0].y,
            this.tieSegments[0].x, this.tieSegments[0].y + 6
          );

          // Main tie body - draw as connected trapezoids that get wider then narrower
          for (let i = 0; i < this.tieSegments.length - 1; i++) {
            const curr = this.tieSegments[i];
            const next = this.tieSegments[i + 1];

            // Tie width: starts narrow, gets wider in middle, narrows at tip
            const widthCurve = Math.sin((i / (this.tieSegments.length - 1)) * Math.PI);
            const widthTop = 3 + widthCurve * 6;
            const widthCurveNext = Math.sin(((i + 1) / (this.tieSegments.length - 1)) * Math.PI);
            const widthBottom = 3 + widthCurveNext * 6;

            // Calculate perpendicular direction for width
            const dx = next.x - curr.x;
            const dy = next.y - curr.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const perpX = -dy / len;
            const perpY = dx / len;

            // Draw tie segment as quadrilateral
            this.speedBoostTrail.fillStyle(0xDC143C, alpha);
            this.speedBoostTrail.beginPath();
            this.speedBoostTrail.moveTo(curr.x + perpX * widthTop, curr.y + perpY * widthTop);
            this.speedBoostTrail.lineTo(curr.x - perpX * widthTop, curr.y - perpY * widthTop);
            this.speedBoostTrail.lineTo(next.x - perpX * widthBottom, next.y - perpY * widthBottom);
            this.speedBoostTrail.lineTo(next.x + perpX * widthBottom, next.y + perpY * widthBottom);
            this.speedBoostTrail.closePath();
            this.speedBoostTrail.fillPath();

            // Dark red stripe down the center for detail
            this.speedBoostTrail.lineStyle(2, 0x8B0000, alpha * 0.7);
            this.speedBoostTrail.lineBetween(curr.x, curr.y, next.x, next.y);
          }

          // Tie tip (pointed end)
          const lastSeg = this.tieSegments[this.tieSegments.length - 1];
          const secondLast = this.tieSegments[this.tieSegments.length - 2];
          const tipDx = lastSeg.x - secondLast.x;
          const tipDy = lastSeg.y - secondLast.y;
          const tipLen = Math.sqrt(tipDx * tipDx + tipDy * tipDy) || 1;
          this.speedBoostTrail.fillStyle(0xDC143C, alpha);
          this.speedBoostTrail.fillTriangle(
            lastSeg.x - 3, lastSeg.y,
            lastSeg.x + 3, lastSeg.y,
            lastSeg.x + (tipDx / tipLen) * 8, lastSeg.y + (tipDy / tipLen) * 8
          );

          // Also draw speed trail behind shuttle
          const vel = shuttle.getVelocity();
          if (Math.abs(vel.x) > 1 || Math.abs(vel.y) > 1) {
            for (let i = 0; i < 5; i++) {
              const offsetX = -vel.x * (i * 3) + (Math.random() - 0.5) * 10;
              const offsetY = -vel.y * (i * 3) + (Math.random() - 0.5) * 10;
              this.speedBoostTrail.fillStyle(0xDC143C, alpha * 0.5 * (1 - i * 0.15));
              this.speedBoostTrail.fillCircle(shuttle.x + offsetX, shuttle.y + offsetY, 5 - i);
            }
          }
        }
      }
    }
  }

  activateBribeCannons(): void {
    const duration = 10000; // 10 seconds of bribed cannons
    const shuttle = this.callbacks.getShuttle();

    this.cannonsBribed = true;
    this.bribeEndTime = this.callbacks.getTimeNow() + duration;

    // Sound is played by playPickupSound()

    // Create bribe graphics (dollar signs floating)
    if (!this.bribeGraphics) {
      this.bribeGraphics = this.scene.add.graphics();
      this.bribeGraphics.setDepth(100);
    }

    // Show "CANNONS BRIBED!" text floating
    const bribeText = this.scene.add.text(shuttle.x, shuttle.y - 60, 'CANNONS BRIBED!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '22px',
      color: '#228B22',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    bribeText.setOrigin(0.5, 0.5);

    // Second line - the joke
    const subText = this.scene.add.text(shuttle.x, shuttle.y - 35, '"The art of the deal!"', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#FFD700',
      fontStyle: 'italic',
      stroke: '#000000',
      strokeThickness: 2,
    });
    subText.setOrigin(0.5, 0.5);

    this.scene.tweens.add({
      targets: [bribeText, subText],
      y: '-=50',
      alpha: 0,
      duration: 2500,
      onComplete: () => {
        bribeText.destroy();
        subText.destroy();
      },
    });

    // Make dollar signs rain from top
    for (let i = 0; i < 20; i++) {
      this.scene.time.delayedCall(i * 100, () => {
        const dollarSign = this.scene.add.text(
          shuttle.x + (Math.random() - 0.5) * 200,
          shuttle.y - 100,
          '$',
          {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '24px',
            color: '#228B22',
            fontStyle: 'bold',
          }
        );
        dollarSign.setOrigin(0.5, 0.5);

        this.scene.tweens.add({
          targets: dollarSign,
          y: dollarSign.y + 150,
          alpha: 0,
          angle: Math.random() * 360,
          duration: 1000,
          onComplete: () => dollarSign.destroy(),
        });
      });
    }

    // Flash effect (green for money)
    this.callbacks.flashCamera(300, 34, 139, 34);
  }

  activateSpeedBoost(playerNum: number = 1): void {
    const duration = 6000; // 6 seconds of speed boost
    const shuttle = this.callbacks.getShuttle();
    const shuttle2 = this.callbacks.getShuttle2();
    const targetShuttle = playerNum === 2 && shuttle2 ? shuttle2 : shuttle;

    this._hasSpeedBoost = true;
    this.speedBoostEndTime = this.callbacks.getTimeNow() + duration;
    this.speedBoostPlayer = playerNum; // Track which player has the boost

    // Sound is played by playPickupSound()

    // Modify shuttle thrust temporarily
    targetShuttle.setThrustMultiplier(1.8);

    // Create speed trail effect (floppy tie)
    if (!this.speedBoostTrail) {
      this.speedBoostTrail = this.scene.add.graphics();
      this.speedBoostTrail.setDepth(45);
    }

    // Initialize tie segments at shuttle position
    this.tieSegments = [];
    for (let i = 0; i < 8; i++) {
      this.tieSegments.push({ x: targetShuttle.x, y: targetShuttle.y + i * 6 });
    }

    // Show "SPEED BOOST" text
    const speedText = this.scene.add.text(targetShuttle.x, targetShuttle.y - 60, 'RED TIE POWER!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '18px',
      color: '#DC143C',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    speedText.setOrigin(0.5, 0.5);

    this.scene.tweens.add({
      targets: speedText,
      y: speedText.y - 40,
      alpha: 0,
      duration: 2000,
      onComplete: () => speedText.destroy(),
    });

    // Flash effect
    this.callbacks.flashCamera(300, 220, 20, 60);
  }

  // Getters for external access
  isCannonsBribed(): boolean {
    return this.cannonsBribed;
  }

  hasSpeedBoost(): boolean {
    return this._hasSpeedBoost;
  }

  getSpeedBoostPlayer(): number {
    return this.speedBoostPlayer;
  }

  // Cleanup
  destroy(): void {
    if (this.bribeGraphics) {
      this.bribeGraphics.destroy();
      this.bribeGraphics = null;
    }
    if (this.speedBoostTrail) {
      this.speedBoostTrail.destroy();
      this.speedBoostTrail = null;
    }
    this.tieSegments = [];
  }
}
