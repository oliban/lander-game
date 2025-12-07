import Phaser from 'phaser';
import { CANNON_FIRE_RATE, PROJECTILE_SPEED } from '../constants';

// Country-specific projectile sprite keys
// Map countries to arrays of possible projectile sprites (randomly selected when firing)
export const COUNTRY_PROJECTILES: { [key: string]: string[] } = {
  'United Kingdom': ['teacup', 'doubledecker', 'blackcab', 'guardhat'],
  'France': ['baguette', 'wine', 'croissant'],
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
    this.barrel = scene.add.graphics();

    // Main barrel (dark gunmetal)
    this.barrel.fillStyle(0x2F2F2F, 1);
    this.barrel.fillRect(-6, -45, 12, 40);
    this.barrel.lineStyle(2, 0x1F1F1F);
    this.barrel.strokeRect(-6, -45, 12, 40);

    // Barrel reinforcement rings
    this.barrel.fillStyle(0x3A3A3A, 1);
    this.barrel.fillRect(-7, -42, 14, 4);
    this.barrel.fillRect(-7, -30, 14, 3);
    this.barrel.fillRect(-7, -18, 14, 3);

    // Muzzle brake (flash suppressor)
    this.barrel.fillStyle(0x252525, 1);
    this.barrel.fillRect(-8, -48, 16, 6);
    this.barrel.lineStyle(1, 0x1A1A1A);
    this.barrel.strokeRect(-8, -48, 16, 6);

    // Muzzle brake slots
    this.barrel.fillStyle(0x1A1A1A, 1);
    this.barrel.fillRect(-6, -47, 3, 4);
    this.barrel.fillRect(3, -47, 3, 4);

    // Barrel highlight (subtle shine)
    this.barrel.fillStyle(0x4A4A4A, 0.4);
    this.barrel.fillRect(-4, -40, 2, 30);

    this.add([this.flag, this.base, this.barrel]);
    scene.add.existing(this);
  }

  private drawCountryFlag(): void {
    const flagX = 35; // To the right of the turret
    const poleHeight = 50;
    const flagWidth = 24;
    const flagHeight = 16;

    // Flagpole
    this.flag.lineStyle(3, 0x666666);
    this.flag.lineBetween(flagX, -poleHeight, flagX, 5);

    // Pole top ball
    this.flag.fillStyle(0x888888, 1);
    this.flag.fillCircle(flagX, -poleHeight, 3);

    // Draw flag based on country
    const fy = -poleHeight + 5; // Flag Y position (top of flag)

    switch (this.country) {
      case 'United Kingdom':
        // Union Jack (simplified)
        this.flag.fillStyle(0x012169, 1); // Blue background
        this.flag.fillRect(flagX, fy, flagWidth, flagHeight);
        // White diagonals
        this.flag.lineStyle(3, 0xFFFFFF);
        this.flag.lineBetween(flagX, fy, flagX + flagWidth, fy + flagHeight);
        this.flag.lineBetween(flagX + flagWidth, fy, flagX, fy + flagHeight);
        // Red diagonals
        this.flag.lineStyle(1.5, 0xC8102E);
        this.flag.lineBetween(flagX, fy, flagX + flagWidth, fy + flagHeight);
        this.flag.lineBetween(flagX + flagWidth, fy, flagX, fy + flagHeight);
        // White cross
        this.flag.lineStyle(4, 0xFFFFFF);
        this.flag.lineBetween(flagX + flagWidth / 2, fy, flagX + flagWidth / 2, fy + flagHeight);
        this.flag.lineBetween(flagX, fy + flagHeight / 2, flagX + flagWidth, fy + flagHeight / 2);
        // Red cross
        this.flag.lineStyle(2, 0xC8102E);
        this.flag.lineBetween(flagX + flagWidth / 2, fy, flagX + flagWidth / 2, fy + flagHeight);
        this.flag.lineBetween(flagX, fy + flagHeight / 2, flagX + flagWidth, fy + flagHeight / 2);
        break;

      case 'France':
        // French tricolor (vertical stripes)
        const fw3 = flagWidth / 3;
        this.flag.fillStyle(0x002395, 1); // Blue
        this.flag.fillRect(flagX, fy, fw3, flagHeight);
        this.flag.fillStyle(0xFFFFFF, 1); // White
        this.flag.fillRect(flagX + fw3, fy, fw3, flagHeight);
        this.flag.fillStyle(0xED2939, 1); // Red
        this.flag.fillRect(flagX + fw3 * 2, fy, fw3, flagHeight);
        break;

      case 'Germany':
        // German flag (horizontal stripes)
        const fh3 = flagHeight / 3;
        this.flag.fillStyle(0x000000, 1); // Black
        this.flag.fillRect(flagX, fy, flagWidth, fh3);
        this.flag.fillStyle(0xDD0000, 1); // Red
        this.flag.fillRect(flagX, fy + fh3, flagWidth, fh3);
        this.flag.fillStyle(0xFFCC00, 1); // Gold
        this.flag.fillRect(flagX, fy + fh3 * 2, flagWidth, fh3);
        break;

      case 'Poland':
        // Polish flag (horizontal stripes)
        this.flag.fillStyle(0xFFFFFF, 1); // White
        this.flag.fillRect(flagX, fy, flagWidth, flagHeight / 2);
        this.flag.fillStyle(0xDC143C, 1); // Red
        this.flag.fillRect(flagX, fy + flagHeight / 2, flagWidth, flagHeight / 2);
        break;

      case 'Russia':
        // Russian flag (horizontal stripes)
        const rfh = flagHeight / 3;
        this.flag.fillStyle(0xFFFFFF, 1); // White
        this.flag.fillRect(flagX, fy, flagWidth, rfh);
        this.flag.fillStyle(0x0039A6, 1); // Blue
        this.flag.fillRect(flagX, fy + rfh, flagWidth, rfh);
        this.flag.fillStyle(0xD52B1E, 1); // Red
        this.flag.fillRect(flagX, fy + rfh * 2, flagWidth, rfh);
        break;

      default:
        // Generic flag (gray)
        this.flag.fillStyle(0x888888, 1);
        this.flag.fillRect(flagX, fy, flagWidth, flagHeight);
        break;
    }

    // Flag border
    this.flag.lineStyle(1, 0x333333, 0.5);
    this.flag.strokeRect(flagX, fy, flagWidth, flagHeight);
  }

  setTarget(target: { x: number; y: number }): void {
    this.target = target;
  }

  update(time: number): void {
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

    // Aim at target
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    this.barrel.setRotation(angle + Math.PI / 2);

    // Fire at intervals
    if (time - this.lastFireTime > CANNON_FIRE_RATE) {
      this.fire(angle);
      this.lastFireTime = time;
    }
  }

  private fire(angle: number): void {
    // Double-check we're not destroyed before firing
    if (this.isDestroyed) return;

    // Randomly select a projectile sprite from this cannon's country options
    const spriteKey = this.projectileSprites[Math.floor(Math.random() * this.projectileSprites.length)];

    const projectile = new Projectile(
      this.cannonScene,
      this.x + Math.cos(angle) * 45,
      this.y + Math.sin(angle) * 45,
      angle,
      spriteKey
    );
    this.projectiles.push(projectile);

    // Muzzle flash (more dramatic for modern artillery)
    const flash = this.cannonScene.add.graphics();
    const flashX = this.x + Math.cos(angle) * 50;
    const flashY = this.y + Math.sin(angle) * 50;

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

    // Large explosion flash
    const flash = scene.add.graphics();
    flash.fillStyle(0xFF4400, 0.8);
    flash.fillCircle(x, y, 45);
    flash.fillStyle(0xFF6600, 1);
    flash.fillCircle(x, y, 35);
    flash.fillStyle(0xFFAA00, 1);
    flash.fillCircle(x, y, 25);
    flash.fillStyle(0xFFFF00, 1);
    flash.fillCircle(x, y, 15);
    flash.fillStyle(0xFFFFFF, 1);
    flash.fillCircle(x, y, 8);

    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.5,
      duration: 400,
      onComplete: () => flash.destroy(),
    });

    // Flying metal debris (turret parts)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const debris = scene.add.graphics();
      // Mix of turret colors
      const colors = [0x3D4A3D, 0x2F2F2F, 0x8B7355, 0x4A5A4A];
      debris.fillStyle(colors[i % colors.length], 1);
      debris.fillRect(-5, -3, 10, 6);
      debris.setPosition(x, y);

      scene.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * (60 + Math.random() * 30),
        y: y + Math.sin(angle) * (40 + Math.random() * 20) + 30,
        angle: Math.random() * 720,
        alpha: 0,
        duration: 500 + Math.random() * 200,
        onComplete: () => debris.destroy(),
      });
    }

    // Smoke clouds
    for (let i = 0; i < 4; i++) {
      const smoke = scene.add.graphics();
      smoke.fillStyle(0x444444, 0.6);
      smoke.fillCircle(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 20, 15 + Math.random() * 10);

      scene.tweens.add({
        targets: smoke,
        y: smoke.y - 40,
        alpha: 0,
        scale: 2,
        duration: 800,
        delay: i * 50,
        onComplete: () => smoke.destroy(),
      });
    }
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
      this.sprite = scene.add.sprite(0, 0, spriteKey);
      this.sprite.setScale(0.075); // Scale down the sprite (50% larger than 0.05)
      this.sprite.setRotation(angle);
      this.add(this.sprite);
    } else {
      // Fall back to graphics-based projectile (cannonball)
      this.graphics = scene.add.graphics();
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

    // Only remove if gone above the screen or very far horizontally
    return (
      this.y < -100 ||
      this.x < camera.scrollX - 500 ||
      this.x > camera.scrollX + camera.width + 500 ||
      this.y > camera.height + 200
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
    matterScene.matter.world.remove(this.matterBody);
    if (this.graphics) this.graphics.destroy();
    if (this.sprite) this.sprite.destroy();
    super.destroy();
  }
}
