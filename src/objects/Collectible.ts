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
  public special?: string; // For power-up effects

  constructor(scene: Phaser.Scene, x: number, y: number, type: CollectibleType) {
    super(scene, x, y);

    this.collectibleScene = scene;
    this.collectibleType = type;
    this.fuelValue = COLLECTIBLE_TYPES[type].fuelValue;

    const typeData = COLLECTIBLE_TYPES[type] as { special?: string; color: number; name: string; fuelValue: number; rarity: number };
    this.special = typeData.special;

    const isSpecial = !!this.special;
    const circleRadius = isSpecial ? 45 : 35; // Even bigger circles for visibility

    // Create cartoon background circle
    this.bgCircle = scene.add.graphics();
    // White circle background (gold for special items)
    this.bgCircle.fillStyle(isSpecial ? 0xFFD700 : 0xFFFFFF, 0.9);
    this.bgCircle.fillCircle(0, 0, circleRadius);
    // Colored border (thicker and glowing for special)
    this.bgCircle.lineStyle(isSpecial ? 5 : 4, typeData.color);
    this.bgCircle.strokeCircle(0, 0, circleRadius);
    if (isSpecial) {
      // Extra glow ring for special items
      this.bgCircle.lineStyle(2, 0xFFFFFF, 0.5);
      this.bgCircle.strokeCircle(0, 0, circleRadius + 5);
    }
    this.add(this.bgCircle);

    // Create sprite based on type
    const textureKey = type.toLowerCase().replace('_', '');
    this.sprite = scene.add.sprite(0, 0, textureKey);
    // Scale down the large images to fit in the circle (images are ~512px, we want ~60-85px)
    const targetSize = isSpecial ? 80 : 60;
    this.sprite.setScale(targetSize / 512);
    this.add(this.sprite);

    scene.add.existing(this);

    // Create sensor physics body (bigger to match visual size)
    const matterScene = scene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
    this.matterBody = matterScene.matter.add.circle(x, y, circleRadius - 5, {
      isSensor: true,
      isStatic: true,
      label: 'collectible',
      collisionFilter: {
        category: 5,
      },
    });

    // Store reference to this collectible using custom property
    (this.matterBody as unknown as { collectibleRef: Collectible }).collectibleRef = this;

    // No animations - static collectibles are easier to see
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

    // Popup text - show item name when collected
    let popupMessage = typeData.name;
    let fontSize = '22px';
    if (this.special === 'bribe_cannons') {
      popupMessage = 'BRIBERY!';
      fontSize = '28px';
    } else if (this.special === 'speed_boost') {
      popupMessage = 'EXECUTIVE TIME!';
      fontSize = '28px';
    }

    const popupText = this.collectibleScene.add.text(this.x, this.y - 30, popupMessage, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: fontSize,
      color: '#' + typeData.color.toString(16).padStart(6, '0'),
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    popupText.setOrigin(0.5, 0.5);

    this.collectibleScene.tweens.add({
      targets: popupText,
      y: this.y - 80,
      alpha: 0,
      duration: this.special ? 1200 : 900,
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
  const spacing = 250; // Average spacing between collectibles

  // Russian zone starts at x = 12000 (Poland onwards)
  const russianZoneStart = 12000;

  for (let x = startX + 200; x < endX - 200; x += spacing + Math.random() * spacing) {
    const isInRussianZone = x >= russianZoneStart;

    // Build weighted list of available types
    const availableTypes: { type: CollectibleType; weight: number }[] = [];

    for (const [key, data] of Object.entries(COLLECTIBLE_TYPES)) {
      const typeData = data as { name: string; fuelValue: number; rarity: number; color: number; russianOnly?: boolean };

      // Skip Russian-only items outside Russian zone
      if (typeData.russianOnly && !isInRussianZone) {
        continue;
      }

      // Boost Russian items in Russian zone
      let weight = typeData.rarity;
      if (typeData.russianOnly && isInRussianZone) {
        weight *= 3; // Triple spawn rate in their zone
      }

      availableTypes.push({ type: key as CollectibleType, weight });
    }

    // Calculate total weight
    const totalWeight = availableTypes.reduce((sum, item) => sum + item.weight, 0);

    // Roll for type
    let roll = Math.random() * totalWeight;
    let selectedType: CollectibleType = 'BURGER';

    for (const item of availableTypes) {
      roll -= item.weight;
      if (roll <= 0) {
        selectedType = item.type;
        break;
      }
    }

    // Position above terrain
    const terrainY = getTerrainHeight(x);
    const y = terrainY - 50 - Math.random() * 150;

    const collectible = new Collectible(scene, x, y, selectedType);
    collectibles.push(collectible);
  }

  return collectibles;
}
