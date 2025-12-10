import Phaser from 'phaser';

// Map collectible types to their sprite keys
const COLLECTIBLE_SPRITE_MAP: { [key: string]: string } = {
  'BURGER': 'burger',
  'HAMBERDER': 'hamberder',
  'DIET_COKE': 'dietcoke',
  'TRUMP_STEAK': 'trumpsteak',
  'VODKA': 'vodka',
};

export class Bomb extends Phaser.Physics.Matter.Sprite {
  public foodType: string;
  public hasExploded: boolean = false;
  public droppedByPlayer: number; // 1 or 2

  constructor(scene: Phaser.Scene, x: number, y: number, foodType: string, droppedByPlayer: number = 1) {
    const spriteKey = COLLECTIBLE_SPRITE_MAP[foodType] || 'burger';
    super(scene.matter.world, x, y, spriteKey);

    this.foodType = foodType;
    this.droppedByPlayer = droppedByPlayer;

    // Add to scene
    scene.add.existing(this);

    // Scale down the sprite for bomb size (75% of shuttle size which is 32x40)
    // Shuttle is roughly 32 pixels wide, so 75% is ~24 pixels
    // Food sprites are ~400px, so scale to get ~24px width
    this.setScale(0.06);

    // Set up physics body
    this.setCircle(10);
    this.setFrictionAir(0);
    this.setBounce(0);
    this.setMass(2);

    // Use a unique collision category that doesn't collide with anything
    // Category 8 (bit 4) - bombs only, collides with nothing
    // This allows gravity to still work while preventing physics collisions
    this.setCollisionCategory(8);
    this.setCollidesWith([]); // Collide with nothing via physics

    // Label for collision detection
    this.setData('label', 'bomb');
    (this.body as MatterJS.BodyType).label = 'bomb';

    // Store reference to this bomb on the body for collision handling
    (this.body as any).bombRef = this;

    // Add slight rotation for visual effect
    this.setAngularVelocity(0.05);

    // Set depth to appear above terrain
    this.setDepth(10);
  }

  explode(scene: Phaser.Scene): void {
    if (this.hasExploded) return;
    this.hasExploded = true;

    const x = this.x;
    const y = this.y;

    // Create explosion effect
    this.createExplosionEffect(scene, x, y);

    // Screen shake
    scene.cameras.main.shake(200, 0.01);

    // Destroy the bomb
    this.destroy();
  }

  private createExplosionEffect(scene: Phaser.Scene, x: number, y: number): void {
    // Flash circle
    const flash = scene.add.circle(x, y, 10, 0xFFFF00, 1);
    flash.setDepth(100);

    // Expanding explosion rings
    scene.tweens.add({
      targets: flash,
      radius: 80,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });

    // Orange explosion circle
    const explosion = scene.add.circle(x, y, 5, 0xFF6600, 0.8);
    explosion.setDepth(99);

    scene.tweens.add({
      targets: explosion,
      radius: 60,
      alpha: 0,
      duration: 400,
      ease: 'Power1',
      onComplete: () => explosion.destroy()
    });

    // Debris particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 100 + Math.random() * 100;
      const debris = scene.add.circle(x, y, 3 + Math.random() * 4, 0xFF4400, 1);
      debris.setDepth(98);

      scene.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: 400 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => debris.destroy()
      });
    }

    // Smoke puffs
    for (let i = 0; i < 6; i++) {
      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 40;
      const smoke = scene.add.circle(x + offsetX, y + offsetY, 8 + Math.random() * 12, 0x444444, 0.6);
      smoke.setDepth(97);

      scene.tweens.add({
        targets: smoke,
        y: y + offsetY - 50,
        alpha: 0,
        scale: 2,
        duration: 600 + Math.random() * 300,
        ease: 'Power1',
        onComplete: () => smoke.destroy()
      });
    }
  }
}
