import Phaser from 'phaser';

// Building and landmark names for each country
// Index corresponds to image number (0-15)
export const BUILDING_NAMES: Record<string, string[]> = {
  Washington: [
    'White House', 'Capitol Building', 'Washington Monument', 'Lincoln Memorial',
    'Jefferson Memorial', 'Pentagon', 'Smithsonian', 'Supreme Court',
    'Library of Congress', 'Treasury Building', 'FBI Building', 'State Department',
    'National Archives', 'Union Station', 'Kennedy Center', 'National Cathedral'
  ],
  USA: [
    'One World Trade Center', 'Empire State Building', 'Chrysler Building', 'Rockefeller Center',
    'Times Square', 'Brooklyn Bridge', 'Central Park Tower', 'Flatiron Building',
    'Grand Central', 'Madison Square Garden', 'Radio City', 'Trump Tower NYC',
    'Woolworth Building', 'MetLife Building', 'Citigroup Center', 'Hearst Tower'
  ],
  UK: [
    'Big Ben', 'Tower of London', 'Buckingham Palace', 'Westminster Abbey',
    'Tower Bridge', 'St Pauls Cathedral', 'Houses of Parliament', 'The Shard',
    'London Eye', 'British Museum', 'Trafalgar Square', 'Windsor Castle',
    'Edinburgh Castle', 'Stonehenge Visitor Center', 'Royal Albert Hall', 'Harrods'
  ],
  France: [
    'Eiffel Tower', 'Arc de Triomphe', 'Notre Dame', 'Louvre',
    'Sacre Coeur', 'Palace of Versailles', 'Moulin Rouge', 'Pantheon',
    'Opera Garnier', 'Centre Pompidou', 'Musee dOrsay', 'Hotel des Invalides',
    'Place de la Concorde', 'Champs Elysees', 'Luxembourg Palace', 'Tuileries'
  ],
  Germany: [
    'Brandenburg Gate', 'Reichstag', 'Neuschwanstein Castle', 'Cologne Cathedral',
    'Berlin TV Tower', 'Checkpoint Charlie', 'Berlin Wall Memorial', 'Hofbrauhaus',
    'Heidelberg Castle', 'Dresden Frauenkirche', 'Munich Rathaus', 'Sanssouci Palace',
    'Hamburg Elbphilharmonie', 'Frankfurt Skyline', 'Nuremberg Castle', 'Zwinger Palace'
  ],
  Poland: [
    'Wawel Castle', 'Palace of Culture', 'Old Town Square', 'St Marys Basilica',
    'Gdansk Crane', 'Malbork Castle', 'Cloth Hall', 'Wilanow Palace',
    'Lazienki Palace', 'Warsaw Barbican', 'Poznan Town Hall', 'Wroclaw Cathedral',
    'Jasna Gora', 'Auschwitz Memorial', 'Tatra Mountains Lodge', 'Salt Mine Wieliczka'
  ],
  Russia: [
    'Kremlin', 'St Basils Cathedral', 'Winter Palace', 'Bolshoi Theatre',
    'Red Square', 'GUM Department Store', 'Moscow State University', 'Christ the Savior',
    'Peterhof Palace', 'Catherine Palace', 'Hermitage Museum', 'Peter and Paul Fortress',
    'Kazan Cathedral', 'Moscow Metro', 'Ostankino Tower', 'Lubyanka'
  ],
};

