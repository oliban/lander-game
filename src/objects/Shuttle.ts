import Phaser from 'phaser';
import {
  THRUST_POWER,
  ROTATION_SPEED,
  FUEL_CONSUMPTION_RATE,
  MAX_SAFE_LANDING_VELOCITY,
  MAX_SAFE_LANDING_ANGLE,
  COLORS,
} from '../constants';

// Speed reduction when landing legs are extended
const LEGS_DRAG_MULTIPLIER = 1.5;

export class Shuttle extends Phaser.Physics.Matter.Sprite {
  private thrusterParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private isThrusting: boolean = false;
  private fuelSystem: { consume: (amount: number) => boolean; isEmpty: () => boolean } | null = null;
  private legsExtended: boolean = false;
  private legsKey: Phaser.Input.Keyboard.Key | null = null;
  private debugKey: Phaser.Input.Keyboard.Key | null = null;
  private debugMode: boolean = false;
  private debugModeUsed: boolean = false; // Track if debug was ever used this game
  private debugLabel: Phaser.GameObjects.Text | null = null;
  private thrustMultiplier: number = 1.0; // For speed boost power-up

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene.matter.world, x, y, 'shuttle');

    scene.add.existing(this);

    // Configure physics body - centered on sprite
    this.setRectangle(28, 36);

    this.setFrictionAir(0.02); // Increased for heavier, more dampened feel
    this.setBounce(0.3); // Bouncy enough to survive light touches
    this.setFixedRotation();
    this.setMass(5); // Heavier mass for more inertia

    this.setOrigin(0.5, 0.5);

    // Set collision category
    this.setCollisionCategory(1);
    this.setCollidesWith([2, 3, 4]); // terrain, landing pads, projectiles

    // No glow for cartoon style

    // Create thruster particles
    this.createThrusterParticles();

    // Set up landing legs key (spacebar)
    if (scene.input.keyboard) {
      this.legsKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.debugKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }

    // Create debug label (hidden initially)
    this.debugLabel = scene.add.text(10, scene.cameras.main.height - 30, 'DEBUG MODE - Unlimited Fuel', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '14px',
      color: '#FF0000',
      backgroundColor: '#FFFF00',
      padding: { x: 5, y: 3 },
    });
    this.debugLabel.setScrollFactor(0);
    this.debugLabel.setDepth(1000);
    this.debugLabel.setVisible(false);
  }

  setFuelSystem(fuelSystem: { consume: (amount: number) => boolean; isEmpty: () => boolean }): void {
    this.fuelSystem = fuelSystem;
  }

  private createThrusterParticles(): void {
    this.thrusterParticles = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 100, max: 200 },
      angle: { min: 80, max: 100 },
      scale: { start: 0.5, end: 0 },
      lifespan: { min: 200, max: 400 },
      blendMode: Phaser.BlendModes.NORMAL, // Changed from ADD - was causing black screen
      frequency: 20,
      emitting: false,
      tint: [0xFF8800, 0xFFAA00, 0xFFCC00, 0xFFFFFF], // Orange/yellow flame colors
    });
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    if (!this.active) return;

    // Toggle debug mode with D key
    if (this.debugKey && Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      this.debugMode = !this.debugMode;
      if (this.debugMode) {
        this.debugModeUsed = true; // Once used, always marked
      }
      if (this.debugLabel) {
        this.debugLabel.setVisible(this.debugMode);
      }
    }

    // Check for fuel (unlimited in debug mode)
    const hasFuel = this.debugMode || !this.fuelSystem || !this.fuelSystem.isEmpty();

    // Get angular velocity from body
    const matterBody = this.body as MatterJS.BodyType;

    // Toggle landing legs with spacebar (single press)
    if (this.legsKey && Phaser.Input.Keyboard.JustDown(this.legsKey)) {
      this.toggleLandingLegs();
    }

    // Apply extra drag when legs are extended
    if (this.legsExtended) {
      // More air resistance with legs out
      const vel = matterBody.velocity;
      this.setVelocity(vel.x * 0.98, vel.y * 0.99);
    }

    // Rotation
    if (cursors.left.isDown) {
      this.setAngularVelocity(-ROTATION_SPEED);
    } else if (cursors.right.isDown) {
      this.setAngularVelocity(ROTATION_SPEED);
    } else {
      // Dampen rotation when no input
      this.setAngularVelocity(matterBody.angularVelocity * 0.95);
    }

    // Thrust - reduced effectiveness when legs are extended
    if (cursors.up.isDown && hasFuel) {
      // Consume fuel (more with legs extended) - skip in debug mode
      if (this.fuelSystem && !this.debugMode) {
        const fuelRate = this.legsExtended ? FUEL_CONSUMPTION_RATE * 1.2 : FUEL_CONSUMPTION_RATE;
        this.fuelSystem.consume(fuelRate);
      }

      // Apply thrust in direction of rotation (reduced with legs, boosted by power-up)
      const angle = this.rotation - Math.PI / 2;
      const legMultiplier = this.legsExtended ? 0.7 : 1.0;
      const totalMultiplier = legMultiplier * this.thrustMultiplier;
      const forceX = Math.cos(angle) * THRUST_POWER * totalMultiplier;
      const forceY = Math.sin(angle) * THRUST_POWER * totalMultiplier;

      this.applyForce(new Phaser.Math.Vector2(forceX, forceY));

      this.isThrusting = true;
    } else {
      this.isThrusting = false;
    }

    // Update thruster particles
    this.updateThrusterParticles();
  }

  private toggleLandingLegs(): void {
    this.legsExtended = !this.legsExtended;

    // Save current state before changing body
    const currentX = this.x;
    const currentY = this.y;
    const currentRotation = this.rotation;
    const matterBody = this.body as MatterJS.BodyType;
    const currentVelX = matterBody.velocity.x;
    const currentVelY = matterBody.velocity.y;
    const currentAngularVel = matterBody.angularVelocity;

    // Switch texture only - don't recreate physics body
    if (this.legsExtended) {
      this.setTexture('shuttle-legs');
    } else {
      this.setTexture('shuttle');
    }

    // Restore position and velocity (texture change shouldn't affect these but just to be safe)
    this.setPosition(currentX, currentY);
    this.setRotation(currentRotation);
    this.setVelocity(currentVelX, currentVelY);
    this.setAngularVelocity(currentAngularVel);
  }

  areLandingLegsExtended(): boolean {
    return this.legsExtended;
  }

  private updateThrusterParticles(): void {
    if (!this.thrusterParticles) return;

    if (this.isThrusting) {
      // Position emitter at bottom of shuttle
      const angle = this.rotation + Math.PI / 2;
      const offsetX = Math.cos(angle) * 20;
      const offsetY = Math.sin(angle) * 20;

      this.thrusterParticles.setPosition(this.x + offsetX, this.y + offsetY);
      this.thrusterParticles.particleAngle = {
        min: Phaser.Math.RadToDeg(angle) - 15,
        max: Phaser.Math.RadToDeg(angle) + 15,
      };

      if (!this.thrusterParticles.emitting) {
        this.thrusterParticles.start();
      }
    } else {
      if (this.thrusterParticles.emitting) {
        this.thrusterParticles.stop();
      }
    }
  }

  getVelocity(): { x: number; y: number; total: number } {
    const matterBody = this.body as MatterJS.BodyType;
    const vx = matterBody.velocity.x;
    const vy = matterBody.velocity.y;
    return {
      x: vx,
      y: vy,
      total: Math.sqrt(vx * vx + vy * vy),
    };
  }

  wasDebugModeUsed(): boolean {
    return this.debugModeUsed;
  }

  checkLandingSafety(): { safe: boolean; quality: 'perfect' | 'good' | 'crash'; reason?: string } {
    const velocity = this.getVelocity();
    const angle = Math.abs(Phaser.Math.Angle.Wrap(this.rotation));

    // MUST have landing legs extended to land safely
    if (!this.legsExtended) {
      return { safe: false, quality: 'crash', reason: 'Landing gear not deployed!' };
    }

    // Check angle first
    if (angle > MAX_SAFE_LANDING_ANGLE) {
      return { safe: false, quality: 'crash', reason: 'Bad angle!' };
    }

    // Check velocity - more forgiving thresholds
    if (velocity.total > MAX_SAFE_LANDING_VELOCITY * 2.0) {
      return { safe: false, quality: 'crash', reason: 'Too fast!' };
    }

    if (velocity.total <= MAX_SAFE_LANDING_VELOCITY * 0.6) {
      return { safe: true, quality: 'perfect' };
    }

    if (velocity.total <= MAX_SAFE_LANDING_VELOCITY * 1.5) {
      return { safe: true, quality: 'good' };
    }

    // Between 1.5x and 2x is still a safe but rough landing
    return { safe: true, quality: 'good' };
  }

  explode(): void {
    // Stop thruster
    this.isThrusting = false;
    if (this.thrusterParticles) {
      this.thrusterParticles.stop();
    }

    // Hide shuttle
    this.setVisible(false);
    this.setActive(false);

    // Create cartoon explosion - expanding circles
    const colors = [0xFF6600, 0xFFFF00, 0xFF0000, 0xFFFFFF];

    // Main explosion flash
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xFFFF00, 1);
    flash.fillCircle(this.x, this.y, 30);
    flash.fillStyle(0xFF6600, 1);
    flash.fillCircle(this.x, this.y, 20);
    flash.fillStyle(0xFFFFFF, 1);
    flash.fillCircle(this.x, this.y, 10);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 3,
      duration: 400,
      onComplete: () => flash.destroy(),
    });

    // Flying debris pieces
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const debris = this.scene.add.graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      debris.fillStyle(color, 1);
      debris.fillRect(-4, -4, 8, 8);
      debris.setPosition(this.x, this.y);

      this.scene.tweens.add({
        targets: debris,
        x: this.x + Math.cos(angle) * (80 + Math.random() * 40),
        y: this.y + Math.sin(angle) * (80 + Math.random() * 40) + 50,
        angle: Math.random() * 360,
        alpha: 0,
        duration: 600,
        ease: 'Power2',
        onComplete: () => debris.destroy(),
      });
    }

    // Screen shake
    this.scene.cameras.main.shake(300, 0.015);
  }

  setThrustMultiplier(multiplier: number): void {
    this.thrustMultiplier = multiplier;
  }

  stopThrusters(): void {
    this.isThrusting = false;
    if (this.thrusterParticles) {
      this.thrusterParticles.stop();
    }
  }
}
