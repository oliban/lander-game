import Phaser from 'phaser';
import { CountryDecoration } from './CountryDecoration';

const BUILDING_NAME = 'FIFA Kennedy Center';
const MEDAL_HOUSE_POINT_VALUE = 1000;

export class MedalHouse extends CountryDecoration {
  public houseIndex: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    terrainY: number
  ) {
    // Pick random medal house texture (0 or 1)
    const houseIndex = Math.floor(Math.random() * 2);

    // Call parent constructor with placeholder values
    // We'll override the texture and properties after
    super(scene, x, terrainY, 'Washington', 0, false);

    this.houseIndex = houseIndex;

    // Override texture to use medal_house texture
    const textureKey = `medal_house_${houseIndex}`;
    this.setTexture(textureKey);

    // Override properties specific to MedalHouse
    this.buildingName = BUILDING_NAME;
    this.pointValue = MEDAL_HOUSE_POINT_VALUE;
    this.country = 'Washington';

    // Recalculate scale for medal house (fixed 150px height)
    const textureWidth = this.texture.getSourceImage().width;
    const textureHeight = this.texture.getSourceImage().height;
    const targetHeight = 150;
    const baseScale = targetHeight / textureHeight;
    this.setScale(baseScale);

    // Recalculate collision dimensions
    this.collisionWidth = textureWidth * baseScale * 0.85;
    this.collisionHeight = textureHeight * baseScale * 0.95;

    // Update physics body position (parent created it, but we changed scale)
    // Remove old body and create new one with correct dimensions
    if (this.matterBody) {
      const matterScene = scene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
      matterScene.matter.world.remove(this.matterBody);

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
    }
  }

  // explode() is inherited from CountryDecoration - no duplicate code needed!
}
