import Phaser from 'phaser';
import { COUNTRIES, GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { createExplosion } from '../utils/ExplosionUtils';

// Country-specific colors matching their flags
const BIPLANE_COLORS: Record<string, { primary: number; secondary: number; accent: number }> = {
  'USA': { primary: 0xFFFFFF, secondary: 0xB22234, accent: 0x3C3B6E },
  'United Kingdom': { primary: 0xFFFFFF, secondary: 0xC8102E, accent: 0x012169 },
  'France': { primary: 0xFFFFFF, secondary: 0x0055A4, accent: 0xEF4135 },
  'Switzerland': { primary: 0xFFFFFF, secondary: 0xDA291C, accent: 0xDA291C }, // White and red
  'Germany': { primary: 0xFFCC00, secondary: 0x000000, accent: 0xDD0000 },
  'Poland': { primary: 0xFFFFFF, secondary: 0xDC143C, accent: 0xDC143C },
  'Russia': { primary: 0xFFFFFF, secondary: 0x0039A6, accent: 0xD52B1E },
  'GAME_INFO': { primary: 0xCCCCCC, secondary: 0x888888, accent: 0x666666 }, // Neutral gray
};

// Country to propaganda item type mapping
const PROPAGANDA_TYPES: Record<string, string> = {
  'USA': 'USA_PROPAGANDA',
  'United Kingdom': 'UK_PROPAGANDA',
  'France': 'FRANCE_PROPAGANDA',
  'Germany': 'GERMANY_PROPAGANDA',
  'Poland': 'POLAND_PROPAGANDA',
  'Russia': 'RUSSIA_PROPAGANDA',
};

// Country-specific dark humor messages
const BANNER_MESSAGES: Record<string, string[]> = {
  'USA': [
    "FREEDOM ISN'T FREE - $19.99/MONTH",
    "THOUGHTS AND PRAYERS INCLUDED",
    "MAKE LANDINGS GREAT AGAIN",
    "HEALTHCARE? JUST DON'T CRASH",
    "SPONSORED BY BIG OIL",
    "SECOND AMENDMENT APPLIES TO MISSILES",
    "STUDENT DEBT FOLLOWS YOU TO ЯUSSIA",
    "OIL DETECTED - DEMOCRACY INBOUND",
  ],
  'United Kingdom': [
    "BREXIT MEANS BREXIT MEANS CRASH",
    "QUEUE HERE FOR FIERY DEATH",
    "KEEP CALM AND AVOID TEACUPS",
    "SORRY FOR THE COLONIALISM LOL",
    "NHS WAIT TIME: 6-8 WEEKS",
    "MIND THE GAP (IN YOUR FUEL TANK)",
    "TEA BREAK? NOT WHILE FLYING",
  ],
  'France': [
    "SURRENDER IS ALWAYS AN OPTION",
    "BAGUETTES: WEAPONIZED SINCE 1789",
    "ON STRIKE - FLY YOURSELF",
    "LIBERTÉ, ÉGALITÉ, CRASHÉ",
    "35-HOUR FLIGHT WEEK ONLY",
    "WINE PAIRS WELL WITH EXPLOSIONS",
    "REVOLUTION TIME? OUI OUI",
  ],
  'Switzerland': [
    "NEUTRAL ON YOUR CRASH LANDING",
    "CHOCOLATE TASTES BETTER AT ALTITUDE",
    "SWISS BANK: YOUR WRECKAGE IS SECURE",
    "CUCKOO CLOCK SAYS TIME TO DIE",
    "FONDUE YOUR FUEL TANK",
    "MOUNTAINS DON'T MOVE FOR YOU",
    "ARMY KNIFE WON'T FIX THIS",
    "CHEESE HAS MORE HOLES THAN YOUR HULL",
  ],
  'Germany': [
    "EFFICIENCY IS MANDATORY",
    "AUTOBAHN RULES DON'T APPLY HERE",
    "ORDNUNG MUSS SEIN - THEN DIE",
    "PRETZEL VELOCITY: LETHAL",
    "NO HUMOR ZONE - KEEP MOVING",
    "BEER BREAK AT CRASH SITE",
    "VOLKSWAGEN: NOW WITH WINGS",
  ],
  'Poland': [
    "CANNOT INTO SPACE BUT CAN INTO YOU",
    "PIEROGI POWER UNLIMITED",
    "KURWA! WATCH THE BUILDINGS",
    "PARTITION THIS, GERMANY",
    "SOLIDARITY WITH YOUR SMOKING WRECK",
    "POPE APPROVED FLIGHT PATH",
    "KIELBASA FUELED AVIATION",
  ],
  'Russia': [
    "JOIN GRU TODAY - GREAT BENEFITS, NO WINDOWS",
    "IN SOVIET ЯUSSIA, PLANE LANDS YOU",
    "FREE POLONIUM TEA AT DESTINATION",
    "WINDOW ACCIDENTS OOO - WE PUSH BOUNDARIES",
    "KREMLIN HR: 0 DAYS SINCE ACCIDENT",
    "GULAG AIRLINES - ONE WAY ONLY",
    "NOVICHOK: NOW IN AEROSOL",
    "FALL FROM BUILDING? VERY TRAGIC SUICIDE",
    "DEMOCRACY IS WESTERN PROPAGANDA",
    "VODKA: BOTH FUEL AND PILOT",
    "NORD STREAM: SELF-DESTRUCTING PIPELINES",
    "PRIGOZHIN AIR - FLIGHTS MAY BE SHORT",
  ],
  'GAME_INFO': [
    "TIP: PRESS 2 FOR MULTIPLAYER MODE",
    "TIP: PRESS 3 FOR DOGFIGHT MODE",
    "TIP: TRADE ITEMS FOR FUEL AT LANDING PADS",
    "TIP: REACH RUSSIA TO WIN",
    "TIP: HIDDEN ACHIEVEMENTS AWAIT DISCOVERY",
    "TIP: PLAYING ON MOBILE IS POSSIBLE BUT EVEN HARDER",
  ],
};

// Valid countries for biplane spawning (excluding Washington DC and Atlantic Ocean)
const VALID_COUNTRIES = ['USA', 'United Kingdom', 'France', 'Switzerland', 'Germany', 'Poland', 'Russia'];

export class Biplane extends Phaser.GameObjects.Container {
  public isDestroyed: boolean = false;
  public readonly pointValue: number = 1000;
  public readonly planeName: string;
  public country: string;

  private graphics: Phaser.GameObjects.Graphics;
  private bannerContainer: Phaser.GameObjects.Container;
  private propellerAngle: number = 0;
  private colors: { primary: number; secondary: number; accent: number };
  private message: string;
  private direction: number; // 1 = right, -1 = left
  private speed: number = 2.5;
  private isWaiting: boolean = false;
  private waitTimer: Phaser.Time.TimerEvent | null = null;
  private collisionWidth: number = 70;
  private collisionHeight: number = 35;
  private baseY: number;
  private propellerGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, targetCountry: string, cameraX: number, spawnCountry?: string) {
    // Use spawn country for position, target country for colors/messages
    const positionCountry = spawnCountry || targetCountry;
    const countryData = COUNTRIES.find(c => c.name === positionCountry)!;
    const nextCountry = COUNTRIES.find(c => c.startX > countryData.startX);

    const countryStartX = countryData.startX;
    const countryEndX = nextCountry ? nextCountry.startX : countryData.startX + 6000;

    // Spawn just off-screen in the direction opposite to where player came from
    // If player is to the left of country center, spawn on the right side (and fly left)
    // If player is to the right of country center, spawn on the left side (and fly right)
    const countryCenter = countryStartX + (countryEndX - countryStartX) / 2;
    const playerComingFromLeft = cameraX < countryCenter;

    // Spawn slightly off-screen on the opposite side
    const spawnX = playerComingFromLeft
      ? countryCenter + 400  // Spawn to the right, will fly left toward player
      : countryCenter - 400; // Spawn to the left, will fly right toward player

    // For Switzerland, spawn much higher to be above the mountains
    // Switzerland mountains can reach y = -1000 or lower
    let spawnY: number;
    if (positionCountry === 'Switzerland') {
      spawnY = -1200 + Math.random() * 40; // Well above the tallest peaks
    } else {
      spawnY = 100 + Math.random() * 40; // 100-140px from top for normal countries
    }

    super(scene, spawnX, spawnY);

    this.country = targetCountry;
    const countryAdjectives: Record<string, string> = {
      'USA': 'American',
      'United Kingdom': 'British',
      'France': 'French',
      'Switzerland': 'Swiss',
      'Germany': 'German',
      'Poland': 'Polish',
      'Russia': 'Russian',
    };
    this.planeName = targetCountry === 'GAME_INFO' ? 'Gameplay Propaganda Plane' : `${countryAdjectives[targetCountry] || targetCountry} Propaganda Plane`;
    this.baseY = spawnY;
    this.colors = BIPLANE_COLORS[targetCountry] || BIPLANE_COLORS['USA'];

    // Pick random message for this country/type
    const messages = BANNER_MESSAGES[targetCountry] || BANNER_MESSAGES['USA'];
    this.message = messages[Math.floor(Math.random() * messages.length)];

    // Fly toward the player
    this.direction = playerComingFromLeft ? -1 : 1;

    // Static body graphics (drawn once)
    this.graphics = new Phaser.GameObjects.Graphics(scene);
    // Animated propeller graphics (cleared and redrawn each frame)
    this.propellerGraphics = new Phaser.GameObjects.Graphics(scene);
    this.bannerContainer = new Phaser.GameObjects.Container(scene, 0, 0);

    this.add(this.graphics);
    this.add(this.propellerGraphics);
    this.add(this.bannerContainer);

    this.drawBiplaneBody(); // Static - only called once
    this.drawPropeller();   // Animated - called each frame
    this.createBanner();
    this.setDepth(5); // Below shuttle but visible

    // Flip if going left
    if (this.direction === -1) {
      this.setScale(-1, 1);
    }

    scene.add.existing(this);
  }

  private drawBiplaneBody(): void {
    // Static body - only drawn once, not every frame
    this.graphics.setDepth(200);

    const { primary, secondary, accent } = this.colors;

    // === BIPLANE PAINTED IN COUNTRY FLAG COLORS ===

    // UPPER WING - 3 color stripes like a flag
    this.graphics.fillStyle(primary, 1);
    this.graphics.fillRect(-32, -14, 21, 6);
    this.graphics.fillStyle(secondary, 1);
    this.graphics.fillRect(-11, -14, 22, 6);
    this.graphics.fillStyle(accent, 1);
    this.graphics.fillRect(11, -14, 21, 6);
    this.graphics.lineStyle(1, 0x222222, 0.8);
    this.graphics.strokeRect(-32, -14, 64, 6);

    // WING STRUTS (simple vertical lines)
    this.graphics.lineStyle(3, 0x8B4513, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(-18, -8);
    this.graphics.lineTo(-18, 6);
    this.graphics.moveTo(18, -8);
    this.graphics.lineTo(18, 6);
    this.graphics.strokePath();

    // FUSELAGE - primary color with secondary stripe
    this.graphics.fillStyle(primary, 1);
    this.graphics.fillRoundedRect(-28, -5, 56, 12, 3);

    // Fuselage stripe in secondary color
    this.graphics.fillStyle(secondary, 1);
    this.graphics.fillRect(-20, -1, 40, 4);

    // Fuselage outline
    this.graphics.lineStyle(1.5, 0x222222, 0.8);
    this.graphics.strokeRoundedRect(-28, -5, 56, 12, 3);

    // LOWER WING - 3 color stripes like a flag
    this.graphics.fillStyle(primary, 1);
    this.graphics.fillRect(-26, 6, 17, 5);
    this.graphics.fillStyle(secondary, 1);
    this.graphics.fillRect(-9, 6, 18, 5);
    this.graphics.fillStyle(accent, 1);
    this.graphics.fillRect(9, 6, 17, 5);
    this.graphics.lineStyle(1, 0x222222, 0.8);
    this.graphics.strokeRect(-26, 6, 52, 5);

    // ENGINE (dark cylinder at front)
    this.graphics.fillStyle(0x444444, 1);
    this.graphics.fillCircle(30, 1, 7);
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillCircle(32, 1, 5);

    // COCKPIT (open cockpit with pilot)
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(2, -8, 14, 6);

    // Pilot (simple circle head with goggles)
    this.graphics.fillStyle(0xFFDBAC, 1);
    this.graphics.fillCircle(9, -6, 4);
    this.graphics.fillStyle(0x8B4513, 1);
    this.graphics.fillCircle(9, -8, 3); // Leather cap
    this.graphics.fillStyle(0x222222, 1);
    this.graphics.fillRect(7, -7, 5, 2); // Goggles

    // TAIL FIN (vertical) - accent color
    this.graphics.fillStyle(accent, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(-24, -5);
    this.graphics.lineTo(-30, -12);
    this.graphics.lineTo(-30, -5);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.lineStyle(1, 0x222222, 0.8);
    this.graphics.strokePath();

    // TAIL STABILIZER (horizontal) - secondary color
    this.graphics.fillStyle(secondary, 1);
    this.graphics.fillRect(-34, 0, 12, 3);
    this.graphics.lineStyle(1, 0x222222, 0.8);
    this.graphics.strokeRect(-34, 0, 12, 3);

    // LANDING GEAR (simple)
    this.graphics.lineStyle(2, 0x666666, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(-6, 10);
    this.graphics.lineTo(-10, 18);
    this.graphics.moveTo(6, 10);
    this.graphics.lineTo(10, 18);
    this.graphics.strokePath();

    // Wheels
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillCircle(-10, 20, 4);
    this.graphics.fillCircle(10, 20, 4);
    this.graphics.fillStyle(0x666666, 1);
    this.graphics.fillCircle(-10, 20, 2);
    this.graphics.fillCircle(10, 20, 2);

    // Tail wheel
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillCircle(-32, 5, 2);
  }

  private drawPropeller(): void {
    // Draw propeller once centered at (0,0), position graphics at hub location
    // Then use setAngle() to rotate instead of clearing/redrawing
    if (!this.propellerGraphics) return;

    this.propellerGraphics.clear();
    this.propellerGraphics.setDepth(201); // Above body
    this.propellerGraphics.setPosition(36, 1); // Position at hub

    // Propeller hub (at center of graphics)
    this.propellerGraphics.fillStyle(0x444444, 1);
    this.propellerGraphics.fillCircle(0, 0, 3);

    // Draw 2-blade propeller (simple wooden blades) - draw at 0 angle, rotate with setAngle
    const bladeLength = 16;

    for (let i = 0; i < 2; i++) {
      const angle = i * Math.PI; // 0 and PI (opposite blades)
      const endX = Math.cos(angle) * bladeLength;
      const endY = Math.sin(angle) * bladeLength;

      // Wooden blade
      this.propellerGraphics.lineStyle(4, 0xDEB887, 1);
      this.propellerGraphics.beginPath();
      this.propellerGraphics.moveTo(0, 0);
      this.propellerGraphics.lineTo(endX, endY);
      this.propellerGraphics.strokePath();

      // Dark edge
      this.propellerGraphics.lineStyle(1, 0x8B4513, 0.6);
      this.propellerGraphics.beginPath();
      this.propellerGraphics.moveTo(0, 0);
      this.propellerGraphics.lineTo(endX, endY);
      this.propellerGraphics.strokePath();
    }

    // Blur disc when spinning
    this.propellerGraphics.lineStyle(1, 0xDEB887, 0.12);
    this.propellerGraphics.strokeCircle(0, 0, bladeLength - 1);
  }

  private updatePropellerRotation(): void {
    // Just rotate the existing graphics - no redraw needed
    if (this.propellerGraphics) {
      this.propellerGraphics.setAngle(Phaser.Math.RadToDeg(this.propellerAngle));
    }
  }

  private createBanner(): void {
    // Clear previous banner
    this.bannerContainer.removeAll(true);

    const textWidth = this.message.length * 11;
    const bannerWidth = Math.max(textWidth + 40, 140);
    const bannerHeight = 30;
    const ropeLength = 50;

    // Banner position (behind the plane)
    const bannerX = -42 - ropeLength - bannerWidth / 2;
    const bannerY = 3;

    // Create tow rope
    const ropeGraphics = new Phaser.GameObjects.Graphics(this.scene);
    ropeGraphics.lineStyle(2, 0x8B4513, 1);
    ropeGraphics.beginPath();
    ropeGraphics.moveTo(-36, 1);
    // Slightly curved rope
    ropeGraphics.lineTo(-50, 3);
    ropeGraphics.lineTo(-65, 2);
    ropeGraphics.lineTo(-80, 4);
    ropeGraphics.lineTo(bannerX + bannerWidth / 2 + 5, bannerY);
    ropeGraphics.strokePath();
    this.bannerContainer.add(ropeGraphics);

    // Banner
    const bannerGraphics = new Phaser.GameObjects.Graphics(this.scene);

    // Banner shadow
    bannerGraphics.fillStyle(0x000000, 0.15);
    bannerGraphics.fillRoundedRect(
      bannerX - bannerWidth / 2 + 2,
      bannerY - bannerHeight / 2 + 2,
      bannerWidth,
      bannerHeight,
      3
    );

    // Main banner (cream/white)
    bannerGraphics.fillStyle(0xFFFFF5, 1);
    bannerGraphics.fillRoundedRect(
      bannerX - bannerWidth / 2,
      bannerY - bannerHeight / 2,
      bannerWidth,
      bannerHeight,
      3
    );

    // Banner border (country accent color)
    bannerGraphics.lineStyle(2.5, this.colors.accent, 1);
    bannerGraphics.strokeRoundedRect(
      bannerX - bannerWidth / 2,
      bannerY - bannerHeight / 2,
      bannerWidth,
      bannerHeight,
      3
    );

    // Inner accent line
    bannerGraphics.lineStyle(1, this.colors.secondary, 0.4);
    bannerGraphics.strokeRoundedRect(
      bannerX - bannerWidth / 2 + 3,
      bannerY - bannerHeight / 2 + 3,
      bannerWidth - 6,
      bannerHeight - 6,
      2
    );

    this.bannerContainer.add(bannerGraphics);

    // Banner text
    const bannerText = new Phaser.GameObjects.Text(this.scene, bannerX, bannerY, this.message, {
      fontSize: '14px',
      fontFamily: 'Arial Black, Arial',
      color: '#1a1a1a',
      fontStyle: 'bold',
    });
    bannerText.setOrigin(0.5, 0.5);

    // Keep text readable when plane flips
    if (this.direction === -1) {
      bannerText.setScale(-1, 1);
    }

    this.bannerContainer.add(bannerText);

    // Attachment grommet
    const grommetGraphics = new Phaser.GameObjects.Graphics(this.scene);
    grommetGraphics.fillStyle(0x888888, 1);
    grommetGraphics.fillCircle(bannerX + bannerWidth / 2 - 3, bannerY, 3);
    grommetGraphics.fillStyle(0x666666, 1);
    grommetGraphics.fillCircle(bannerX + bannerWidth / 2 - 3, bannerY, 1.5);
    this.bannerContainer.add(grommetGraphics);
  }

  update(time: number, _delta: number): void {
    if (this.isDestroyed || this.isWaiting) return;
    if (!this.scene || !this.scene.cameras || !this.scene.cameras.main) return;

    // Move in current direction
    this.x += this.speed * this.direction;

    // Spin propeller fast
    this.propellerAngle += 0.7;

    // Gentle bobbing motion
    const bobOffset = Math.sin(time * 0.003) * 3;
    this.y = this.baseY + bobOffset;

    // Slight pitch variation
    this.rotation = Math.sin(time * 0.002) * 0.02;

    // Rotate propeller (uses setAngle instead of redrawing)
    this.updatePropellerRotation();

    // Check if WAY off screen (relative to camera) - use very large margin
    const camera = this.scene.cameras.main;
    const screenLeft = camera.scrollX - 2000;  // Very large margin
    const screenRight = camera.scrollX + GAME_WIDTH + 2000;

    if (this.x < screenLeft || this.x > screenRight) {
      this.startWaiting();
    }
  }

  private startWaiting(): void {
    this.isWaiting = true;
    this.setVisible(false);
    // Destroy graphics when waiting to prevent stale collision hitbox
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null as any;
    }
    if (this.propellerGraphics) {
      this.propellerGraphics.destroy();
      this.propellerGraphics = null as any;
    }

    // Wait 5 seconds then re-enter
    this.waitTimer = this.scene.time.delayedCall(5000, () => {
      if (this.isDestroyed) return;

      const camera = this.scene.cameras.main;

      // Re-enter from the side we exited
      if (this.direction === 1) {
        this.x = camera.scrollX - 200;
      } else {
        this.x = camera.scrollX + GAME_WIDTH + 200;
      }

      // Recreate graphics before becoming visible to avoid one-frame gap
      this.graphics = new Phaser.GameObjects.Graphics(this.scene);
      this.propellerGraphics = new Phaser.GameObjects.Graphics(this.scene);
      this.add(this.graphics);
      this.add(this.propellerGraphics);
      this.drawBiplaneBody();
      this.drawPropeller();

      this.isWaiting = false;
      this.setVisible(true);
    });
  }

  getCollisionBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.collisionWidth / 2,
      y: this.y - this.collisionHeight / 2,
      width: this.collisionWidth,
      height: this.collisionHeight,
    };
  }

  get isHidden(): boolean {
    return this.isWaiting;
  }

  explode(): { name: string; points: number; bannerPosition: { x: number; y: number }; propagandaType: string; message: string; accentColor: number } {
    if (this.isDestroyed) return { name: this.planeName, points: 0, bannerPosition: { x: this.x, y: this.y }, propagandaType: PROPAGANDA_TYPES[this.country] || 'USA_PROPAGANDA', message: this.message, accentColor: this.colors.accent };

    this.isDestroyed = true;

    if (this.waitTimer) {
      this.waitTimer.destroy();
    }

    const scene = this.scene;
    const x = this.x;
    const y = this.y;

    // Create explosion effect using utility - configured to match original biplane explosion
    // Note: Flash doesn't scale (utility limitation), debris are simple rectangles (not custom shapes),
    // and smoke is single-tone (not dual-tone). Object-specific debris kept for visual accuracy.
    createExplosion(scene, x, y, {
      // Flash config (matches original colors but doesn't scale)
      flashColors: [0xFF6600, 0xFFAA00, 0xFFFF00, 0xFFFFFF],
      flashSizes: [45, 30, 18, 8],
      duration: 350,
      depth: 100,
      // Disable default debris and smoke, use custom below
      includeDebris: false,
      includeSmoke: false,
      shakeCamera: false,
    });

    // Flying debris (plane parts in country colors) - object-specific shapes
    const debrisColors = [this.colors.primary, this.colors.secondary, this.colors.accent, 0x8B4513, 0x333333, 0xDEB887];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const debris = scene.add.graphics();
      const color = debrisColors[i % debrisColors.length];
      debris.fillStyle(color, 1);

      // Random debris shapes (wings, struts, fuselage, wheels, propeller blades)
      const shapeType = i % 6;
      if (shapeType === 0) {
        debris.fillRect(-10, -2, 20, 4); // Wing piece
      } else if (shapeType === 1) {
        debris.fillRect(-1.5, -8, 3, 16); // Strut
      } else if (shapeType === 2) {
        debris.fillEllipse(0, 0, 10, 5); // Fuselage piece
      } else if (shapeType === 3) {
        debris.fillCircle(0, 0, 5); // Wheel
        debris.fillStyle(0x888888, 1);
        debris.fillCircle(0, 0, 2);
      } else if (shapeType === 4) {
        // Propeller blade
        debris.fillRect(-2, -8, 4, 16);
        debris.fillStyle(0x8B4513, 1);
        debris.fillCircle(0, -8, 2);
      } else {
        debris.fillCircle(0, 0, 2 + Math.random() * 3);
      }

      debris.setPosition(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 25);
      debris.setDepth(101);

      const distance = 70 + Math.random() * 80;
      scene.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * distance + (Math.random() - 0.5) * 50,
        y: y + Math.sin(angle) * distance + 150,
        angle: Math.random() * 1440 - 720,
        alpha: 0,
        duration: 1200 + Math.random() * 600,
        ease: 'Quad.easeOut',
        onComplete: () => debris.destroy(),
      });
    }

    // Smoke puffs with dual-tone effect and horizontal drift - object-specific visual effect
    for (let i = 0; i < 12; i++) {
      const smoke = scene.add.graphics();
      const smokeSize = 10 + Math.random() * 18;
      smoke.fillStyle(0x555555, 0.5);
      smoke.fillCircle(0, 0, smokeSize);
      smoke.fillStyle(0x777777, 0.3);
      smoke.fillCircle(smokeSize * 0.3, -smokeSize * 0.3, smokeSize * 0.5);
      smoke.setPosition(
        x + (Math.random() - 0.5) * 60,
        y + (Math.random() - 0.5) * 35
      );
      smoke.setDepth(99);

      scene.tweens.add({
        targets: smoke,
        alpha: 0,
        scale: 3,
        y: smoke.y - 100 - Math.random() * 50,
        x: smoke.x + (Math.random() - 0.5) * 80,
        duration: 1800 + Math.random() * 1000,
        ease: 'Quad.easeOut',
        onComplete: () => smoke.destroy(),
      });
    }

    // Hide the plane
    this.setVisible(false);

    // Return banner info for GameScene to spawn collectible
    return {
      name: this.planeName,
      points: this.pointValue,
      bannerPosition: { x: x - 50, y },
      propagandaType: PROPAGANDA_TYPES[this.country] || 'USA_PROPAGANDA',
      message: this.message,
      accentColor: this.colors.accent,
    };
  }

  destroy(fromScene?: boolean): void {
    if (this.waitTimer) {
      this.waitTimer.destroy();
    }
    if (this.graphics) {
      this.graphics.destroy();
    }
    if (this.bannerContainer) {
      this.bannerContainer.destroy(true);
    }
    super.destroy(fromScene);
  }
}
