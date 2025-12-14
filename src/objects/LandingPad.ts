import Phaser from 'phaser';
import { COLORS } from '../constants';

export class LandingPad {
  private padScene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private flagGraphics: Phaser.GameObjects.Graphics;
  private matterBody: MatterJS.BodyType;
  private peaceMedalGraphics: Phaser.GameObjects.Graphics | null = null;

  public x: number;
  public y: number;
  public width: number;
  public name: string;
  public country: string;
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
    country: string = '',
    isFinalDestination: boolean = false,
    isWashington: boolean = false,
    isOilPlatform: boolean = false
  ) {
    this.padScene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.name = name;
    this.country = country;
    this.isFinalDestination = isFinalDestination;
    this.isWashington = isWashington;
    this.isOilPlatform = isOilPlatform;
    // Check if this is a fuel depot based on name (but not the oil platform)
    this.isFuelDepot = !isOilPlatform && (name.includes('Fuel') || name.includes('Gas') || name.includes('Depot') || name.includes('Station'));

    this.graphics = scene.add.graphics();
    this.flagGraphics = scene.add.graphics();

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
    this.drawCountryFlag();
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

  private drawCountryFlag(): void {
    if (!this.country) return;

    // All landing pads get flags - flag is on the LEFT side so it doesn't overlap with oil towers on RIGHT

    const halfWidth = this.width / 2;

    // Position flag to the LEFT of the landing pad to avoid conflicts
    // This also looks better and avoids oil tower overlap
    const flagX = this.x - halfWidth - 30; // To the left of the left pole
    const flagY = this.y - 50; // Flag top position
    const poleHeight = 60;
    const flagWidth = 24;
    const flagHeight = 16;

    // Flagpole
    this.flagGraphics.lineStyle(3, 0x666666, 1);
    this.flagGraphics.lineBetween(flagX, flagY + poleHeight, flagX, flagY);

    // Pole top ball
    this.flagGraphics.fillStyle(0x888888, 1);
    this.flagGraphics.fillCircle(flagX, flagY, 3);

    // Flag position (attached at top of pole, extends to the left)
    const fy = flagY + 5;

    // Helper to draw horizontal stripe (flag extends LEFT from pole)
    const drawStripe = (color: number, yOffset: number, stripeHeight: number) => {
      this.flagGraphics.fillStyle(color, 1);
      this.flagGraphics.fillRect(flagX - flagWidth, fy + yOffset, flagWidth, stripeHeight);
    };

    // Helper to draw vertical stripe (flag extends LEFT from pole)
    const drawVerticalStripe = (color: number, xOffset: number, stripeWidth: number) => {
      this.flagGraphics.fillStyle(color, 1);
      this.flagGraphics.fillRect(flagX - flagWidth + xOffset, fy, stripeWidth, flagHeight);
    };

    // Flag left edge (flag extends left from pole)
    const fx = flagX - flagWidth;

    switch (this.country) {
      case 'Washington DC':
      case 'USA':
        // US Flag simplified - blue field with red/white stripes
        drawStripe(0xB22234, 0, flagHeight); // Red background
        // White stripes
        for (let i = 0; i < 7; i += 2) {
          drawStripe(0xFFFFFF, i * (flagHeight / 13) * 2, flagHeight / 13);
        }
        // Blue canton (top-left of flag, which is now the far left)
        this.flagGraphics.fillStyle(0x3C3B6E, 1);
        this.flagGraphics.fillRect(fx, fy, flagWidth * 0.4, flagHeight * 0.5);
        break;

      case 'Atlantic Ocean':
        // International maritime flag - blue with white
        drawStripe(0x003399, 0, flagHeight);
        break;

      case 'United Kingdom':
        // Union Jack
        drawStripe(0x012169, 0, flagHeight); // Blue background
        // White diagonals
        this.flagGraphics.lineStyle(3, 0xFFFFFF, 1);
        this.flagGraphics.lineBetween(fx, fy, fx + flagWidth, fy + flagHeight);
        this.flagGraphics.lineBetween(fx, fy + flagHeight, fx + flagWidth, fy);
        // Red diagonals
        this.flagGraphics.lineStyle(1.5, 0xC8102E, 1);
        this.flagGraphics.lineBetween(fx, fy, fx + flagWidth, fy + flagHeight);
        this.flagGraphics.lineBetween(fx, fy + flagHeight, fx + flagWidth, fy);
        // White cross
        this.flagGraphics.lineStyle(4, 0xFFFFFF, 1);
        this.flagGraphics.lineBetween(fx + flagWidth / 2, fy, fx + flagWidth / 2, fy + flagHeight);
        this.flagGraphics.lineBetween(fx, fy + flagHeight / 2, fx + flagWidth, fy + flagHeight / 2);
        // Red cross
        this.flagGraphics.lineStyle(2, 0xC8102E, 1);
        this.flagGraphics.lineBetween(fx + flagWidth / 2, fy, fx + flagWidth / 2, fy + flagHeight);
        this.flagGraphics.lineBetween(fx, fy + flagHeight / 2, fx + flagWidth, fy + flagHeight / 2);
        break;

      case 'France':
        // French tricolor (vertical)
        const fw3 = flagWidth / 3;
        drawVerticalStripe(0x002395, 0, fw3); // Blue
        drawVerticalStripe(0xFFFFFF, fw3, fw3); // White
        drawVerticalStripe(0xED2939, fw3 * 2, fw3); // Red
        break;

      case 'Switzerland':
        // Swiss flag - red with white cross
        drawStripe(0xDA291C, 0, flagHeight); // Red background
        // White cross using lines (centered in flag)
        const swCenterX = fx + flagWidth / 2;
        const swCenterY = fy + flagHeight / 2;
        this.flagGraphics.lineStyle(4, 0xFFFFFF, 1);
        // Vertical bar
        this.flagGraphics.lineBetween(swCenterX, fy + 2, swCenterX, fy + flagHeight - 2);
        // Horizontal bar
        this.flagGraphics.lineBetween(fx + 4, swCenterY, fx + flagWidth - 4, swCenterY);
        break;

      case 'Germany':
        // German flag (horizontal)
        const fh3 = flagHeight / 3;
        drawStripe(0x000000, 0, fh3); // Black
        drawStripe(0xDD0000, fh3, fh3); // Red
        drawStripe(0xFFCC00, fh3 * 2, fh3); // Gold
        break;

      case 'Poland':
        // Polish flag (horizontal)
        drawStripe(0xFFFFFF, 0, flagHeight / 2); // White
        drawStripe(0xDC143C, flagHeight / 2, flagHeight / 2); // Red
        break;

      case 'Russia':
        // Russian flag (horizontal)
        const rfh = flagHeight / 3;
        drawStripe(0xFFFFFF, 0, rfh); // White
        drawStripe(0x0039A6, rfh, rfh); // Blue
        drawStripe(0xD52B1E, rfh * 2, rfh); // Red
        break;

      default:
        // Generic gray flag
        drawStripe(0x888888, 0, flagHeight);
        break;
    }

    // Flag border
    this.flagGraphics.lineStyle(1, 0x333333, 0.5);
    this.flagGraphics.strokeRect(fx, fy, flagWidth, flagHeight);
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
    const halfWidth = this.width / 2;

    // Extended platform to the left for flag (flag is at x - halfWidth - 30)
    const leftExtension = halfWidth + 40; // Extra space for flag pole

    // Extended right side for oil tower
    const rightExtension = halfWidth + 45;

    // Platform legs going down into water
    this.graphics.lineStyle(4, 0x666666, 1);
    this.graphics.lineBetween(platX - leftExtension + 10, baseY, platX - leftExtension + 5, baseY + 60);
    this.graphics.lineBetween(platX - 40, baseY, platX - 40, baseY + 60);
    this.graphics.lineBetween(platX + 40, baseY, platX + 40, baseY + 60);
    this.graphics.lineBetween(platX - 20, baseY, platX - 25, baseY + 60);
    this.graphics.lineBetween(platX + 20, baseY, platX + 25, baseY + 60);
    // Right side leg for oil tower support
    this.graphics.lineBetween(platX + rightExtension - 10, baseY, platX + rightExtension - 5, baseY + 60);

    // Cross braces on legs
    this.graphics.lineStyle(2, 0x555555, 1);
    this.graphics.lineBetween(platX - leftExtension + 10, baseY + 20, platX - 40, baseY + 30);
    this.graphics.lineBetween(platX - 40, baseY + 20, platX - 25, baseY + 30);
    this.graphics.lineBetween(platX + 40, baseY + 20, platX + 25, baseY + 30);
    // Right side cross brace
    this.graphics.lineBetween(platX + 40, baseY + 20, platX + rightExtension - 10, baseY + 30);

    // Main platform deck (extended left for flag, extended right for oil tower)
    this.graphics.fillStyle(0x777777, 1);
    this.graphics.fillRect(platX - leftExtension, baseY - 8, leftExtension + rightExtension, 12);
    this.graphics.lineStyle(2, 0x555555, 1);
    this.graphics.strokeRect(platX - leftExtension, baseY - 8, leftExtension + rightExtension, 12);

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
    this.flagGraphics.destroy();
    if (this.peaceMedalGraphics) {
      this.peaceMedalGraphics.destroy();
    }
    const matterScene = this.padScene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
    matterScene.matter.world.remove(this.matterBody);
  }
}
