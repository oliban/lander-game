import Phaser from 'phaser';

/**
 * Configuration for creating bubble particles
 */
export interface BubbleConfig {
  /** Number of bubbles to create (default: 5) */
  count?: number;
  /** Minimum bubble radius (default: 2) */
  minRadius?: number;
  /** Maximum bubble radius (default: 5) */
  maxRadius?: number;
  /** Bubble color (default: 0xadd8e6 - light blue) */
  color?: number;
  /** Bubble opacity (default: 0.6) */
  alpha?: number;
  /** Minimum vertical distance to rise (default: 40) */
  minRiseDistance?: number;
  /** Maximum additional vertical distance to rise (default: 20) */
  maxRiseDistanceVariation?: number;
  /** Maximum horizontal drift (default: 20) */
  maxHorizontalDrift?: number;
  /** Minimum animation duration in ms (default: 800) */
  minDuration?: number;
  /** Maximum additional duration variation in ms (default: 400) */
  maxDurationVariation?: number;
  /** Z-depth for rendering (default: 49) */
  depth?: number;
}

/**
 * Configuration for creating water splash particles
 */
export interface SplashConfig {
  /** Number of droplets to create (default: 10) */
  count?: number;
  /** Minimum droplet radius (default: 3) */
  minRadius?: number;
  /** Maximum droplet radius (default: 7) */
  maxRadius?: number;
  /** Droplet color (default: 0x4169E1 - royal blue) */
  color?: number;
  /** Droplet opacity (default: 0.8) */
  alpha?: number;
  /** Minimum splash speed (default: 3) */
  minSpeed?: number;
  /** Maximum splash speed (default: 8) */
  maxSpeed?: number;
  /** Horizontal spread width (default: 40) */
  spreadWidth?: number;
  /** Vertical arc height (default: 50) */
  arcHeight?: number;
  /** Splash angle spread in radians (default: 0.8) */
  angleSpread?: number;
  /** Minimum animation duration in ms (default: 500) */
  minDuration?: number;
  /** Maximum additional duration variation in ms (default: 300) */
  maxDurationVariation?: number;
  /** Z-depth for rendering (default: 99) */
  depth?: number;
}

/**
 * Configuration for creating smoke/fume particles
 */
export interface SmokePuffConfig {
  /** Number of smoke puffs to create (default: 2) */
  minCount?: number;
  /** Maximum additional smoke puffs (default: 3) */
  maxCountVariation?: number;
  /** Minimum smoke puff size (default: 4) */
  minSize?: number;
  /** Maximum smoke puff size (default: 10) */
  maxSize?: number;
  /** Array of smoke colors (default: toxic green/yellow colors) */
  colors?: number[];
  /** Smoke opacity (default: 0.6) */
  alpha?: number;
  /** Minimum vertical rise distance (default: 30) */
  minRiseDistance?: number;
  /** Maximum additional rise distance (default: 40) */
  maxRiseDistanceVariation?: number;
  /** Maximum horizontal drift (default: 30) */
  maxHorizontalDrift?: number;
  /** Horizontal spawn spread (default: 50) */
  spawnSpreadX?: number;
  /** Vertical spawn offset (default: -5) */
  spawnOffsetY?: number;
  /** Minimum scale multiplier (default: 1.5) */
  minScale?: number;
  /** Maximum scale multiplier (default: 2.5) */
  maxScale?: number;
  /** Minimum animation duration in ms (default: 1500) */
  minDuration?: number;
  /** Maximum additional duration variation in ms (default: 1000) */
  maxDurationVariation?: number;
  /** Z-depth for rendering (default: 52) */
  depth?: number;
}

/**
 * Creates rising bubble particles, typically used for underwater effects
 *
 * @param scene - The Phaser scene to create bubbles in
 * @param x - X position to spawn bubbles
 * @param y - Y position to spawn bubbles
 * @param config - Optional configuration for bubble appearance and behavior
 * @returns Array of created bubble graphics objects
 *
 * @example
 * // Create default bubbles (5 light blue bubbles)
 * createBubbles(scene, 100, 200);
 *
 * @example
 * // Create custom green burp bubbles
 * createBubbles(scene, 100, 200, {
 *   count: 8,
 *   color: 0x90ee90,
 *   alpha: 0.7,
 *   minRadius: 3,
 *   maxRadius: 7,
 *   minRiseDistance: 60,
 *   minDuration: 1000
 * });
 */
export function createBubbles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: BubbleConfig = {}
): Phaser.GameObjects.Graphics[] {
  const {
    count = 5,
    minRadius = 2,
    maxRadius = 5,
    color = 0xadd8e6,
    alpha = 0.6,
    minRiseDistance = 40,
    maxRiseDistanceVariation = 20,
    maxHorizontalDrift = 20,
    minDuration = 800,
    maxDurationVariation = 400,
    depth = 49,
  } = config;

  const bubbles: Phaser.GameObjects.Graphics[] = [];

  for (let i = 0; i < count; i++) {
    const bubble = scene.add.graphics();
    bubble.fillStyle(color, alpha);

    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    bubble.fillCircle(0, 0, radius);

    bubble.setPosition(x, y);
    bubble.setDepth(depth);

    scene.tweens.add({
      targets: bubble,
      y: bubble.y - minRiseDistance - Math.random() * maxRiseDistanceVariation,
      x: bubble.x + (Math.random() - 0.5) * maxHorizontalDrift,
      alpha: 0,
      duration: minDuration + Math.random() * maxDurationVariation,
      ease: 'Quad.easeOut',
      onComplete: () => bubble.destroy(),
    });

    bubbles.push(bubble);
  }

  return bubbles;
}

