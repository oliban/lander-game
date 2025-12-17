import Phaser from 'phaser';
import { CANNON_FIRE_RATE, PROJECTILE_SPEED } from '../constants';
import { createExplosion } from '../utils/ExplosionUtils';
import { FlagRenderer } from '../utils/FlagRenderer';
import { PerformanceSettings } from '../systems/PerformanceSettings';

// Country-specific projectile sprite keys
// Map countries to arrays of possible projectile sprites (randomly selected when firing)
export const COUNTRY_PROJECTILES: { [key: string]: string[] } = {
  'United Kingdom': ['teacup', 'doubledecker', 'blackcab', 'guardhat'],
  'France': ['baguette', 'wine', 'croissant'],
  'Switzerland': ['cheese', 'chocolate', 'watch', 'cuckoo', 'fondue'],
  'Germany': ['pretzel', 'beer'],
  'Poland': ['pierogi', 'pottery'],
  'Russia': ['proj_matryoshka', 'balalaika', 'borscht', 'samovar'],
};

export class Cannon extends Phaser.GameObjects.Container {
  private cannonScene: Phaser.Scene;
  private base: Phaser.GameObjects.Graphics;
  private barrel: Phaser.GameObjects.Graphics;
  private flag: Phaser.GameObjects.Graphics;
  private lastFireTime: number = 0;
  private target: { x: number; y: number } | null = null;
  private projectiles: Projectile[] = [];
  private isDestroyed: boolean = false;
  private projectileSprites: string[];
  private country: string;
  private windStrength: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, country: string = '') {
    super(scene, x, y);

    this.cannonScene = scene;
    this.country = country;
    this.projectileSprites = COUNTRY_PROJECTILES[country] || ['cannonball'];

    // Create flag on flagpole (behind turret)
    this.flag = scene.add.graphics();
    this.drawCountryFlag();

    // Create base platform (concrete bunker style)
    this.base = scene.add.graphics();

    // Sandbag fortification base
    this.base.fillStyle(0x8B7355, 1); // Tan/sand color
    this.base.fillRoundedRect(-28, -8, 56, 20, 4);
    this.base.lineStyle(2, 0x6B5344);
    this.base.strokeRoundedRect(-28, -8, 56, 20, 4);

    // Sandbag texture lines
    this.base.lineStyle(1, 0x6B5344, 0.5);
    this.base.lineBetween(-24, -2, 24, -2);
    this.base.lineBetween(-24, 4, 24, 4);

    // Main turret housing (dark military gray)
    this.base.fillStyle(0x3D4A3D, 1);
    this.base.fillCircle(0, -5, 20);
    this.base.lineStyle(3, 0x2D3A2D);
    this.base.strokeCircle(0, -5, 20);

    // Turret armor plating detail
    this.base.fillStyle(0x4A5A4A, 1);
    this.base.fillCircle(0, -5, 14);
    this.base.lineStyle(2, 0x3D4A3D);
    this.base.strokeCircle(0, -5, 14);

    // Center pivot (darker)
    this.base.fillStyle(0x2D3A2D, 1);
    this.base.fillCircle(0, -5, 8);

    // Rivets/bolts on turret
    this.base.fillStyle(0x5A6A5A, 1);
    this.base.fillCircle(-12, -10, 2);
    this.base.fillCircle(12, -10, 2);
    this.base.fillCircle(-10, 2, 2);
    this.base.fillCircle(10, 2, 2);

    // Create barrel (modern artillery style)
    // Position barrel at turret center (0, -5) so it rotates correctly
    this.barrel = scene.add.graphics();
    this.barrel.setPosition(0, -5);

    // Main barrel (dark gunmetal) - coordinates relative to turret center
    this.barrel.fillStyle(0x2F2F2F, 1);
    this.barrel.fillRect(-6, -40, 12, 40);
    this.barrel.lineStyle(2, 0x1F1F1F);
    this.barrel.strokeRect(-6, -40, 12, 40);

    // Barrel reinforcement rings
    this.barrel.fillStyle(0x3A3A3A, 1);
    this.barrel.fillRect(-7, -37, 14, 4);
    this.barrel.fillRect(-7, -25, 14, 3);
    this.barrel.fillRect(-7, -13, 14, 3);

    // Muzzle brake (flash suppressor)
    this.barrel.fillStyle(0x252525, 1);
    this.barrel.fillRect(-8, -43, 16, 6);
    this.barrel.lineStyle(1, 0x1A1A1A);
    this.barrel.strokeRect(-8, -43, 16, 6);

    // Muzzle brake slots
    this.barrel.fillStyle(0x1A1A1A, 1);
    this.barrel.fillRect(-6, -42, 3, 4);
    this.barrel.fillRect(3, -42, 3, 4);

    // Barrel highlight (subtle shine)
    this.barrel.fillStyle(0x4A4A4A, 0.4);
    this.barrel.fillRect(-4, -35, 2, 30);

    this.add([this.flag, this.base, this.barrel]);
    scene.add.existing(this);
  }

  private drawCountryFlag(): void {
    // Clear previous flag drawing
    this.flag.clear();

    const poleX = 35; // Flagpole position
    const poleHeight = 50;
    const baseWidth = 24;
    const flagHeight = 16;

    // Flagpole
    this.flag.lineStyle(3, 0x666666);
    this.flag.lineBetween(poleX, -poleHeight, poleX, 5);

    // Pole top ball
    this.flag.fillStyle(0x888888, 1);
    this.flag.fillCircle(poleX, -poleHeight, 3);

    // Flag Y position (top of flag)
    const fy = -poleHeight + 5;

    // Use FlagRenderer to draw wind-affected flag
    FlagRenderer.drawWindFlag(this.flag, this.country, poleX, fy, baseWidth, flagHeight, this.windStrength);
  }

  setTarget(target: { x: number; y: number }): void {
    this.target = target;
  }

  update(time: number, windStrength: number = 0): void {
    // Update wind and redraw flag if wind changed significantly
    // Skip flag animation if disabled for performance
    if (PerformanceSettings.getPreset().flagAnimations && Math.abs(windStrength - this.windStrength) > 0.05) {
      this.windStrength = windStrength;
      this.drawCountryFlag();
    }

    // Always update existing projectiles, even if cannon is destroyed
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update();

      // Remove if out of bounds
      if (projectile.isOutOfBounds()) {
        projectile.destroy();
        this.projectiles.splice(i, 1);
      }
    }

    // Don't aim or fire if destroyed or no target
    if (!this.target || this.isDestroyed) return;

    // Aim at target from turret center (offset by -5 from container origin)
    const turretY = this.y - 5;
    const angle = Phaser.Math.Angle.Between(this.x, turretY, this.target.x, this.target.y);
    this.barrel.setRotation(angle + Math.PI / 2);

    // Fire at intervals
    if (time - this.lastFireTime > CANNON_FIRE_RATE) {
      this.fire(angle, turretY);
      this.lastFireTime = time;
    }
  }

  private fire(angle: number, turretY: number): void {
    // Double-check we're not destroyed before firing
    if (this.isDestroyed) return;

    // Randomly select a projectile sprite from this cannon's country options
    const spriteKey = this.projectileSprites[Math.floor(Math.random() * this.projectileSprites.length)];

    // Spawn projectile from turret center (barrel length ~40 pixels)
    const projectile = new Projectile(
      this.cannonScene,
      this.x + Math.cos(angle) * 45,
      turretY + Math.sin(angle) * 45,
      angle,
      spriteKey
    );
    this.projectiles.push(projectile);

    // Muzzle flash (more dramatic for modern artillery)
    const flash = this.cannonScene.add.graphics();
    const flashX = this.x + Math.cos(angle) * 50;
    const flashY = turretY + Math.sin(angle) * 50;

    // Outer glow
    flash.fillStyle(0xFF6600, 0.6);
    flash.fillCircle(flashX, flashY, 18);
    // Main flash
    flash.fillStyle(0xFFFF00, 0.9);
    flash.fillCircle(flashX, flashY, 12);
    // Hot center
    flash.fillStyle(0xFFFFFF, 1);
    flash.fillCircle(flashX, flashY, 6);

    // Smoke puffs
    for (let i = 0; i < 3; i++) {
      const smokeX = flashX + (Math.random() - 0.5) * 20;
      const smokeY = flashY + (Math.random() - 0.5) * 20;
      flash.fillStyle(0x888888, 0.5);
      flash.fillCircle(smokeX, smokeY, 6 + Math.random() * 4);
    }

    this.cannonScene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  getCollisionBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - 28,
      y: this.y - 25,
      width: 56,
      height: 40,
    };
  }

  isActive(): boolean {
    return !this.isDestroyed;
  }

  explode(): void {
    // Mark as destroyed immediately to stop firing
    this.isDestroyed = true;

    // Hide the cannon graphics immediately
    this.base.setVisible(false);
    this.barrel.setVisible(false);
    this.flag.setVisible(false);

    // Note: Don't destroy projectiles - let them continue flying

    // Create explosion effect (bigger and more dramatic)
    const scene = this.cannonScene;
    const x = this.x;
    const y = this.y - 5;

    // Use ExplosionUtils with custom config matching original visual appearance
    createExplosion(scene, x, y, {
      // Large explosion flash with 5 concentric circles
      flashColors: [0xFF4400, 0xFF6600, 0xFFAA00, 0xFFFF00, 0xFFFFFF],
      flashSizes: [45, 35, 25, 15, 8],
      duration: 400,
      // Flying metal debris (turret parts) in turret colors
      debrisColors: [0x3D4A3D, 0x2F2F2F, 0x8B7355, 0x4A5A4A],
      debrisCount: 8,
      debrisWidth: 10,
      debrisHeight: 6,
      minDistance: 60,
      maxDistance: 90,
      gravity: 30,
      // Smoke clouds
      includeSmoke: true,
      puffCount: 4,
      smokeColor: 0x444444,
      smokeAlpha: 0.6,
      minSize: 15,
      maxSize: 25,
      riseDistance: 40,
      // No camera shake for cannons
      shakeCamera: false,
    });
  }

  destroy(): void {
    for (const projectile of this.projectiles) {
      projectile.destroy();
    }
    this.projectiles = [];
    super.destroy();
  }
}

