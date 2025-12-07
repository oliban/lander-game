// Game dimensions
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Physics
export const GRAVITY = 0.6; // Increased for heavier feel
export const THRUST_POWER = 0.006; // Balanced with higher gravity
export const ROTATION_SPEED = 0.04; // Slightly slower rotation for heavier feel
export const MAX_SAFE_LANDING_VELOCITY = 3.5; // Increased since ship is heavier
export const MAX_SAFE_LANDING_ANGLE = 0.3; // radians (~17 degrees)

// Fuel
export const INITIAL_FUEL = 100;
export const FUEL_CONSUMPTION_RATE = 0.15; // per frame when thrusting

// Terrain
export const TERRAIN_SEGMENT_WIDTH = 20;
export const TERRAIN_ROUGHNESS = 0.5;
export const WORLD_WIDTH = 20000; // Total journey length

// Countries (x positions where they start) - cartoon colors
export const COUNTRIES = [
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
  { x: 1800, width: 120, name: 'NYC Fuel Stop' },
  { x: 3800, width: 100, name: 'Mid-Atlantic Platform' },
  { x: 5800, width: 80, name: 'Dover Cliffs' },
  { x: 8500, width: 80, name: 'Berlin Gas Station' },
  { x: 11500, width: 70, name: 'Warsaw Depot' },
  { x: 15500, width: 60, name: 'Border Station' },
  { x: 19500, width: 150, name: "Putino's Palace" },
];

// Collectibles
export const COLLECTIBLE_TYPES = {
  BURGER: { name: 'Burger', fuelValue: 10, rarity: 0.4, color: 0xffaa00 },
  DOLLAR: { name: 'Dollar', fuelValue: 25, rarity: 0.35, color: 0x00ff00 },
  TWITTER: { name: 'Twitter Bird', fuelValue: 50, rarity: 0.2, color: 0x00aaff },
  MAGA_HAT: { name: 'MAGA Hat', fuelValue: 100, rarity: 0.05, color: 0xff0000 },
};

// Cannons
export const CANNON_FIRE_RATE = 2000; // ms between shots
export const PROJECTILE_SPEED = 5;

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
