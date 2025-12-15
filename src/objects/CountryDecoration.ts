import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { createExplosion } from '../utils/ExplosionUtils';

// Building and landmark names for each country
// Index corresponds to image number (0-15)
export const BUILDING_NAMES: Record<string, string[]> = {
  Washington: [
    'White House', 'Capitol Building', 'Washington Monument', 'Lincoln Memorial',
    'Jefferson Memorial', 'Supreme Court', 'Smithsonian Castle', 'National Archives',
    'Library of Congress', 'National Cathedral', 'Treasury Building', 'Vietnam Veterans Memorial',
    'Union Station', 'National Mall', 'Fords Theatre', 'DC Row Houses'
  ],
  USA: [
    'One World Trade Center', 'Willis Tower', 'Transamerica Pyramid', 'Chrysler Building',
    'Woolworth Building', 'Flatiron Building', 'Pentagon', 'Capitol Building',
    'Biltmore Estate', 'Monticello', 'Fallingwater', 'Fallingwater House',
    'The Broad Museum', 'Walt Disney Concert Hall', 'Guggenheim Museum', 'Independence Hall'
  ],
  UK: [
    'Big Ben', 'Tower Bridge', 'Buckingham Palace', 'Westminster Abbey',
    'St Pauls Cathedral', 'The Shard', 'The Gherkin', 'London Eye',
    'Tower of London', 'Windsor Castle', 'Edinburgh Castle', 'Royal Albert Hall',
    'Stonehenge', 'Angel of the North', 'Titanic Belfast', 'Millennium Stadium'
  ],
  France: [
    'Eiffel Tower', 'Louvre Museum', 'Notre Dame', 'Sacre Coeur',
    'Arc de Triomphe', 'Palace of Versailles', 'Mont Saint-Michel', 'Chateau de Chambord',
    'Centre Pompidou', 'Les Invalides', 'Pont du Gard', 'Carcassonne',
    'Palais Garnier', 'Pantheon', 'Sainte-Chapelle', 'Chateau de Chenonceau'
  ],
  Germany: [
    'Brandenburg Gate', 'Reichstag', 'Cologne Cathedral', 'Neuschwanstein Castle',
    'Dresden Frauenkirche', 'Elbphilharmonie Hamburg', 'Zwinger Palace Dresden', 'Heidelberg Castle',
    'Berlin TV Tower', 'Berlin Cathedral', 'Aachen Cathedral', 'Semperoper Dresden',
    'Frauenkirche Munich', 'Porta Nigra Trier', 'Holstentor Lubeck', 'Schwerin Castle'
  ],
  Poland: [
    'Wawel Castle', 'Malbork Castle', 'St Marys Basilica', 'Palace of Culture',
    'Warsaw Old Town', 'Moszna Castle', 'Auschwitz Memorial', 'Zamosc Town Hall',
    'Cloth Hall Krakow', 'Centennial Hall', 'Royal Castle Warsaw', 'Poznan Town Hall',
    'Biskupin Settlement', 'Ksiaz Castle', 'Crooked House Sopot', 'Wooden Church'
  ],
  Russia: [
    'Red Square', 'Moscow Kremlin', 'St Isaacs Cathedral', 'Winter Palace',
    'Peterhof Palace', 'Bolshoi Theatre', 'Kazan Kremlin', 'Tretyakov Gallery',
    'Church on Spilled Blood', 'Moscow State University', 'Rostov Kremlin', 'Novodevichy Convent',
    'Kizhi Pogost', 'Catherine Palace', 'Admiralty Building', 'GUM Department Store'
  ],
};