/**
 * Creates water splash droplet particles, typically used for surface impacts
 *
 * @param scene - The Phaser scene to create splash in
 * @param x - X position to spawn splash (center)
 * @param y - Y position to spawn splash (water surface level)
 * @param config - Optional configuration for splash appearance and behavior
 * @returns Array of created droplet graphics objects
 *
 * @example
 * // Create default water splash (10 blue droplets)
 * createSplash(scene, 200, 150);
 *
 * @example
 * // Create larger splash with more droplets
 * createSplash(scene, 200, 150, {
 *   count: 15,
 *   minSpeed: 5,
 *   maxSpeed: 10,
 *   spreadWidth: 60,
 *   arcHeight: 70
 * });
 */
export function createSplash(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: SplashConfig = {}
): Phaser.GameObjects.Graphics[] {
  const {
    count = 10,
    minRadius = 3,
    maxRadius = 7,
    color = 0x4169E1,
    alpha = 0.8,
    minSpeed = 3,
    maxSpeed = 8,
    spreadWidth = 40,
    arcHeight = 50,
    angleSpread = 0.8,
    minDuration = 500,
    maxDurationVariation = 300,
    depth = 99,
  } = config;

  const droplets: Phaser.GameObjects.Graphics[] = [];

  for (let i = 0; i < count; i++) {
    const splashAngle = -Math.PI / 2 + (Math.random() - 0.5) * angleSpread;
    const splashSpeed = minSpeed + Math.random() * (maxSpeed - minSpeed);

    const droplet = scene.add.graphics();
    droplet.fillStyle(color, alpha);

    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    droplet.fillCircle(0, 0, radius);

    droplet.setPosition(x + (Math.random() - 0.5) * spreadWidth, y);
    droplet.setDepth(depth);

    scene.tweens.add({
      targets: droplet,
      x: droplet.x + Math.cos(splashAngle) * splashSpeed * 15,
      y: droplet.y + Math.sin(splashAngle) * splashSpeed * 20 + arcHeight,
      alpha: 0,
      duration: minDuration + Math.random() * maxDurationVariation,
      ease: 'Quad.easeOut',
      onComplete: () => droplet.destroy(),
    });

    droplets.push(droplet);
  }

  return droplets;
}

/**
 * Creates rising smoke puff particles, typically used for toxic fumes or exhaust
 *
 * @param scene - The Phaser scene to create smoke in
 * @param x - X position to spawn smoke (center)
 * @param y - Y position to spawn smoke
 * @param config - Optional configuration for smoke appearance and behavior
 * @returns Array of created smoke graphics objects
 *
 * @example
 * // Create default toxic fumes (2-4 green/yellow puffs)
 * createSmokePuffs(scene, 100, 50);
 *
 * @example
 * // Create dark smoke with custom colors
 * createSmokePuffs(scene, 100, 50, {
 *   minCount: 3,
 *   maxCountVariation: 2,
 *   colors: [0x505050, 0x707070, 0x404040],
 *   alpha: 0.8,
 *   minSize: 6,
 *   maxSize: 12
 * });
 */
export function createSmokePuffs(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: SmokePuffConfig = {}
): Phaser.GameObjects.Graphics[] {
  const {
    minCount = 2,
    maxCountVariation = 3,
    minSize = 4,
    maxSize = 10,
    colors = [0x90a040, 0xa0b030, 0x80a020, 0xb0c040],
    alpha = 0.6,
    minRiseDistance = 30,
    maxRiseDistanceVariation = 40,
    maxHorizontalDrift = 30,
    spawnSpreadX = 50,
    spawnOffsetY = -5,
    minScale = 1.5,
    maxScale = 2.5,
    minDuration = 1500,
    maxDurationVariation = 1000,
    depth = 52,
  } = config;

  const puffs: Phaser.GameObjects.Graphics[] = [];
  const fumeCount = minCount + Math.floor(Math.random() * maxCountVariation);

  for (let i = 0; i < fumeCount; i++) {
    const puff = scene.add.graphics();

    const color = colors[Math.floor(Math.random() * colors.length)];
    puff.fillStyle(color, alpha);

    const size = minSize + Math.random() * (maxSize - minSize);
    puff.fillCircle(0, 0, size);

    const offsetX = (Math.random() - 0.5) * spawnSpreadX;
    puff.setPosition(x + offsetX, y + spawnOffsetY);
    puff.setDepth(depth);

    const scaleMultiplier = minScale + Math.random() * (maxScale - minScale);

    scene.tweens.add({
      targets: puff,
      y: puff.y - minRiseDistance - Math.random() * maxRiseDistanceVariation,
      x: puff.x + (Math.random() - 0.5) * maxHorizontalDrift,
      alpha: 0,
      scaleX: scaleMultiplier,
      scaleY: scaleMultiplier,
      duration: minDuration + Math.random() * maxDurationVariation,
      ease: 'Quad.easeOut',
      onComplete: () => puff.destroy(),
    });

    puffs.push(puff);
  }

  return puffs;
}