export const LANDMARK_NAMES: Record<string, string[]> = {
  Washington: [
    'National Mall', 'Potomac River View', 'Cherry Blossoms', 'Arlington Cemetery',
    'Georgetown', 'Rock Creek Park', 'Tidal Basin', 'Embassy Row',
    'Dupont Circle', 'Capitol Hill', 'Foggy Bottom', 'The Ellipse',
    'Constitution Gardens', 'Reflecting Pool', 'Roosevelt Island', 'C&O Canal'
  ],
  USA: [
    'Statue of Liberty', 'Golden Gate Bridge', 'Mount Rushmore', 'Grand Canyon',
    'Niagara Falls', 'Hollywood Sign', 'Las Vegas Strip', 'Space Needle',
    'Gateway Arch', 'Hoover Dam', 'Yellowstone', 'Alcatraz',
    'Liberty Bell', 'Fenway Park', 'Navy Pier', 'Miami Beach'
  ],
  UK: [
    'Loch Ness', 'White Cliffs of Dover', 'Cotswolds', 'Lake District',
    'Giants Causeway', 'Scottish Highlands', 'Hadrians Wall', 'Bath',
    'Oxford Spires', 'Cambridge', 'Stratford upon Avon', 'Canterbury',
    'Snowdonia', 'Jurassic Coast', 'Peak District', 'Cornwall Coast'
  ],
  France: [
    'Mont Blanc', 'Gorges du Verdon', 'French Riviera', 'Loire Valley',
    'Mont Saint Michel', 'Provence Fields', 'Normandy Beaches', 'Bordeaux Vineyards',
    'Champagne Region', 'Dordogne Valley', 'Carcassonne', 'Strasbourg',
    'Nice Promenade', 'Cannes', 'Marseille Port', 'Chamonix'
  ],
  Germany: [
    'Zugspitze', 'Black Forest', 'Rhine Valley', 'Bavarian Alps',
    'Romantic Road', 'Baltic Coast', 'Saxon Switzerland', 'Moselle Valley',
    'Lake Constance', 'Harz Mountains', 'Rugen Island', 'Spreewald',
    'Berchtesgaden', 'Elbe Sandstone', 'Thuringian Forest', 'North Sea Coast'
  ],
  Poland: [
    'Tatra Mountains', 'Bialowieza Forest', 'Baltic Coast', 'Mazury Lakes',
    'Bieszczady Mountains', 'Dunajec Gorge', 'Slowinski Dunes', 'Ojcow Valley',
    'Pieniny Mountains', 'Karkonosze', 'Roztocze', 'Jura Highlands',
    'Vistula River', 'Kampinos Forest', 'Sudety Mountains', 'Masurian Lakes'
  ],
  Russia: [
    'Lake Baikal', 'Kamchatka', 'Trans-Siberian Railway', 'Ural Mountains',
    'Volga River', 'Caucasus Mountains', 'Siberian Taiga', 'Arctic Tundra',
    'Golden Ring', 'Karelia', 'Altai Mountains', 'Sochi',
    'Crimea', 'Murmansk', 'Vladivostok Port', 'Sakhalin Island'
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

  // For future bombing mechanic
  explode(): { name: string; points: number } {
    if (this.isDestroyed) return { name: this.buildingName, points: 0 };

    this.isDestroyed = true;

    // Remove physics body
    if (this.matterBody) {
      const matterScene = this.scene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics };
      matterScene.matter.world.remove(this.matterBody);
      this.matterBody = null;
    }

    // Create explosion effect
    const scene = this.scene;
    const x = this.x;
    const y = this.y - this.displayHeight / 2;

    // Explosion flash
    const flash = scene.add.graphics();
    flash.fillStyle(0xFF6600, 1);
    flash.fillCircle(x, y, 40);
    flash.fillStyle(0xFFFF00, 1);
    flash.fillCircle(x, y, 25);
    flash.fillStyle(0xFFFFFF, 1);
    flash.fillCircle(x, y, 10);

    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 400,
      onComplete: () => flash.destroy(),
    });

    // Flying debris
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const debris = scene.add.graphics();
      debris.fillStyle(0x888888, 1);
      debris.fillRect(-3, -3, 6, 6);
      debris.setPosition(x, y);

      scene.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * 60,
        y: y + Math.sin(angle) * 60 + 30,
        angle: Math.random() * 360,
        alpha: 0,
        duration: 500,
        onComplete: () => debris.destroy(),
      });
    }

    // Hide the building
    this.setVisible(false);

    return { name: this.buildingName, points: this.pointValue };
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
