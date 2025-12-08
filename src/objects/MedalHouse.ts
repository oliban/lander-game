import Phaser from 'phaser';

// The FIFA Kennedy Center - randomly picks one of 16 building images
const BUILDING_NAME = 'FIFA Kennedy Center';

export class MedalHouse extends Phaser.GameObjects.Sprite {
  public buildingName: string;
  public pointValue: number = 1000; // High value for the special medal house
  public isDestroyed: boolean = false;
  public country: string = 'Washington';
  private matterBody: MatterJS.BodyType | null = null;
  public collisionWidth: number = 0;
  public collisionHeight: number = 0;
  public houseIndex: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    terrainY: number
  ) {
    // Pick a random medal house image (0-15)
    const houseIndex = Math.floor(Math.random() * 16);
    const textureKey = `medal_house_${houseIndex}`;
    super(scene, x, terrainY, textureKey);

    this.houseIndex = houseIndex;
    this.buildingName = BUILDING_NAME;

    // Position so bottom of image sits on terrain
    this.setOrigin(0.5, 1);

    // Get actual texture dimensions
    const textureWidth = this.texture.getSourceImage().width;
    const textureHeight = this.texture.getSourceImage().height;

    // Scale to target height of ~150px for the medal house
    const targetHeight = 150;
    const baseScale = targetHeight / textureHeight;
    this.setScale(baseScale);

    // Position at terrain level
    this.y = terrainY;

    // Calculate collision dimensions based on actual scaled size
    this.collisionWidth = textureWidth * baseScale * 0.6;
    this.collisionHeight = textureHeight * baseScale * 0.9;

    // Create physics body for collision
    const matterScene = scene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
    this.matterBody = matterScene.matter.add.rectangle(
      x,
      terrainY - this.collisionHeight / 2,
      this.collisionWidth,
      this.collisionHeight,
      {
        isStatic: true,
        label: 'building',
        collisionFilter: {
          category: 2,
        },
      }
    );

    // Store reference to this decoration
    (this.matterBody as unknown as { decorationRef: MedalHouse }).decorationRef = this;

    // Set depth behind shuttle but in front of terrain fill
    this.setDepth(5);

    scene.add.existing(this);
  }

  // Check if a point is inside this building's collision area
  containsPoint(px: number, py: number): boolean {
    if (this.isDestroyed) return false;

    const left = this.x - this.collisionWidth / 2;
    const right = this.x + this.collisionWidth / 2;
    const top = this.y - this.collisionHeight;
    const bottom = this.y;

    return px >= left && px <= right && py >= top && py <= bottom;
  }

  // Get the bounding box for collision checking
  getCollisionBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.collisionWidth / 2,
      y: this.y - this.collisionHeight,
      width: this.collisionWidth,
      height: this.collisionHeight,
    };
  }

  // Explode when bombed
  explode(): { name: string; points: number; textureKey: string; country: string } {
    if (this.isDestroyed) return { name: this.buildingName, points: 0, textureKey: this.texture.key, country: this.country };

    this.isDestroyed = true;

    // Remove physics body
    if (this.matterBody) {
      const matterScene = this.scene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
      matterScene.matter.world.remove(this.matterBody);
      this.matterBody = null;
    }

    // Create explosion effect
    const scene = this.scene;
    const x = this.x;
    const y = this.y - this.displayHeight / 2;

    // Explosion flash
    const flash = scene.add.graphics();
    flash.fillStyle(0xFF6600, 1);
    flash.fillCircle(x, y, 40);
    flash.fillStyle(0xFFFF00, 1);
    flash.fillCircle(x, y, 25);
    flash.fillStyle(0xFFFFFF, 1);
    flash.fillCircle(x, y, 10);

    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 400,
      onComplete: () => flash.destroy(),
    });

    // Flying debris
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const debris = scene.add.graphics();
      debris.fillStyle(0x888888, 1);
      debris.fillRect(-3, -3, 6, 6);
      debris.setPosition(x, y);

      scene.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * 60,
        y: y + Math.sin(angle) * 60 + 30,
        angle: Math.random() * 360,
        alpha: 0,
        duration: 500,
        onComplete: () => debris.destroy(),
      });
    }

    // Hide the building
    this.setVisible(false);

    return { name: this.buildingName, points: this.pointValue, textureKey: this.texture.key, country: this.country };
  }
}
