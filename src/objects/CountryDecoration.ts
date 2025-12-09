import Phaser from 'phaser';

// Building and landmark names for each country
// Index corresponds to image number (0-15)
export const BUILDING_NAMES: Record<string, string[]> = {
  Washington: [
    'White House', 'Capitol Building', 'Washington Monument', 'Lincoln Memorial',
    'Jefferson Memorial', 'Supreme Court', 'Smithsonian Castle', 'National Archives',
    'Library of Congress', 'National Cathedral', 'Treasury Building', 'Vietnam Veterans Memorial',
    'Union Station', 'Kennedy Center', 'Fords Theatre', 'DC Row Houses'
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
  private matterBody: MatterJS.BodyType | null = null;
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
    this.collisionWidth = textureWidth * baseScale * 0.6; // Narrower than visual
    this.collisionHeight = textureHeight * baseScale * 0.9; // Slightly shorter than visual

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
    // Explosion flash at center
    const flash = scene.add.graphics();
    flash.setPosition(x, centerY);
    flash.fillStyle(0xFF6600, 1);
    flash.fillCircle(0, 0, 40);
    flash.fillStyle(0xFFFF00, 1);
    flash.fillCircle(0, 0, 25);
    flash.fillStyle(0xFFFFFF, 1);
    flash.fillCircle(0, 0, 10);
    flash.setDepth(100);

    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
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

      for (const data of pieceData) {
        const piece = scene.add.sprite(data.worldX, data.worldY, data.key);
        piece.setScale(scale);
        piece.setDepth(6);
        piece.setOrigin(0.5, 0.5);

        pieces.push({ sprite: piece, startY: data.worldY });
      }

      // Animate pieces falling - sort by Y position so top pieces fall first
      pieces.sort((a, b) => a.startY - b.startY);

      // Explosion origin at bottom center of building
      const explosionX = x;
      const explosionY = groundY;

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

      // Pieces remain as permanent rubble
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
