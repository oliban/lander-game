import Phaser from 'phaser';
import { COLLECTIBLE_TYPES } from '../constants';

export type CollectibleType = keyof typeof COLLECTIBLE_TYPES;

export class Collectible extends Phaser.GameObjects.Container {
  private collectibleScene: Phaser.Scene;
  private matterBody: MatterJS.BodyType;
  private sprite: Phaser.GameObjects.Sprite;
  private bgCircle: Phaser.GameObjects.Graphics;
  public collectibleType: CollectibleType;
  public fuelValue: number;
  public collected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, type: CollectibleType) {
    super(scene, x, y);

    this.collectibleScene = scene;
    this.collectibleType = type;
    this.fuelValue = COLLECTIBLE_TYPES[type].fuelValue;

    const typeData = COLLECTIBLE_TYPES[type];

    // Create cartoon background circle
    this.bgCircle = scene.add.graphics();
    // White circle background
    this.bgCircle.fillStyle(0xFFFFFF, 0.9);
    this.bgCircle.fillCircle(0, 0, 18);
    // Colored border
    this.bgCircle.lineStyle(3, typeData.color);
    this.bgCircle.strokeCircle(0, 0, 18);
    this.add(this.bgCircle);

    // Create sprite based on type
    const textureKey = type.toLowerCase().replace('_', '');
    this.sprite = scene.add.sprite(0, 0, textureKey);
    this.sprite.setScale(1.0);
    this.add(this.sprite);

    scene.add.existing(this);

    // Create sensor physics body
    const matterScene = scene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
    this.matterBody = matterScene.matter.add.circle(x, y, 15, {
      isSensor: true,
      isStatic: true,
      label: 'collectible',
      collisionFilter: {
        category: 5,
      },
    });

    // Store reference to this collectible using custom property
    (this.matterBody as unknown as { collectibleRef: Collectible }).collectibleRef = this;

    // Floating animation (bouncy cartoon style)
    scene.tweens.add({
      targets: this,
      y: y - 8,
      duration: 800 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Gentle wobble instead of full rotation
    scene.tweens.add({
      targets: this,
      angle: 10,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;

    // Collection effect - simple sparkle circles
    const typeData = COLLECTIBLE_TYPES[this.collectibleType];

    // Create burst of circles
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const sparkle = this.collectibleScene.add.graphics();
      sparkle.fillStyle(typeData.color, 1);
      sparkle.fillCircle(0, 0, 5);
      sparkle.setPosition(this.x, this.y);

      this.collectibleScene.tweens.add({
        targets: sparkle,
        x: this.x + Math.cos(angle) * 40,
        y: this.y + Math.sin(angle) * 40,
        alpha: 0,
        scale: 0.3,
        duration: 300,
        onComplete: () => sparkle.destroy(),
      });
    }

    // "+1" popup text
    const popupText = this.collectibleScene.add.text(this.x, this.y - 20, '+1', {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '16px',
      color: '#' + typeData.color.toString(16).padStart(6, '0'),
      fontStyle: 'bold',
    });
    popupText.setOrigin(0.5, 0.5);

    this.collectibleScene.tweens.add({
      targets: popupText,
      y: this.y - 50,
      alpha: 0,
      duration: 500,
      onComplete: () => popupText.destroy(),
    });

    // Scale up and fade out
    this.collectibleScene.tweens.add({
      targets: this,
      scale: 1.3,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.destroy();
      },
    });
  }

  getBody(): MatterJS.BodyType {
    return this.matterBody;
  }

  destroy(): void {
    const matterScene = this.collectibleScene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
    matterScene.matter.world.remove(this.matterBody);
    this.bgCircle.destroy();
    this.sprite.destroy();
    super.destroy();
  }
}

// Spawn collectibles along the journey
export function spawnCollectibles(
  scene: Phaser.Scene,
  startX: number,
  endX: number,
  getTerrainHeight: (x: number) => number
): Collectible[] {
  const collectibles: Collectible[] = [];
  const spacing = 300; // Average spacing between collectibles

  for (let x = startX + 200; x < endX - 200; x += spacing + Math.random() * spacing) {
    // Determine type based on rarity
    const roll = Math.random();
    let type: CollectibleType = 'BURGER';

    if (roll < COLLECTIBLE_TYPES.MAGA_HAT.rarity) {
      type = 'MAGA_HAT';
    } else if (roll < COLLECTIBLE_TYPES.MAGA_HAT.rarity + COLLECTIBLE_TYPES.TWITTER.rarity) {
      type = 'TWITTER';
    } else if (
      roll <
      COLLECTIBLE_TYPES.MAGA_HAT.rarity + COLLECTIBLE_TYPES.TWITTER.rarity + COLLECTIBLE_TYPES.DOLLAR.rarity
    ) {
      type = 'DOLLAR';
    }

    // Position above terrain
    const terrainY = getTerrainHeight(x);
    const y = terrainY - 50 - Math.random() * 150;

    const collectible = new Collectible(scene, x, y, type);
    collectibles.push(collectible);
  }

  return collectibles;
}