export const LANDMARK_NAMES: Record<string, string[]> = {
  Washington: [
    'Space Needle', 'Pike Place Market', 'Mount Rainier', 'Museum of Pop Culture',
    'Seattle Central Library', 'State Capitol', 'Snoqualmie Falls', 'Grand Coulee Dam',
    'Tacoma Dome', 'Leavenworth Village', 'Washington State Ferry', 'Columbia River Gorge',
    'Olympic Coast', 'Seattle Aquarium', 'T-Mobile Park', 'Suzzallo Library'
  ],
  USA: [
    'Statue of Liberty', 'Golden Gate Bridge', 'Mount Rushmore', 'The Alamo',
    'Grand Canyon', 'Space Needle', 'Gateway Arch', 'Cloud Gate Chicago',
    'Old Faithful', 'Great Smoky Mountains', 'Monument Valley', 'Niagara Falls',
    'Route 66 Sign', 'Half Dome Yosemite', 'Devils Tower', 'Redwood Forest'
  ],
  UK: [
    'Loch Ness Castle', 'Roman Baths', 'Giants Causeway', 'Hadrians Wall',
    'Glenfinnan Viaduct', 'White Cliffs of Dover', 'Eden Project', 'Blackpool Tower',
    'Scottish Highlands', 'Seven Sisters Cliffs', 'Forth Bridge', 'St Michaels Mount',
    'Cheddar Gorge', 'Caernarfon Castle', 'The Needles', 'Durdle Door'
  ],
  France: [
    'Mont Blanc', 'Verdon Gorge', 'Dune of Pilat', 'Etretat Cliffs',
    'Lavender Fields', 'Calanques', 'Camargue Horses', 'Puy de Dome',
    'Bavella Needles', 'Brittany Lighthouse', 'Champagne Vineyards', 'French Alps Ski',
    'Aiguille du Midi', 'Tarn Gorge', 'Vosges Mountains', 'Lascaux Cave'
  ],
  Germany: [
    'Zugspitze', 'Black Forest', 'Rhine Valley', 'Konigssee',
    'Bastei Bridge', 'Lake Constance', 'Brocken Mountain', 'Rugen Chalk Cliffs',
    'Moselle River Loop', 'Wadden Sea', 'Bavarian Alps', 'Elbe Sandstone',
    'Loreley Rock', 'Thuringian Forest', 'Mecklenburg Lakes', 'Bavarian Forest'
  ],
  Poland: [
    'Morskie Oko', 'Dunajec River Gorge', 'Bieszczady Mountains', 'Masurian Lakes',
    'Bialowieza Bison', 'Slowinski Dunes', 'Wieliczka Salt Mine', 'Auschwitz Memorial',
    'Table Mountains', 'Sniezka Peak', 'Elblag Canal', 'Giant Mountains',
    'Biebrza Marshes', 'Augustow Canal', 'Stolowe Mountains', 'Baltic Lighthouse'
  ],
  Russia: [
    'Shamanka Rock Baikal', 'Kamchatka Volcanoes', 'Lena Pillars', 'Manpupuner Rocks',
    'Altai Mountains', 'Kuril Islands', 'Mount Elbrus', 'Valley of Geysers',
    'Curonian Spit', 'Putorana Waterfall', 'Siberian Tiger', 'Lake Baikal',
    'Siberian Tundra', 'Kungur Ice Cave', 'Baikal Seals', 'Siberian Taiga'
  ],
};

// Point values for different building types
const LANDMARK_POINTS = 500;
const MAJOR_BUILDING_POINTS = 300;
const GENERIC_BUILDING_POINTS = 100;

// Major buildings get more points (index 0-3 are usually the most famous)
function getPointValue(index: number, isLandmark: boolean): number {
  if (isLandmark) return LANDMARK_POINTS;
  if (index < 4) return MAJOR_BUILDING_POINTS;
  return GENERIC_BUILDING_POINTS;
}

