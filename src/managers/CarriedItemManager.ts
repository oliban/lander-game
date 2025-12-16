import Phaser from 'phaser';
import { Shuttle } from '../objects/Shuttle';
import { GreenlandIce } from '../objects/GreenlandIce';

export interface CarriedItemCallbacks {
  getGameMode: () => string;
}

export class CarriedItemManager {
  private scene: Phaser.Scene;
  private callbacks: CarriedItemCallbacks;

  // Peace Medal state
  private hasPeaceMedal: boolean = false;
  private peaceMedalGraphics: Phaser.GameObjects.Graphics | null = null;
  private medalCarrier: Shuttle | null = null;
  private medalAngle: number = 0;
  private medalAngularVelocity: number = 0;
  private lastShuttleVelX: number = 0;
  private lastShuttleVelY: number = 0;

  // Greenland Ice state
  private hasGreenlandIce: boolean = false;
  private greenlandIceGraphics: Phaser.GameObjects.Graphics | null = null;
  private iceCarrier: Shuttle | null = null;
  private iceAngle: number = 0;
  private iceAngularVelocity: number = 0;
  private lastIceVelX: number = 0;
  private lastIceVelY: number = 0;

  constructor(scene: Phaser.Scene, callbacks: CarriedItemCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  initialize(): void {
    // Reset peace medal state
    this.hasPeaceMedal = false;
    this.peaceMedalGraphics = null;
    this.medalCarrier = null;
    this.medalAngle = 0;
    this.medalAngularVelocity = 0;
    this.lastShuttleVelX = 0;
    this.lastShuttleVelY = 0;

    // Reset Greenland ice state
    this.hasGreenlandIce = false;
    this.greenlandIceGraphics = null;
    this.iceCarrier = null;
    this.iceAngle = 0;
    this.iceAngularVelocity = 0;
    this.lastIceVelX = 0;
    this.lastIceVelY = 0;
  }

  // ============ PEACE MEDAL ============

  pickupPeaceMedal(shuttle: Shuttle, showMessage: boolean = true, messageDelay: number = 0): void {
    if (this.hasPeaceMedal) return; // Already have medal

    this.hasPeaceMedal = true;
    this.medalCarrier = shuttle;
    this.medalAngle = 0;
    this.medalAngularVelocity = 0;
    this.lastShuttleVelX = 0;
    this.lastShuttleVelY = 0;

    // Make shuttle heavier
    shuttle.setMass(8);

    // Create graphics object for the peace medal
    this.peaceMedalGraphics = this.scene.add.graphics();
    this.peaceMedalGraphics.setDepth(50);

    // Show pickup message
    if (showMessage) {
      const showText = () => {
        const medalText = this.scene.add.text(shuttle.x, shuttle.y - 80, 'PEACE MEDAL ACQUIRED!', {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '20px',
          color: '#FFD700',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3,
        });
        medalText.setOrigin(0.5, 0.5);
        medalText.setDepth(100);

        this.scene.tweens.add({
          targets: medalText,
          y: medalText.y - 50,
          alpha: 0,
          duration: 2000,
          onComplete: () => medalText.destroy(),
        });
      };

      if (messageDelay > 0) {
        this.scene.time.delayedCall(messageDelay, showText);
      } else {
        showText();
      }
    }
  }

  getHasPeaceMedal(): boolean {
    return this.hasPeaceMedal;
  }

  getMedalCarrier(): Shuttle | null {
    return this.medalCarrier;
  }

  getPeaceMedalGraphics(): Phaser.GameObjects.Graphics | null {
    return this.peaceMedalGraphics;
  }

  private updateMedalPhysics(): void {
    if (!this.hasPeaceMedal || !this.medalCarrier) return;

    const carrier = this.medalCarrier;
    const velocity = carrier.getVelocity();
    const shuttleRotation = carrier.rotation;

    // Calculate shuttle acceleration (change in velocity per frame)
    const accelX = velocity.x - this.lastShuttleVelX;
    const accelY = velocity.y - this.lastShuttleVelY;

    this.lastShuttleVelX = velocity.x;
    this.lastShuttleVelY = velocity.y;

    // Pendulum physics constants
    const wireLength = 45;
    const gravity = 0.5;
    const damping = 0.97;

    // EFFECTIVE GRAVITY: real gravity minus shuttle acceleration
    const effectiveGravityX = -accelX;
    const effectiveGravityY = gravity - accelY;

    // Calculate effective gravity magnitude and direction
    const effGravMagnitude = Math.sqrt(effectiveGravityX * effectiveGravityX + effectiveGravityY * effectiveGravityY);
    const effGravAngle = Math.atan2(effectiveGravityX, effectiveGravityY);

    // Medal's world angle = shuttle rotation + local medal angle
    const medalWorldAngle = shuttleRotation + this.medalAngle;

    // Angle between medal and effective "down" direction
    const angleFromEffectiveDown = medalWorldAngle - effGravAngle;

    // Restoring torque: stronger when effective gravity is higher
    const restoreFactor = effGravMagnitude / wireLength;
    const gravityTorque = -restoreFactor * Math.sin(angleFromEffectiveDown);

    // Shuttle rotation imparts momentum to medal through the wire
    const shuttleAngularVel = (carrier.body as MatterJS.BodyType).angularVelocity;
    const rotationTorque = -shuttleAngularVel * 0.8;

    // Update angular velocity
    this.medalAngularVelocity += gravityTorque + rotationTorque;
    this.medalAngularVelocity *= damping;
    this.medalAngle += this.medalAngularVelocity;

    // Soft clamp - bounce back at extreme angles
    const maxAngle = Math.PI * 0.6;
    if (Math.abs(this.medalAngle) > maxAngle) {
      this.medalAngle = Math.sign(this.medalAngle) * maxAngle;
      this.medalAngularVelocity *= -0.3;
    }
  }

  updatePeaceMedalGraphics(): void {
    if (!this.hasPeaceMedal || !this.medalCarrier) return;

    // Update physics first
    this.updateMedalPhysics();

    // Reuse graphics object - just clear it each frame
    if (!this.peaceMedalGraphics) {
      this.peaceMedalGraphics = this.scene.add.graphics();
      this.peaceMedalGraphics.setDepth(100);
    }
    this.peaceMedalGraphics.clear();

    const carrier = this.medalCarrier;
    const shuttleX = carrier.x;
    const shuttleY = carrier.y;
    const shuttleRotation = carrier.rotation;

    // Attachment point at bottom of shuttle
    const attachOffsetY = 18;
    const attachX = shuttleX + Math.sin(shuttleRotation) * attachOffsetY;
    const attachY = shuttleY + Math.cos(shuttleRotation) * attachOffsetY;

    const wireLength = 45;

    // Medal position: hanging from attachment point at the pendulum angle
    const medalX = attachX + Math.sin(this.medalAngle) * wireLength;
    const medalY = attachY + Math.cos(this.medalAngle) * wireLength;

    // Draw wires (two wires from shuttle bottom to medal top)
    this.peaceMedalGraphics.lineStyle(2, 0x555555, 1);

    // Calculate wire attachment points on shuttle (spread apart)
    const wireSpread = 6;
    const leftAttachX = attachX - wireSpread * Math.cos(shuttleRotation);
    const leftAttachY = attachY + wireSpread * Math.sin(shuttleRotation);
    const rightAttachX = attachX + wireSpread * Math.cos(shuttleRotation);
    const rightAttachY = attachY - wireSpread * Math.sin(shuttleRotation);

    // Wire endpoints on medal
    const medalTopY = medalY - 12;

    // Left wire
    this.peaceMedalGraphics.lineBetween(leftAttachX, leftAttachY, medalX - 4, medalTopY);
    // Right wire
    this.peaceMedalGraphics.lineBetween(rightAttachX, rightAttachY, medalX + 4, medalTopY);

    // Draw ribbon (always vertical in world space, slight tilt with swing)
    this.peaceMedalGraphics.fillStyle(0x0000AA, 1);
    const ribbonTilt = this.medalAngle * 0.3;
    const ribbonWidth = 8;
    const ribbonHeight = 16;
    const rx = medalX;
    const ry = medalY - 6;

    // Draw ribbon as polygon
    this.peaceMedalGraphics.beginPath();
    this.peaceMedalGraphics.moveTo(
      rx - ribbonWidth / 2 * Math.cos(ribbonTilt),
      ry - ribbonHeight - ribbonWidth / 2 * Math.sin(ribbonTilt)
    );
    this.peaceMedalGraphics.lineTo(
      rx + ribbonWidth / 2 * Math.cos(ribbonTilt),
      ry - ribbonHeight + ribbonWidth / 2 * Math.sin(ribbonTilt)
    );
    this.peaceMedalGraphics.lineTo(
      rx + ribbonWidth / 2 * Math.cos(ribbonTilt),
      ry + ribbonWidth / 2 * Math.sin(ribbonTilt)
    );
    this.peaceMedalGraphics.lineTo(
      rx - ribbonWidth / 2 * Math.cos(ribbonTilt),
      ry - ribbonWidth / 2 * Math.sin(ribbonTilt)
    );
    this.peaceMedalGraphics.closePath();
    this.peaceMedalGraphics.fillPath();

    // Draw medal (gold circle)
    this.peaceMedalGraphics.fillStyle(0xFFD700, 1);
    this.peaceMedalGraphics.fillCircle(medalX, medalY, 14);
    this.peaceMedalGraphics.lineStyle(3, 0xB8860B, 1);
    this.peaceMedalGraphics.strokeCircle(medalX, medalY, 14);

    // Inner ring
    this.peaceMedalGraphics.lineStyle(1, 0xDAA520, 1);
    this.peaceMedalGraphics.strokeCircle(medalX, medalY, 10);

    // Peace dove in center (simplified)
    this.peaceMedalGraphics.fillStyle(0xFFFFFF, 1);
    // Dove body
    this.peaceMedalGraphics.fillEllipse(medalX, medalY, 8, 5);
    // Dove wing
    this.peaceMedalGraphics.fillTriangle(
      medalX - 2, medalY,
      medalX + 4, medalY - 4,
      medalX + 4, medalY + 1
    );
    // Dove head
    this.peaceMedalGraphics.fillCircle(medalX - 4, medalY - 1, 2);
  }

  // Called when shuttle with medal sinks
  sinkMedalWithShuttle(targetShuttle: Shuttle, waterLevel: number): void {
    if (this.hasPeaceMedal && this.peaceMedalGraphics && this.medalCarrier === targetShuttle) {
      this.scene.tweens.add({
        targets: this.peaceMedalGraphics,
        y: waterLevel + 200,
        alpha: 0,
        duration: 3000,
        ease: 'Quad.easeIn',
      });
    }
  }

  dropPeaceMedal(): void {
    this.hasPeaceMedal = false;
    if (this.medalCarrier) {
      this.medalCarrier.setMass(5); // Reset to normal mass
    }
    this.medalCarrier = null;
    this.peaceMedalGraphics?.destroy();
    this.peaceMedalGraphics = null;
  }

  // ============ GREENLAND ICE ============

  checkGreenlandIcePickup(shuttle: Shuttle, greenlandIce: GreenlandIce | null): void {
    // Don't pick up if already have ice OR if carrying Peace Medal OR in dogfight mode
    if (!greenlandIce) return;
    if (this.hasGreenlandIce) return;
    if (this.hasPeaceMedal) return;
    if (this.callbacks.getGameMode() === 'dogfight') return;
    if (greenlandIce.isDestroyed) return;
    if (!shuttle || !shuttle.active) return;

    // Check distance to the iceberg center
    const dist = Phaser.Math.Distance.Between(
      shuttle.x, shuttle.y,
      greenlandIce.x, greenlandIce.y - 40
    );

    // Pickup range: 25px (must fly close to ice)
    if (dist < 25) {
      this.pickupGreenlandIce(shuttle, greenlandIce);
    }
  }

  private pickupGreenlandIce(shuttle: Shuttle, greenlandIce: GreenlandIce): void {
    this.hasGreenlandIce = true;
    this.iceCarrier = shuttle;
    this.iceAngle = 0;
    this.iceAngularVelocity = 0;
    this.lastIceVelX = 0;
    this.lastIceVelY = 0;

    // Make shuttle heavier (more than medal: 8 -> 10)
    shuttle.setMass(10);

    // Hide the floating ice
    greenlandIce.attach();

    // Create hanging ice graphics
    this.greenlandIceGraphics = this.scene.add.graphics();
    this.greenlandIceGraphics.setDepth(50);

    // Show pickup message
    const pickupText = this.scene.add.text(shuttle.x, shuttle.y - 80, 'GREENLAND ACQUIRED!', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '20px',
      color: '#87CEEB',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    pickupText.setOrigin(0.5, 0.5);
    pickupText.setDepth(100);

    this.scene.tweens.add({
      targets: pickupText,
      y: pickupText.y - 50,
      alpha: 0,
      duration: 2000,
      onComplete: () => pickupText.destroy(),
    });
  }

  getHasGreenlandIce(): boolean {
    return this.hasGreenlandIce;
  }

  getIceCarrier(): Shuttle | null {
    return this.iceCarrier;
  }

  getGreenlandIceGraphics(): Phaser.GameObjects.Graphics | null {
    return this.greenlandIceGraphics;
  }

  private updateGreenlandIcePhysics(): void {
    if (!this.hasGreenlandIce || !this.iceCarrier) return;

    const carrier = this.iceCarrier;
    const velocity = carrier.getVelocity();
    const shuttleRotation = carrier.rotation;

    // Calculate shuttle acceleration
    const accelX = velocity.x - this.lastIceVelX;
    const accelY = velocity.y - this.lastIceVelY;

    this.lastIceVelX = velocity.x;
    this.lastIceVelY = velocity.y;

    // Pendulum physics constants (heavier than medal)
    const wireLength = 55;
    const gravity = 0.5;
    const damping = 0.95;

    // EFFECTIVE GRAVITY
    const effectiveGravityX = -accelX;
    const effectiveGravityY = gravity - accelY;

    const effGravMagnitude = Math.sqrt(effectiveGravityX * effectiveGravityX + effectiveGravityY * effectiveGravityY);
    const effGravAngle = Math.atan2(effectiveGravityX, effectiveGravityY);

    const iceWorldAngle = shuttleRotation + this.iceAngle;
    const angleFromEffectiveDown = iceWorldAngle - effGravAngle;

    const restoreFactor = effGravMagnitude / wireLength;
    const gravityTorque = -restoreFactor * Math.sin(angleFromEffectiveDown);

    const shuttleAngularVel = (carrier.body as MatterJS.BodyType).angularVelocity;
    const rotationTorque = -shuttleAngularVel * 0.6;

    this.iceAngularVelocity += gravityTorque + rotationTorque;
    this.iceAngularVelocity *= damping;
    this.iceAngle += this.iceAngularVelocity;

    // Soft clamp
    const maxAngle = Math.PI * 0.5;
    if (Math.abs(this.iceAngle) > maxAngle) {
      this.iceAngle = Math.sign(this.iceAngle) * maxAngle;
      this.iceAngularVelocity *= -0.2;
    }
  }

  updateGreenlandIceGraphics(): void {
    if (!this.hasGreenlandIce || !this.iceCarrier) return;

    // Update physics first
    this.updateGreenlandIcePhysics();

    // Reuse graphics object
    if (!this.greenlandIceGraphics) {
      this.greenlandIceGraphics = this.scene.add.graphics();
      this.greenlandIceGraphics.setDepth(100);
    }
    this.greenlandIceGraphics.clear();

    const carrier = this.iceCarrier;
    const shuttleX = carrier.x;
    const shuttleY = carrier.y;
    const shuttleRotation = carrier.rotation;

    // Attachment point at bottom of shuttle
    const attachOffsetY = 18;
    const attachX = shuttleX + Math.sin(shuttleRotation) * attachOffsetY;
    const attachY = shuttleY + Math.cos(shuttleRotation) * attachOffsetY;

    const wireLength = 55;

    // Ice position
    const iceX = attachX + Math.sin(this.iceAngle) * wireLength;
    const iceY = attachY + Math.cos(this.iceAngle) * wireLength;

    // Draw wires
    this.greenlandIceGraphics.lineStyle(2, 0x555555, 1);

    const wireSpread = 8;
    const leftAttachX = attachX - wireSpread * Math.cos(shuttleRotation);
    const leftAttachY = attachY + wireSpread * Math.sin(shuttleRotation);
    const rightAttachX = attachX + wireSpread * Math.cos(shuttleRotation);
    const rightAttachY = attachY - wireSpread * Math.sin(shuttleRotation);

    // Scale factor for ice
    const s = 1.5;
    const iceTopY = iceY - 45;

    // Left wire
    this.greenlandIceGraphics.lineBetween(leftAttachX, leftAttachY, iceX - 15, iceTopY);
    // Right wire
    this.greenlandIceGraphics.lineBetween(rightAttachX, rightAttachY, iceX + 15, iceTopY);

    // Draw ice block
    const iceTilt = this.iceAngle * 0.4;

    // Ice colors
    const iceMid = 0xAFEEEE;
    const iceLight = 0xE0FFFF;

    // Main ice block shape
    this.greenlandIceGraphics.fillStyle(iceMid, 1);
    this.greenlandIceGraphics.beginPath();

    // Ice block polygon (scaled 1.5x)
    const points = [
      { x: -25 * s, y: -20 * s },
      { x: -20 * s, y: -30 * s },
      { x: 0, y: -35 * s },
      { x: 15 * s, y: -25 * s },
      { x: 22 * s, y: -15 * s },
      { x: 20 * s, y: 10 * s },
      { x: -5 * s, y: 15 * s },
      { x: -22 * s, y: 8 * s },
    ];

    // Transform points for rotation and position
    const cos = Math.cos(iceTilt);
    const sin = Math.sin(iceTilt);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const rx = p.x * cos - p.y * sin + iceX;
      const ry = p.x * sin + p.y * cos + iceY;
      if (i === 0) {
        this.greenlandIceGraphics.moveTo(rx, ry);
      } else {
        this.greenlandIceGraphics.lineTo(rx, ry);
      }
    }
    this.greenlandIceGraphics.closePath();
    this.greenlandIceGraphics.fillPath();

    // Ice highlights
    this.greenlandIceGraphics.fillStyle(iceLight, 0.8);
    const highlightPoints = [
      { x: -18 * s, y: -22 * s },
      { x: -5 * s, y: -30 * s },
      { x: 5 * s, y: -25 * s },
      { x: -5 * s, y: -18 * s },
    ];
    this.greenlandIceGraphics.beginPath();
    for (let i = 0; i < highlightPoints.length; i++) {
      const p = highlightPoints[i];
      const rx = p.x * cos - p.y * sin + iceX;
      const ry = p.x * sin + p.y * cos + iceY;
      if (i === 0) {
        this.greenlandIceGraphics.moveTo(rx, ry);
      } else {
        this.greenlandIceGraphics.lineTo(rx, ry);
      }
    }
    this.greenlandIceGraphics.closePath();
    this.greenlandIceGraphics.fillPath();

    // White shine spots
    this.greenlandIceGraphics.fillStyle(0xFFFFFF, 0.7);
    const shineX1 = -10 * s * cos - (-20 * s) * sin + iceX;
    const shineY1 = -10 * s * sin + (-20 * s) * cos + iceY;
    this.greenlandIceGraphics.fillCircle(shineX1, shineY1, 4);
  }

  dropGreenlandIce(): void {
    this.hasGreenlandIce = false;
    if (this.iceCarrier) {
      this.iceCarrier.setMass(5); // Reset to normal mass
    }
    this.iceCarrier = null;
    this.greenlandIceGraphics?.destroy();
    this.greenlandIceGraphics = null;
  }

  // Called when shuttle with ice crashes/sinks
  destroyCarriedIceGraphics(): void {
    this.greenlandIceGraphics?.destroy();
    this.greenlandIceGraphics = null;
  }

  // Cleanup
  destroy(): void {
    this.peaceMedalGraphics?.destroy();
    this.peaceMedalGraphics = null;
    this.greenlandIceGraphics?.destroy();
    this.greenlandIceGraphics = null;
  }
}
