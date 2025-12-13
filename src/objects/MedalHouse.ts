import Phaser from 'phaser';

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
    const houseIndex = Math.floor(Math.random() * 2);
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
    this.collisionWidth = textureWidth * baseScale * 0.85;
    this.collisionHeight = textureHeight * baseScale * 0.95;

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

  // Explode when bombed - same crumbling effect as CountryDecoration
  explode(): { name: string; points: number; textureKey: string; country: string } {
    if (this.isDestroyed) return { name: this.buildingName, points: 0, textureKey: this.texture.key, country: this.country };

    this.isDestroyed = true;

    // Remove physics body
    if (this.matterBody) {
      const matterScene = this.scene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
      matterScene.matter.world.remove(this.matterBody);
      this.matterBody = null;
    }

    const scene = this.scene;
    const x = this.x;
    const groundY = this.y;
    const buildingTop = this.y - this.displayHeight;
    const centerY = this.y - this.displayHeight / 2;
    const textureKey = this.texture.key;
    const sourceImage = this.texture.getSourceImage();
    const textureWidth = sourceImage.width;
    const textureHeight = sourceImage.height;
    const scale = this.scaleX;
    const buildingWidth = this.displayWidth;
    const buildingHeight = this.displayHeight;

    // ============ PHASE 1: BOMB EXPLODES ============
    const flash = scene.add.graphics();
    flash.setPosition(x, centerY);
    flash.fillStyle(0xFF6600, 1);
    flash.fillCircle(0, 0, 50);
    flash.fillStyle(0xFFFF00, 1);
    flash.fillCircle(0, 0, 35);
    flash.fillStyle(0xFFFFFF, 1);
    flash.fillCircle(0, 0, 15);
    flash.setDepth(100);

    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // ============ PHASE 2 & 3: CREATE DEBRIS PIECES ============
    const numPieces = 70;
    const pieceData: {
      key: string;
      worldX: number;
      worldY: number;
    }[] = [];

    for (let i = 0; i < numPieces; i++) {
      const pieceTexW = 30 + Math.floor(Math.random() * 80);
      const pieceTexH = 25 + Math.floor(Math.random() * 70);
      const texX = Math.floor(Math.random() * (textureWidth - pieceTexW));
      const texY = Math.floor(Math.random() * (textureHeight - pieceTexH));

      const key = `${textureKey}_piece_${i}_${Date.now()}_${Math.random()}`;
      const pieceRT = scene.make.renderTexture({ width: pieceTexW, height: pieceTexH }, false);
      pieceRT.draw(textureKey, -texX, -texY);
      pieceRT.saveTexture(key);
      pieceRT.destroy();

      const ratioX = texX / textureWidth;
      const ratioY = texY / textureHeight;
      const worldX = x - buildingWidth / 2 + ratioX * buildingWidth + (pieceTexW * scale) / 2;
      const worldY = buildingTop + ratioY * buildingHeight + (pieceTexH * scale) / 2;

      pieceData.push({ key, worldX, worldY });
    }

    // Hide building immediately
    this.setVisible(false);

    scene.time.delayedCall(0, () => {
      const pieces: { sprite: Phaser.GameObjects.Sprite; startY: number }[] = [];

      for (const data of pieceData) {
        const piece = scene.add.sprite(data.worldX, data.worldY, data.key);
        piece.setScale(scale);
        piece.setDepth(6);
        piece.setOrigin(0.5, 0.5);
        pieces.push({ sprite: piece, startY: data.worldY });
      }

      pieces.sort((a, b) => a.startY - b.startY);

      const explosionX = x;
      const explosionY = groundY;

      pieces.forEach((piece) => {
        const dx = piece.sprite.x - explosionX;
        const dy = piece.sprite.y - explosionY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.sqrt(buildingWidth * buildingWidth + buildingHeight * buildingHeight);
        const forceMult = 1.2 - (dist / maxDist) * 0.5;

        const forceX = (dx / dist) * 70 * forceMult + (Math.random() - 0.5) * 40;
        const forceY = (dy / dist) * 50 * forceMult - 30;

        const delay = (dist / maxDist) * 200;
        const targetY = groundY - 2 - Math.random() * 10;
        const targetX = piece.sprite.x + forceX * 1.5 + (Math.random() - 0.5) * 20;

        scene.time.delayedCall(delay, () => {
          scene.tweens.add({
            targets: piece.sprite,
            x: piece.sprite.x + forceX,
            y: piece.sprite.y + forceY,
            rotation: (Math.random() - 0.5) * 0.8,
            duration: 150,
            ease: 'Quad.easeOut',
            onComplete: () => {
              const fallDist = targetY - piece.sprite.y;
              const duration = Math.max(200, Math.min(500, Math.abs(fallDist) * 2));

              scene.tweens.add({
                targets: piece.sprite,
                y: targetY,
                x: targetX,
                rotation: (Math.random() - 0.5) * 1.5,
                scaleX: scale * (0.5 + Math.random() * 0.5),
                scaleY: scale * (0.3 + Math.random() * 0.4),
                duration: duration,
                ease: 'Quad.easeIn',
              });
            },
          });
        });
      });

      // Immediate thick smoke burst during explosion
      for (let i = 0; i < 25; i++) {
        const smokeX = x + (Math.random() - 0.5) * buildingWidth;
        const smokeY = groundY - Math.random() * buildingHeight * 0.6;
        const smoke = scene.add.circle(smokeX, smokeY, 12 + Math.random() * 20, 0x444444, 0.6 + Math.random() * 0.3);
        smoke.setDepth(7);

        scene.tweens.add({
          targets: smoke,
          y: smokeY - 40 - Math.random() * 60,
          x: smokeX + (Math.random() - 0.5) * 40,
          alpha: 0,
          scale: 2.5 + Math.random() * 1.5,
          duration: 1000 + Math.random() * 600,
          ease: 'Power1',
          onComplete: () => smoke.destroy(),
        });
      }

      // Dust cloud when pieces land
      scene.time.delayedCall(350, () => {
        for (let i = 0; i < 18; i++) {
          const dustX = x + (Math.random() - 0.5) * buildingWidth * 0.9;
          const dust = scene.add.circle(dustX, groundY - 3, 10 + Math.random() * 15, 0x666666, 0.5);
          dust.setDepth(5);

          scene.tweens.add({
            targets: dust,
            y: groundY - 25 - Math.random() * 20,
            x: dustX + (Math.random() - 0.5) * 25,
            alpha: 0,
            scale: 2.2,
            duration: 800 + Math.random() * 400,
            ease: 'Power1',
            onComplete: () => dust.destroy(),
          });
        }
      });

      // Lingering smoke at the base - 12 waves over 10 seconds for long-lasting effect
      scene.time.delayedCall(300, () => {
        for (let wave = 0; wave < 12; wave++) {
          scene.time.delayedCall(wave * 800, () => {
            // Fewer particles per wave as time goes on (fire dying down)
            const particleCount = Math.max(3, 8 - Math.floor(wave / 2));
            for (let i = 0; i < particleCount; i++) {
              const smokeX = x + (Math.random() - 0.5) * buildingWidth * 0.7;
              // Smoke gets lighter/less opaque as fire dies
              const baseOpacity = Math.max(0.15, 0.4 - wave * 0.02);
              const smoke = scene.add.circle(smokeX, groundY - 5, 8 + Math.random() * 12, 0x555555, baseOpacity + Math.random() * 0.15);
              smoke.setDepth(4);

              scene.tweens.add({
                targets: smoke,
                y: groundY - 30 - Math.random() * 40,
                x: smokeX + (Math.random() - 0.5) * 35,
                alpha: 0,
                scale: 2 + Math.random() * 1,
                duration: 1500 + Math.random() * 800,
                ease: 'Power1',
                onComplete: () => smoke.destroy(),
              });
            }
          });
        }
      });

      // Air pollution - persistent smoke haze using particle emitter (like chemtrails)
      // Create a stationary emitter for long-lasting pollution particles
      const pollutionEmitter = scene.add.particles(0, 0, 'particle', {
        speed: { min: 5, max: 15 }, // Very slow drift (same as chemtrails)
        angle: { min: 0, max: 360 }, // Random drift direction (same as chemtrails)
        scale: { start: 0.4, end: 0.1 }, // Same size as chemtrails
        alpha: { start: 0.3, end: 0 }, // Same alpha as chemtrails
        lifespan: 60000, // 1 minute (same as chemtrails)
        blendMode: Phaser.BlendModes.NORMAL,
        frequency: -1, // Manual emission only
        tint: [0x555555, 0x666666, 0x777777, 0x444444], // Same grey colors as chemtrails
      });
      pollutionEmitter.setDepth(3);

      // Emit pollution particles over time from bomb site
      scene.time.delayedCall(300, () => {
        for (let wave = 0; wave < 15; wave++) {
          scene.time.delayedCall(wave * 400, () => {
            const particleCount = Math.max(2, 6 - Math.floor(wave / 3));
            for (let i = 0; i < particleCount; i++) {
              const emitX = x + (Math.random() - 0.5) * buildingWidth;
              const emitY = groundY - Math.random() * buildingHeight * 0.7;
              pollutionEmitter.emitParticleAt(emitX, emitY, 1);
            }
          });
        }
      });

      // Clean up emitter after all particles have faded (60s lifespan + 6s emission time)
      scene.time.delayedCall(70000, () => {
        pollutionEmitter.destroy();
      });
    });

    return { name: this.buildingName, points: this.pointValue, textureKey: this.texture.key, country: this.country };
  }
}