export class Projectile extends Phaser.GameObjects.Container {
  private projectileScene: Phaser.Scene;
  private matterBody: MatterJS.BodyType;
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private velocityX: number;
  private velocityY: number;
  private spriteKey: string;

  constructor(scene: Phaser.Scene, x: number, y: number, angle: number, spriteKey: string = 'cannonball') {
    super(scene, x, y);

    this.projectileScene = scene;
    this.spriteKey = spriteKey;
    this.velocityX = Math.cos(angle) * PROJECTILE_SPEED;
    this.velocityY = Math.sin(angle) * PROJECTILE_SPEED;

    // Try to use sprite if available, otherwise fall back to graphics
    if (scene.textures.exists(spriteKey)) {
      // Create sprite without adding to scene (make() instead of add.sprite())
      // Position at (0,0) relative to container
      this.sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, spriteKey);
      this.sprite.setScale(0.075); // Scale down the sprite (50% larger than 0.05)
      this.sprite.setRotation(angle);
      this.add(this.sprite); // Add to container which positions it correctly
    } else {
      // Fall back to graphics-based projectile (cannonball)
      this.graphics = new Phaser.GameObjects.Graphics(scene);
      this.graphics.fillStyle(0x333333, 1);
      this.graphics.fillCircle(0, 0, 7);
      this.graphics.lineStyle(2, 0x111111);
      this.graphics.strokeCircle(0, 0, 7);
      this.graphics.fillStyle(0x555555, 0.8);
      this.graphics.fillCircle(-2, -2, 3);
      this.add(this.graphics);
    }

