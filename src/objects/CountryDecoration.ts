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

  // For future bombing mechanic
  explode(): { name: string; points: number; textureKey: string; country: string } {
    if (this.isDestroyed) return { name: this.buildingName, points: 0, textureKey: this.texture.key, country: this.country };

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