export class CountryDecoration extends Phaser.GameObjects.Sprite {
  public buildingName: string;
  public pointValue: number;
  public isDestroyed: boolean = false;
  public country: string;
  protected matterBody: MatterJS.BodyType | null = null;
  public collisionWidth: number = 0;
  public collisionHeight: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    terrainY: number,
    country: string,
    index: number,
    isLandmark: boolean
  ) {
    const textureKey = `${country}_${isLandmark ? 'landmark' : 'building'}_${index}`;
    super(scene, x, terrainY, textureKey);

    this.country = country;
    this.buildingName = isLandmark
      ? LANDMARK_NAMES[country]?.[index] || `${country} Landmark`
      : BUILDING_NAMES[country]?.[index] || `${country} Building`;
    this.pointValue = getPointValue(index, isLandmark);

    // Position so bottom of image sits on terrain
    // Origin at bottom center (0.5, 1) means y position is at the bottom of the sprite
    this.setOrigin(0.5, 1);

    // Get actual texture dimensions
    const textureWidth = this.texture.getSourceImage().width;
    const textureHeight = this.texture.getSourceImage().height;

    // Scale to target height of ~100-180px, varying slightly for visual interest
    const targetHeight = 120 + Math.random() * 60;
    const baseScale = targetHeight / textureHeight;
    this.setScale(baseScale);

    // Adjust Y position - move down slightly to sit on terrain
    // The terrainY is the surface, we need to be exactly there
    this.y = terrainY;

    // Calculate collision dimensions based on actual scaled size
    this.collisionWidth = textureWidth * baseScale * 0.85; // Slightly narrower than visual for better feel
    this.collisionHeight = textureHeight * baseScale * 0.95; // Nearly full height

    // Create physics body for collision
    const matterScene = scene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
    this.matterBody = matterScene.matter.add.rectangle(
      x,
      terrainY - this.collisionHeight / 2, // Center of the collision box
      this.collisionWidth,
      this.collisionHeight,
      {
        isStatic: true,
        label: 'building',
        collisionFilter: {
          category: 2, // Same as terrain
        },
      }
    );

    // Store reference to this decoration
    (this.matterBody as unknown as { decorationRef: CountryDecoration }).decorationRef = this;

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

  // Building destruction with 4-phase effect:
  // Phase 1: Bomb explodes (flash)
  // Phase 2: Building cracks up (crack lines appear, building shakes)
  // Phase 3: Building crumbles down (collapses into horizontal slices)
  // Phase 4: Pile of debris on the ground (permanent)
  explode(): { name: string; points: number; textureKey: string; country: string } {
    if (this.isDestroyed) return { name: this.buildingName, points: 0, textureKey: this.texture.key, country: this.country };

    this.isDestroyed = true;
    console.log(`[DEBRIS] 💥 ${this.buildingName} BOMBED! Starting explosion...`);

    // Remove physics body
    if (this.matterBody) {
      const matterScene = this.scene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
      matterScene.matter.world.remove(this.matterBody);
      this.matterBody = null;
    }

    const scene = this.scene;
    const x = this.x;
    const groundY = this.y; // Bottom of building (ground level)
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
    // Explosion flash at center using ExplosionUtils
    createExplosion(scene, x, centerY, {
      flashColors: [0xFF6600, 0xFFFF00, 0xFFFFFF],
      flashSizes: [40, 25, 10],
      duration: 300,
      includeFlash: true,
      includeDebris: false,
      includeSmoke: false,
      shakeCamera: false,
    });


    // ============ PHASE 3: BUILDING CRUMBLES DOWN (after crack phase) ============
    // Create many irregular-sized pieces from the building texture
    const numPieces = 60;
    const pieceData: {
      key: string;
      worldX: number;
      worldY: number;
      worldW: number;
      worldH: number;
    }[] = [];

    // Generate irregular pieces by randomly sampling regions of the texture
    for (let i = 0; i < numPieces; i++) {
      // Random size for this piece (irregular)
      const pieceTexW = 30 + Math.floor(Math.random() * 80);
      const pieceTexH = 25 + Math.floor(Math.random() * 70);

      // Random position within texture bounds
      const texX = Math.floor(Math.random() * (textureWidth - pieceTexW));
      const texY = Math.floor(Math.random() * (textureHeight - pieceTexH));

      // Create texture for this piece
      const key = `${textureKey}_piece_${i}_${Date.now()}_${Math.random()}`;
      const pieceRT = scene.make.renderTexture({ width: pieceTexW, height: pieceTexH }, false);
      pieceRT.draw(textureKey, -texX, -texY);
      pieceRT.saveTexture(key);
      pieceRT.destroy();

      // Calculate world position (where this piece appears on screen)
      const ratioX = texX / textureWidth;
      const ratioY = texY / textureHeight;
      const worldX = x - buildingWidth / 2 + ratioX * buildingWidth + (pieceTexW * scale) / 2;
      const worldY = buildingTop + ratioY * buildingHeight + (pieceTexH * scale) / 2;

      pieceData.push({
        key,
        worldX,
        worldY,
        worldW: pieceTexW,
        worldH: pieceTexH,
      });
    }

    // Hide the original building immediately and start explosion
    this.setVisible(false);

    scene.time.delayedCall(0, () => {

      // Create piece sprites at their positions within the building
      const pieces: { sprite: Phaser.GameObjects.Sprite; startY: number }[] = [];

      const gameScene = scene as unknown as GameScene;
      for (const data of pieceData) {
        const piece = scene.add.sprite(data.worldX, data.worldY, data.key);
        piece.setScale(scale);
        piece.setDepth(6);
        piece.setOrigin(0.5, 0.5);

        // Register debris for tracking
        gameScene.registerDebris(piece);

        pieces.push({ sprite: piece, startY: data.worldY });
      }

      // Animate pieces falling - sort by Y position so top pieces fall first
      pieces.sort((a, b) => a.startY - b.startY);

      // Explosion origin at bottom center of building
      const explosionX = x;
      const explosionY = groundY;

      // Track texture keys for cleanup
      const textureKeys = pieceData.map(d => d.key);

      pieces.forEach((piece, index) => {
        // Calculate force direction from explosion point (bottom center)
        const dx = piece.sprite.x - explosionX;
        const dy = piece.sprite.y - explosionY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Normalize and apply force - pieces closer to explosion get more force
        const maxDist = Math.sqrt(buildingWidth * buildingWidth + buildingHeight * buildingHeight);
        const forceMult = 1.2 - (dist / maxDist) * 0.5; // Closer = stronger

        const forceX = (dx / dist) * 70 * forceMult + (Math.random() - 0.5) * 40;
        const forceY = (dy / dist) * 50 * forceMult - 30; // Upward bias

        // Delay: pieces near explosion go first
        const delay = (dist / maxDist) * 200;

        // Target: land at ground level
        const targetY = groundY - 2 - Math.random() * 10;
        const targetX = piece.sprite.x + forceX * 1.5 + (Math.random() - 0.5) * 20;

        scene.time.delayedCall(delay, () => {
          // First: explosive burst upward and outward from bottom
          scene.tweens.add({
            targets: piece.sprite,
            x: piece.sprite.x + forceX,
            y: piece.sprite.y + forceY, // Flies up and out
            rotation: (Math.random() - 0.5) * 0.8,
            duration: 150,
            ease: 'Quad.easeOut',
            onComplete: () => {
              // Then: fall down to ground
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

      // ============ PHASE 5: CONSOLIDATE DEBRIS (reduce 60 → 15 pieces) ============
      // After pieces settle, create smoke puff and reduce piece count
      scene.time.delayedCall(1200, () => {
        // Create smoke puff to hide the consolidation
        for (let i = 0; i < 20; i++) {
          const smokeX = x + (Math.random() - 0.5) * buildingWidth * 0.8;
          const smokeY = groundY - 5 - Math.random() * 15;
          const smoke = scene.add.circle(smokeX, smokeY, 15 + Math.random() * 25, 0x555555, 0.7);
          smoke.setDepth(8);

          scene.tweens.add({
            targets: smoke,
            y: smokeY - 30 - Math.random() * 40,
            x: smokeX + (Math.random() - 0.5) * 30,
            alpha: 0,
            scale: 2 + Math.random(),
            duration: 800 + Math.random() * 400,
            ease: 'Power1',
            onComplete: () => smoke.destroy(),
          });
        }

        // Keep only 15 pieces (every 4th piece), destroy the rest
        console.log(`[DEBRIS] Reducing ${pieces.length} pieces to 15...`);
        const keepCount = 15;
        const keepInterval = Math.floor(pieces.length / keepCount);
        const piecesToKeep: typeof pieces = [];

        const piecesToDestroy: typeof pieces = [];
        pieces.forEach((piece, index) => {
          if (index % keepInterval === 0 && piecesToKeep.length < keepCount) {
            piecesToKeep.push(piece);
          } else {
            // Kill any active tweens and hide the sprite
            scene.tweens.killTweensOf(piece.sprite);
            piece.sprite.setVisible(false);
            piece.sprite.setActive(false);
            piecesToDestroy.push(piece);
          }
        });

        // Update pieces array to only contain kept pieces
        pieces.length = 0;
        pieces.push(...piecesToKeep);

        // Delay actual destruction to avoid render pipeline issues
        scene.time.delayedCall(500, () => {
          console.log(`[DEBRIS] Destroying ${piecesToDestroy.length} excess pieces (delayed 500ms)...`);
          for (const piece of piecesToDestroy) {
            gameScene.unregisterDebris(piece.sprite);
            piece.sprite.destroy();
          }
          console.log(`[DEBRIS] ✅ ${piecesToDestroy.length} pieces destroyed successfully!`);
        });

        // ============ PHASE 6: AUTO-CLEANUP after 5 seconds ============
        scene.time.delayedCall(5000, () => {
          // Final smoke puff
          for (let i = 0; i < 12; i++) {
            const smokeX = x + (Math.random() - 0.5) * buildingWidth * 0.6;
            const smokeY = groundY - 3 - Math.random() * 10;
            const smoke = scene.add.circle(smokeX, smokeY, 10 + Math.random() * 15, 0x666666, 0.5);
            smoke.setDepth(8);

            scene.tweens.add({
              targets: smoke,
              y: smokeY - 25 - Math.random() * 30,
              alpha: 0,
              scale: 1.8,
              duration: 600 + Math.random() * 300,
              ease: 'Power1',
              onComplete: () => smoke.destroy(),
            });
          }

          // Destroy all remaining pieces
          console.log(`[DEBRIS] Auto-cleanup: destroying ${pieces.length} remaining pieces`);
          for (const piece of pieces) {
            scene.tweens.killTweensOf(piece.sprite);
            gameScene.unregisterDebris(piece.sprite);
            piece.sprite.destroy();
          }
          // Delay texture removal to next frame to avoid render pipeline race condition
          scene.time.delayedCall(100, () => {
            for (const key of textureKeys) {
              if (scene.textures.exists(key)) {
                scene.textures.remove(key);
              }
            }
          });
        });
      });

      // ============ SMOKE EFFECTS ============
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

      // ============ PHASE 4: DEBRIS PILE (permanent) ============
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

      // Lingering smoke at the base - 4 waves over 3 seconds (reduced for performance)
      scene.time.delayedCall(300, () => {
        for (let wave = 0; wave < 4; wave++) {
          scene.time.delayedCall(wave * 700, () => {
            const particleCount = 3;
            for (let i = 0; i < particleCount; i++) {
              const smokeX = x + (Math.random() - 0.5) * buildingWidth * 0.7;
              const smoke = scene.add.circle(smokeX, groundY - 5, 8 + Math.random() * 12, 0x555555, 0.3);
              smoke.setDepth(4);

              scene.tweens.add({
                targets: smoke,
                y: groundY - 30 - Math.random() * 40,
                alpha: 0,
                scale: 2,
                duration: 1200,
                ease: 'Power1',
                onComplete: () => smoke.destroy(),
              });
            }
          });
        }
      });

      // Debris consolidates after 1s (60→15 pieces) and auto-cleans after 5s
    });

    return { name: this.buildingName, points: this.pointValue, textureKey: this.texture.key, country: this.country };
  }
}

// Helper to get the country asset prefix from the game's country name
export function getCountryAssetPrefix(countryName: string): string | null {
  const mapping: Record<string, string> = {
    'Washington DC': 'Washington',
    'USA': 'USA',
    'Atlantic Ocean': '', // No buildings in ocean
    'United Kingdom': 'UK',
    'France': 'France',
    'Germany': 'Germany',
    'Poland': 'Poland',
    'Russia': 'Russia',
  };
  return mapping[countryName] || null;
}
