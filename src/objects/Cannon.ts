import Phaser from 'phaser';
import { CANNON_FIRE_RATE, PROJECTILE_SPEED } from '../constants';

export class Cannon extends Phaser.GameObjects.Container {
  private cannonScene: Phaser.Scene;
  private base: Phaser.GameObjects.Graphics;
  private barrel: Phaser.GameObjects.Graphics;
  private lastFireTime: number = 0;
  private target: { x: number; y: number } | null = null;
  private projectiles: Projectile[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.cannonScene = scene;

    // Create base (cartoon military green)
    this.base = scene.add.graphics();
    this.base.fillStyle(0x556B2F, 1);
    this.base.fillCircle(0, 0, 18);
    this.base.lineStyle(3, 0x3D4A2D);
    this.base.strokeCircle(0, 0, 18);
    // Highlight
    this.base.fillStyle(0x6B8E23, 0.5);
    this.base.fillCircle(-4, -4, 8);

    // Create barrel (dark metal)
    this.barrel = scene.add.graphics();
    this.barrel.fillStyle(0x444444, 1);
    this.barrel.fillRect(-5, -32, 10, 28);
    this.barrel.lineStyle(2, 0x222222);
    this.barrel.strokeRect(-5, -32, 10, 28);
    // Barrel tip ring
    this.barrel.fillStyle(0x333333, 1);
    this.barrel.fillRect(-6, -32, 12, 4);

    this.add([this.base, this.barrel]);
    scene.add.existing(this);
  }

  setTarget(target: { x: number; y: number }): void {
    this.target = target;
  }

  update(time: number): void {
    if (!this.target) return;

    // Aim at target
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    this.barrel.setRotation(angle + Math.PI / 2);

    // Fire at intervals
    if (time - this.lastFireTime > CANNON_FIRE_RATE) {
      this.fire(angle);
      this.lastFireTime = time;
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update();

      // Remove if out of bounds
      if (projectile.isOutOfBounds()) {
        projectile.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private fire(angle: number): void {
    const projectile = new Projectile(
      this.cannonScene,
      this.x + Math.cos(angle) * 25,
      this.y + Math.sin(angle) * 25,
      angle
    );
    this.projectiles.push(projectile);

    // Muzzle flash (cartoon puff)
    const flash = this.cannonScene.add.graphics();
    const flashX = this.x + Math.cos(angle) * 32;
    const flashY = this.y + Math.sin(angle) * 32;
    flash.fillStyle(0xFFFFFF, 0.9);
    flash.fillCircle(flashX, flashY, 12);
    flash.fillStyle(0xFFFF00, 0.8);
    flash.fillCircle(flashX, flashY, 8);
    flash.fillStyle(0xFF6600, 0.7);
    flash.fillCircle(flashX, flashY, 5);

    this.cannonScene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 150,
      onComplete: () => flash.destroy(),
    });
  }

  getProjectiles(): Projectile[] {
    return this.projectiles;
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
  private graphics: Phaser.GameObjects.Graphics;
  private velocityX: number;
  private velocityY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, angle: number) {
    super(scene, x, y);

    this.projectileScene = scene;
    this.velocityX = Math.cos(angle) * PROJECTILE_SPEED;
    this.velocityY = Math.sin(angle) * PROJECTILE_SPEED;

    // Create visual (cartoon cannonball)
    this.graphics = scene.add.graphics();
    // Main ball (dark gray/black)
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillCircle(0, 0, 7);
    // Outline
    this.graphics.lineStyle(2, 0x111111);
    this.graphics.strokeCircle(0, 0, 7);
    // Highlight for cartoon 3D effect
    this.graphics.fillStyle(0x555555, 0.8);
    this.graphics.fillCircle(-2, -2, 3);
    this.add(this.graphics);

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
    matterScene.matter.body.setPosition(this.matterBody, { x: this.x, y: this.y });
  }

  isOutOfBounds(): boolean {
    const camera = this.projectileScene.cameras.main;
    const margin = 100;

    return (
      this.x < camera.scrollX - margin ||
      this.x > camera.scrollX + camera.width + margin ||
      this.y < -margin ||
      this.y > camera.height + margin
    );
  }

  getBody(): MatterJS.BodyType {
    return this.matterBody;
  }

  destroy(): void {
    const matterScene = this.projectileScene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
    matterScene.matter.world.remove(this.matterBody);
    this.graphics.destroy();
    super.destroy();
  }
}
