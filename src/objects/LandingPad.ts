import Phaser from 'phaser';
import { COLORS } from '../constants';

export class LandingPad {
  private padScene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private matterBody: MatterJS.BodyType;
  private peaceMedalGraphics: Phaser.GameObjects.Graphics | null = null;

  public x: number;
  public y: number;
  public width: number;
  public name: string;
  public isFinalDestination: boolean;
  public isWashington: boolean;
  public isFuelDepot: boolean;
  public isOilPlatform: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    name: string,
    isFinalDestination: boolean = false,
    isWashington: boolean = false,
    isOilPlatform: boolean = false
  ) {
    this.padScene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.name = name;
    this.isFinalDestination = isFinalDestination;
    this.isWashington = isWashington;
    this.isOilPlatform = isOilPlatform;
    // Check if this is a fuel depot based on name (but not the oil platform)
    this.isFuelDepot = !isOilPlatform && (name.includes('Fuel') || name.includes('Gas') || name.includes('Depot') || name.includes('Station'));

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
    const color = this.isFinalDestination ? 0xFFD700 : (this.isWashington ? 0xE8E8E8 : COLORS.LANDING_PAD);
    const darkerColor = this.isFinalDestination ? 0xB8860B : (this.isWashington ? 0xAAAAAA : 0xDAA520);
    const halfWidth = this.width / 2;

    // Draw palace for final destination
    if (this.isFinalDestination) {
      this.drawPalace();
    }

    // Draw White House for Washington
    if (this.isWashington) {
      this.drawWhiteHouse();
    }

    // Draw oil platform structure for Mid-Atlantic (static parts only, tower is separate)
    if (this.isOilPlatform) {
      this.drawOilPlatformBase();
    }

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

  private drawPalace(): void {
    const palaceX = this.x + this.width / 2 + 60; // To the right of landing pad
    const palaceY = this.y;

    // Ground/courtyard
    this.graphics.fillStyle(0x8B7355, 1); // Tan/cobblestone
    this.graphics.fillRect(palaceX - 30, palaceY - 5, 280, 10);

    // Main palace building - grand Kremlin-style
    const mainWidth = 200;
    const mainHeight = 100;

    // Main building body (white with red accents)
    this.graphics.fillStyle(0xFFF8DC, 1); // Cornsilk/cream
    this.graphics.fillRect(palaceX, palaceY - mainHeight, mainWidth, mainHeight);
    this.graphics.lineStyle(3, 0xCD853F, 1); // Peru brown outline
    this.graphics.strokeRect(palaceX, palaceY - mainHeight, mainWidth, mainHeight);

    // Decorative red band at top
    this.graphics.fillStyle(0xCC0000, 1);
    this.graphics.fillRect(palaceX, palaceY - mainHeight, mainWidth, 12);

    // Central tower (tallest)
    const towerX = palaceX + mainWidth / 2 - 25;
    this.graphics.fillStyle(0xFFF8DC, 1);
    this.graphics.fillRect(towerX, palaceY - mainHeight - 60, 50, 60);
    this.graphics.lineStyle(2, 0xCD853F, 1);
    this.graphics.strokeRect(towerX, palaceY - mainHeight - 60, 50, 60);

    // Central onion dome (gold)
    this.graphics.fillStyle(0xFFD700, 1);
    this.graphics.fillCircle(towerX + 25, palaceY - mainHeight - 75, 22);
    // Dome tip
    this.graphics.fillTriangle(
      towerX + 25, palaceY - mainHeight - 115,
      towerX + 12, palaceY - mainHeight - 75,
      towerX + 38, palaceY - mainHeight - 75
    );
    // Cross on top
    this.graphics.lineStyle(3, 0xFFD700, 1);
    this.graphics.lineBetween(towerX + 25, palaceY - mainHeight - 120, towerX + 25, palaceY - mainHeight - 130);
    this.graphics.lineBetween(towerX + 20, palaceY - mainHeight - 125, towerX + 30, palaceY - mainHeight - 125);

    // Left tower
    this.graphics.fillStyle(0xFFF8DC, 1);
    this.graphics.fillRect(palaceX + 15, palaceY - mainHeight - 40, 35, 40);
    this.graphics.fillStyle(0xFFD700, 1);
    this.graphics.fillCircle(palaceX + 32, palaceY - mainHeight - 50, 16);
    this.graphics.fillTriangle(
      palaceX + 32, palaceY - mainHeight - 80,
      palaceX + 22, palaceY - mainHeight - 50,
      palaceX + 42, palaceY - mainHeight - 50
    );

    // Right tower
    this.graphics.fillStyle(0xFFF8DC, 1);
    this.graphics.fillRect(palaceX + mainWidth - 50, palaceY - mainHeight - 40, 35, 40);
    this.graphics.fillStyle(0xFFD700, 1);
    this.graphics.fillCircle(palaceX + mainWidth - 32, palaceY - mainHeight - 50, 16);
    this.graphics.fillTriangle(
      palaceX + mainWidth - 32, palaceY - mainHeight - 80,
      palaceX + mainWidth - 42, palaceY - mainHeight - 50,
      palaceX + mainWidth - 22, palaceY - mainHeight - 50
    );

    // Windows (3 rows)
    this.graphics.fillStyle(0x4682B4, 1); // Steel blue windows
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 5; col++) {
        const wx = palaceX + 20 + col * 35;
        const wy = palaceY - mainHeight + 25 + row * 35;
        this.graphics.fillRect(wx, wy, 18, 25);
        // Window frame
        this.graphics.lineStyle(1, 0xCD853F, 1);
        this.graphics.strokeRect(wx, wy, 18, 25);
      }
    }

    // Grand entrance door (arched)
    this.graphics.fillStyle(0x8B0000, 1); // Dark red
    this.graphics.fillRect(palaceX + mainWidth / 2 - 20, palaceY - 50, 40, 50);
    this.graphics.fillCircle(palaceX + mainWidth / 2, palaceY - 50, 20);
    // Gold door trim
    this.graphics.lineStyle(3, 0xFFD700, 1);
    this.graphics.strokeRect(palaceX + mainWidth / 2 - 20, palaceY - 50, 40, 50);

    // Kremlin wall on sides
    this.graphics.fillStyle(0xCC0000, 1);
    this.graphics.fillRect(palaceX - 30, palaceY - 40, 30, 40);
    this.graphics.fillRect(palaceX + mainWidth, palaceY - 40, 30, 40);
    // Battlements
    for (let i = 0; i < 3; i++) {
      this.graphics.fillRect(palaceX - 30 + i * 10, palaceY - 50, 8, 10);
      this.graphics.fillRect(palaceX + mainWidth + i * 10, palaceY - 50, 8, 10);
    }

    // Russian flag - large and prominent
    const flagX = palaceX + mainWidth / 2 + 5;
    const flagY = palaceY - mainHeight - 140;
    // Flagpole
    this.graphics.lineStyle(3, 0x444444, 1);
    this.graphics.lineBetween(flagX, flagY + 50, flagX, flagY);
    // Flag stripes
    this.graphics.fillStyle(0xFFFFFF, 1);
    this.graphics.fillRect(flagX, flagY, 30, 8);
    this.graphics.fillStyle(0x0039A6, 1);
    this.graphics.fillRect(flagX, flagY + 8, 30, 8);
    this.graphics.fillStyle(0xD52B1E, 1);
    this.graphics.fillRect(flagX, flagY + 16, 30, 8);

    // Red stars on towers
    this.drawStar(palaceX + 32, palaceY - mainHeight - 85, 8, 0xFF0000);
    this.drawStar(palaceX + mainWidth - 32, palaceY - mainHeight - 85, 8, 0xFF0000);
  }

  private drawStar(x: number, y: number, size: number, color: number): void {
    this.graphics.fillStyle(color, 1);
    // 5-pointed star using triangles
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i * 144 - 90) * (Math.PI / 180);
      points.push({
        x: x + Math.cos(angle) * size,
        y: y + Math.sin(angle) * size,
      });
    }
    // Draw as connected triangles
    this.graphics.fillTriangle(points[0].x, points[0].y, points[2].x, points[2].y, points[4].x, points[4].y);
    this.graphics.fillTriangle(points[1].x, points[1].y, points[3].x, points[3].y, points[0].x, points[0].y);
  }

  private drawWhiteHouse(): void {
    // Medal house is at x - 120 (created in GameScene as MedalHouse)
    const houseX = this.x - 120;
    const whY = this.y;

    // The medal house building is now created as a CountryDecoration in GameScene
    // Just draw the lawn and peace medal here

    // No lawn needed - FIFA Kennedy Center building handles its own base

    // Peace Medal on display stand on the lawn (what the player will pick up)
    // Draw on separate graphics so it can be hidden when collected
    this.peaceMedalGraphics = this.padScene.add.graphics();
    const medalX = houseX + 180; // On the lawn further to the right, away from the building
    const medalY = whY - 30;

    // Display stand
    this.peaceMedalGraphics.fillStyle(0x8B4513, 1);
    this.peaceMedalGraphics.fillRect(medalX - 15, medalY + 20, 30, 10);
    this.peaceMedalGraphics.fillRect(medalX - 10, medalY, 20, 20);

    // The Peace Medal (gold with ribbon)
    this.peaceMedalGraphics.fillStyle(0x0000AA, 1); // Blue ribbon
    this.peaceMedalGraphics.fillRect(medalX - 3, medalY - 30, 6, 35);
    this.peaceMedalGraphics.fillStyle(0xFFD700, 1); // Gold medal
    this.peaceMedalGraphics.fillCircle(medalX, medalY - 40, 18);
    this.peaceMedalGraphics.lineStyle(2, 0xB8860B, 1);
    this.peaceMedalGraphics.strokeCircle(medalX, medalY - 40, 18);
    // Peace symbol on medal
    this.peaceMedalGraphics.fillStyle(0xFFFFFF, 1);
    this.peaceMedalGraphics.fillCircle(medalX, medalY - 40, 8);
    this.peaceMedalGraphics.lineStyle(2, 0xFFD700, 1);
    this.peaceMedalGraphics.strokeCircle(medalX, medalY - 40, 8);
    // Dove silhouette (simplified)
    this.peaceMedalGraphics.fillStyle(0xFFD700, 1);
    this.peaceMedalGraphics.fillTriangle(medalX - 5, medalY - 40, medalX + 5, medalY - 42, medalX + 5, medalY - 38);
  }

  hidePeaceMedal(): void {
    if (this.peaceMedalGraphics) {
      this.peaceMedalGraphics.destroy();
      this.peaceMedalGraphics = null;
    }
  }

  private drawOilPlatformBase(): void {
    const platX = this.x;
    const baseY = this.y;

    // Platform legs going down into water
    this.graphics.lineStyle(4, 0x666666, 1);
    this.graphics.lineBetween(platX - 40, baseY, platX - 40, baseY + 60);
    this.graphics.lineBetween(platX + 40, baseY, platX + 40, baseY + 60);
    this.graphics.lineBetween(platX - 20, baseY, platX - 25, baseY + 60);
    this.graphics.lineBetween(platX + 20, baseY, platX + 25, baseY + 60);

    // Cross braces on legs
    this.graphics.lineStyle(2, 0x555555, 1);
    this.graphics.lineBetween(platX - 40, baseY + 20, platX - 25, baseY + 30);
    this.graphics.lineBetween(platX + 40, baseY + 20, platX + 25, baseY + 30);

    // Main platform deck
    this.graphics.fillStyle(0x777777, 1);
    this.graphics.fillRect(platX - 50, baseY - 8, 100, 12);
    this.graphics.lineStyle(2, 0x555555, 1);
    this.graphics.strokeRect(platX - 50, baseY - 8, 100, 12);

    // Control room / small building
    this.graphics.fillStyle(0x888888, 1);
    this.graphics.fillRect(platX - 35, baseY - 25, 25, 17);
    this.graphics.lineStyle(1, 0x666666, 1);
    this.graphics.strokeRect(platX - 35, baseY - 25, 25, 17);
    // Window
    this.graphics.fillStyle(0x4488FF, 1);
    this.graphics.fillRect(platX - 30, baseY - 22, 8, 6);

    // Note: Oil tower is created separately as a bombable OilTower object
  }

  getBody(): MatterJS.BodyType {
    return this.matterBody;
  }

  destroy(): void {
    this.graphics.destroy();
    if (this.peaceMedalGraphics) {
      this.peaceMedalGraphics.destroy();
    }
    const matterScene = this.padScene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
    matterScene.matter.world.remove(this.matterBody);
  }
}
