// Game dimensions
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Physics
export const GRAVITY = 0.45; // Lighter feel
export const THRUST_POWER = 0.006; // Balanced thrust
export const ROTATION_SPEED = 0.04; // Slightly slower rotation for heavier feel
export const MAX_SAFE_LANDING_VELOCITY = 5.0; // More forgiving landing speed
export const MAX_SAFE_LANDING_ANGLE = 0.5; // radians (~29 degrees) - more forgiving angle

// Fuel
export const INITIAL_FUEL = 100;
export const FUEL_CONSUMPTION_RATE = 0.15; // per frame when thrusting

// Terrain
export const TERRAIN_SEGMENT_WIDTH = 20;
export const TERRAIN_ROUGHNESS = 0.5;
export const WORLD_WIDTH = 20000; // Total journey length (eastward)
export const WORLD_START_X = -2800; // Washington is 2+ screen widths to the left

// Countries (x positions where they start) - cartoon colors
export const COUNTRIES = [
  { name: 'Washington DC', startX: -2800, color: 0x2E8B57, cannonDensity: 0 },  // Sea green
  { name: 'USA', startX: 0, color: 0x228B22, cannonDensity: 0 },  // Forest green
  { name: 'Atlantic Ocean', startX: 2000, color: 0x4169E1, cannonDensity: 0 },  // Royal blue
  { name: 'United Kingdom', startX: 4000, color: 0x9370DB, cannonDensity: 0.3 },  // Medium purple
  { name: 'France', startX: 6000, color: 0x20B2AA, cannonDensity: 0.4 },  // Light sea green
  { name: 'Germany', startX: 9000, color: 0xDAA520, cannonDensity: 0.5 },  // Goldenrod
  { name: 'Poland', startX: 12000, color: 0xCD853F, cannonDensity: 0.6 },  // Peru
  { name: 'Russia', startX: 16000, color: 0xDC143C, cannonDensity: 0.2 },  // Crimson
];

// Landing pads between countries
export const LANDING_PADS = [
  { x: -2500, width: 150, name: 'The White House', isWashington: true },
  { x: 1800, width: 120, name: 'NYC Fuel Stop' },
  { x: 3800, width: 100, name: 'Mid-Atlantic Platform' },
  { x: 5800, width: 80, name: 'Dover Cliffs' },
  { x: 8500, width: 80, name: 'Berlin Gas Station' },
  { x: 11500, width: 70, name: 'Warsaw Depot' },
  { x: 15500, width: 60, name: 'Border Station' },
  { x: 19500, width: 250, name: "Putino's Palace" }, // Much larger final pad
];

// Collectibles - organized by category and value
export const COLLECTIBLE_TYPES = {
  // Common items (high spawn rate)
  BURGER: { name: 'Burger', fuelValue: 10, rarity: 0.15, color: 0xD2691E },
  HAMBERDER: { name: 'Hamberder', fuelValue: 12, rarity: 0.12, color: 0xCD853F },
  DIET_COKE: { name: 'Diet Coke', fuelValue: 15, rarity: 0.12, color: 0xDC143C },

  // Uncommon items
  DOLLAR: { name: 'Dollar', fuelValue: 25, rarity: 0.10, color: 0x228B22 },
  COVFEFE: { name: 'Covfefe', fuelValue: 30, rarity: 0.08, color: 0x8B4513 },
  HAIR_SPRAY: { name: 'Hair Spray', fuelValue: 35, rarity: 0.07, color: 0xFFD700 },
  TWITTER: { name: 'Twitter Bird', fuelValue: 50, rarity: 0.06, color: 0x1DA1F2 },
  TRUMP_STEAK: { name: 'Trump Steak', fuelValue: 55, rarity: 0.05, color: 0x8B0000 },

  // Rare items
  CASINO_CHIP: { name: 'Casino Chip', fuelValue: 75, rarity: 0.04, color: 0x9932CC },
  MAGA_HAT: { name: 'MAGA Hat', fuelValue: 100, rarity: 0.03, color: 0xFF0000 },
  NFT: { name: 'NFT', fuelValue: 5, rarity: 0.04, color: 0xFF69B4 }, // Worthless but funny
  BITCOIN: { name: 'Bitcoin', fuelValue: 80, rarity: 0.03, color: 0xF7931A },

  // Very rare items
  CLASSIFIED_DOCS: { name: 'Classified Docs', fuelValue: 120, rarity: 0.02, color: 0x4169E1 },
  GOLDEN_TOILET: { name: 'Golden Toilet', fuelValue: 200, rarity: 0.01, color: 0xFFD700 },

  // Russian items (spawn more frequently in later zones)
  MATRYOSHKA: { name: 'Matryoshka', fuelValue: 60, rarity: 0.04, color: 0xFF6347, russianOnly: true },
  VODKA: { name: 'Vodka', fuelValue: 45, rarity: 0.05, color: 0x87CEEB, russianOnly: true },
  OLIGARCH_GOLD: { name: 'Oligarch Gold', fuelValue: 150, rarity: 0.015, color: 0xFFD700, russianOnly: true },

  // Easter egg
  TAN_SUIT: { name: 'Tan Suit', fuelValue: 40, rarity: 0.02, color: 0xD2B48C },

  // Special power-ups (rare, gives temporary effects instead of fuel)
  TRUMP_TOWER: { name: 'Trump Tower', fuelValue: 0, rarity: 0.008, color: 0xFFD700, special: 'bribe_cannons' },
  RED_TIE: { name: 'Red Tie', fuelValue: 0, rarity: 0.01, color: 0xDC143C, special: 'speed_boost' },
};

// Cannons
export const CANNON_FIRE_RATE = 2000; // ms between shots
export const PROJECTILE_SPEED = 5;

// Bombs (droppable food items)
export const BOMB_DROPPABLE_TYPES = ['BURGER', 'HAMBERDER', 'DIET_COKE', 'TRUMP_STEAK', 'VODKA'];
export const FOOD_PICKUP_AMOUNT = 10; // How many of each food item you get when picking up

// Colors (cartoon colorful theme)
export const COLORS = {
  BACKGROUND: 0x87CEEB, // Sky blue
  SHUTTLE_GLOW: 0xFFFFFF,
  TERRAIN_STROKE: 0x228B22, // Forest green
  LANDING_PAD: 0xFFD700, // Gold
  FUEL_BAR: 0x32CD32, // Lime green
  DANGER: 0xFF4444,
  SAFE: 0x44FF44,
  WARNING: 0xFFAA00,
  TEXT: 0x333333,
};
