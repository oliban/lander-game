import Phaser from 'phaser';
import { COLORS } from '../constants';

export class LandingPad {
  private padScene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private matterBody: MatterJS.BodyType;

  public x: number;
  public y: number;
  public width: number;
  public name: string;
  public isFinalDestination: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    name: string,
    isFinalDestination: boolean = false
  ) {
    this.padScene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.name = name;
    this.isFinalDestination = isFinalDestination;

    this.graphics = scene.add.graphics();

    // Create physics body - very thin sensor at the pad surface
    const matterScene = scene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
    this.matterBody = matterScene.matter.add.rectangle(x, y + 2, width, 8, {
      isStatic: true,
      isSensor: true, // Don't physically collide, just detect
      label: 'landingPad',
      collisionFilter: {
        category: 3,
      },
    });

    // Store reference to this pad on the body using custom property
    (this.matterBody as unknown as { landingPadRef: LandingPad }).landingPadRef = this;

    this.draw();
  }

  private draw(): void {
    const color = this.isFinalDestination ? 0xFFD700 : COLORS.LANDING_PAD;
    const darkerColor = this.isFinalDestination ? 0xB8860B : 0xDAA520;
    const halfWidth = this.width / 2;

    // Draw main landing pad platform (cartoon style)
    this.graphics.fillStyle(color, 1);
    this.graphics.fillRect(this.x - halfWidth, this.y, this.width, 8);

    // Dark outline
    this.graphics.lineStyle(3, darkerColor, 1);
    this.graphics.strokeRect(this.x - halfWidth, this.y, this.width, 8);

    // Stripes on the pad (safety stripes)
    const stripeWidth = 10;
    this.graphics.fillStyle(0x333333, 1);
    for (let sx = this.x - halfWidth + 5; sx < this.x + halfWidth - 5; sx += stripeWidth * 2) {
      this.graphics.fillRect(sx, this.y + 2, stripeWidth, 4);
    }

    // Side markers (poles)
    // Left pole
    this.graphics.fillStyle(0xCC0000, 1);
    this.graphics.fillRect(this.x - halfWidth - 6, this.y - 20, 6, 28);
    this.graphics.lineStyle(2, 0x880000, 1);
    this.graphics.strokeRect(this.x - halfWidth - 6, this.y - 20, 6, 28);

    // Right pole
    this.graphics.fillStyle(0xCC0000, 1);
    this.graphics.fillRect(this.x + halfWidth, this.y - 20, 6, 28);
    this.graphics.lineStyle(2, 0x880000, 1);
    this.graphics.strokeRect(this.x + halfWidth, this.y - 20, 6, 28);

    // Light bulbs on top of poles
    this.graphics.fillStyle(0xFFFF00, 1);
    this.graphics.fillCircle(this.x - halfWidth - 3, this.y - 24, 5);
    this.graphics.fillCircle(this.x + halfWidth + 3, this.y - 24, 5);

    // Draw pad name with shadow
    const textShadow = this.padScene.add.text(this.x + 1, this.y + 16, this.name, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: '#333333',
      fontStyle: 'bold',
    });
    textShadow.setOrigin(0.5, 0);

    const textColor = this.isFinalDestination ? '#CC0000' : '#2E7D32';
    const text = this.padScene.add.text(this.x, this.y + 15, this.name, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11px',
      color: textColor,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0);
  }

  getBody(): MatterJS.BodyType {
    return this.matterBody;
  }

  destroy(): void {
    this.graphics.destroy();
    const matterScene = this.padScene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
    matterScene.matter.world.remove(this.matterBody);
  }
}