    scene.add.existing(this);

    // Create physics body
    const matterScene = scene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
    this.matterBody = matterScene.matter.add.circle(x, y, 6, {
      label: 'projectile',
      isSensor: true,
      collisionFilter: {
        category: 4,
      },
    });

    // Store reference to this projectile on the body for collision detection
    (this.matterBody as any).projectileRef = this;
  }

  update(): void {
    // Move projectile
    this.x += this.velocityX;
    this.y += this.velocityY;

    // Update physics body position
    const matterScene = this.projectileScene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
    matterScene.matter.body.setPosition(this.matterBody, { x: this.x, y: this.y }, false);
  }

  isOutOfBounds(): boolean {
    const camera = this.projectileScene.cameras.main;

    // Only remove if very far from visible area
    // Use camera scroll position for Y bounds too (important for Switzerland mountains)
    return (
      this.y < camera.scrollY - 500 ||
      this.x < camera.scrollX - 500 ||
      this.x > camera.scrollX + camera.width + 500 ||
      this.y > camera.scrollY + camera.height + 500
    );
  }

  getBody(): MatterJS.BodyType {
    return this.matterBody;
  }

  getSpriteKey(): string {
    return this.spriteKey;
  }

  destroy(): void {
    const matterScene = this.projectileScene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
    if (matterScene?.matter?.world && this.matterBody) {
      matterScene.matter.world.remove(this.matterBody);
    }
    if (this.graphics) this.graphics.destroy();
    if (this.sprite) this.sprite.destroy();
    super.destroy();
  }
}
