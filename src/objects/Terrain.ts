import Phaser from 'phaser';
import { TERRAIN_SEGMENT_WIDTH, TERRAIN_ROUGHNESS, GAME_HEIGHT, COLORS, COUNTRIES, LANDING_PADS, WORLD_START_X } from '../constants';
import { darkenColor, lightenColor } from '../utils/ColorUtils';
import { PerformanceSettings } from '../systems/PerformanceSettings';

export interface TerrainVertex {
  x: number;
  y: number;
}

export interface FlatArea {
  x: number;      // Center X position
  width: number;  // Width of flat area
  y: number;      // Height (Y position)
}

export class Terrain {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics; // Legacy - kept for compatibility
  private oceanGraphics: Phaser.GameObjects.Graphics;
  private vertices: TerrainVertex[] = [];
  private bodies: MatterJS.BodyType[] = [];
  private waveOffset: number = 0;
  private flatAreas: FlatArea[] = [];
  private staticOceanDrawn: boolean = false; // Track if static ocean has been drawn (for low quality)

  // Chunked terrain for performance
  private readonly CHUNK_WIDTH = 1000; // 1000px per chunk (smaller = better culling)
  private chunks: Map<number, Phaser.GameObjects.Graphics> = new Map();
  private chunkStartX: number = 0;
  private chunkEndX: number = 0;

  constructor(scene: Phaser.Scene, startX: number, endX: number) {
    this.scene = scene;
    this.graphics = scene.add.graphics(); // Keep for compatibility but don't use
    this.graphics.setVisible(false); // Hide legacy graphics
    this.oceanGraphics = scene.add.graphics();
    this.oceanGraphics.setDepth(-1); // Render ocean behind terrain

    this.chunkStartX = startX;
    this.chunkEndX = endX;

    this.generateTerrain(startX, endX);
    this.createPhysicsBodies();
    this.drawChunked(); // Use chunked drawing instead
  }

  private generateTerrain(startX: number, endX: number): void {
    const numPoints = Math.ceil((endX - startX) / TERRAIN_SEGMENT_WIDTH) + 1;
    const baseHeight = GAME_HEIGHT * 0.7;

    // Use layered sine waves (Perlin-like noise) for smooth natural terrain
    const heights: number[] = [];

    for (let i = 0; i < numPoints; i++) {
      const x = startX + i * TERRAIN_SEGMENT_WIDTH;

      // Layer multiple sine waves at different frequencies for natural look
      let height = baseHeight;

      // Large rolling hills (very slow frequency)
      height += Math.sin(x * 0.0008) * GAME_HEIGHT * 0.12;
      height += Math.cos(x * 0.0005 + 1.5) * GAME_HEIGHT * 0.08;

      // Medium undulations
      height += Math.sin(x * 0.002 + 0.7) * GAME_HEIGHT * 0.06;
      height += Math.cos(x * 0.003 + 2.1) * GAME_HEIGHT * 0.04;

      // Small variations for texture (subtle)
      height += Math.sin(x * 0.008 + 3.2) * GAME_HEIGHT * 0.02;
      height += Math.cos(x * 0.012 + 1.1) * GAME_HEIGHT * 0.015;

      heights[i] = height;
    }

    // Switzerland mountain generation (x=10000 to x=12000)
    // Create multiple distinct mountain peaks with gentle slopes
    const switzerlandStart = COUNTRIES.find(c => c.name === 'Switzerland')?.startX ?? 10000;
    const switzerlandEnd = COUNTRIES.find(c => c.name === 'Germany')?.startX ?? 12000;
    const swissWidth = switzerlandEnd - switzerlandStart; // 2000px

    for (let i = 0; i < numPoints; i++) {
      const x = startX + i * TERRAIN_SEGMENT_WIDTH;

      // Only modify Switzerland region
      if (x >= switzerlandStart && x < switzerlandEnd) {
        // Define 3 distinct mountain peaks with WIDE sigma for gentle slopes
        const peaks = [
          { x: switzerlandStart + swissWidth * 0.18, height: GAME_HEIGHT * 0.6, sigma: 280 },   // First mountain
          { x: switzerlandStart + swissWidth * 0.50, height: GAME_HEIGHT * 1.5, sigma: 350 },   // MATTERHORN - tallest
          { x: switzerlandStart + swissWidth * 0.82, height: GAME_HEIGHT * 0.5, sigma: 260 },   // Third mountain
        ];

        // Calculate mountain height using MAX of Gaussian peaks (not sum!)
        // This creates distinct separate peaks with valleys between
        let mountainHeight = 0;
        for (const peak of peaks) {
          // Gaussian: height * exp(-((x-peak)^2) / (2*sigma^2))
          const contrib = peak.height * Math.exp(-Math.pow(x - peak.x, 2) / (2 * peak.sigma * peak.sigma));
          mountainHeight = Math.max(mountainHeight, contrib);
        }

        // Add subtle rocky texture
        const rockNoise = Math.sin(x * 0.03) * 8 + Math.sin(x * 0.07) * 4;

        heights[i] = baseHeight - mountainHeight + rockNoise;
      }
    }

    // Smooth the terrain with a moving average
    const smoothedHeights: number[] = [];
    const smoothRadius = 3;
    for (let i = 0; i < heights.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = -smoothRadius; j <= smoothRadius; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < heights.length) {
          sum += heights[idx];
          count++;
        }
      }
      smoothedHeights[i] = sum / count;
    }

    // Copy smoothed heights back
    for (let i = 0; i < heights.length; i++) {
      heights[i] = smoothedHeights[i];
    }

    // Flatten landing pad areas (with extra room on the left for flag)
    for (const pad of LANDING_PADS) {
      // Add 60px extra on left side for flag pole
      const extraLeft = 60;
      const extraRight = 20;
      const padStartIdx = Math.floor((pad.x - pad.width / 2 - extraLeft - startX) / TERRAIN_SEGMENT_WIDTH);
      const padEndIdx = Math.ceil((pad.x + pad.width / 2 + extraRight - startX) / TERRAIN_SEGMENT_WIDTH);

      if (padStartIdx >= 0 && padEndIdx < numPoints) {
        // Find average height in pad area (use center area for height calculation)
        const centerStartIdx = Math.floor((pad.x - pad.width / 2 - startX) / TERRAIN_SEGMENT_WIDTH);
        const centerEndIdx = Math.ceil((pad.x + pad.width / 2 - startX) / TERRAIN_SEGMENT_WIDTH);
        let avgHeight = 0;
        let count = 0;
        for (let i = centerStartIdx; i <= centerEndIdx; i++) {
          if (i >= 0 && i < heights.length) {
            avgHeight += heights[i];
            count++;
          }
        }
        avgHeight = count > 0 ? avgHeight / count : baseHeight;

        // Flatten the wider area (including flag space)
        for (let i = padStartIdx; i <= padEndIdx; i++) {
          if (i >= 0 && i < heights.length) {
            heights[i] = avgHeight;
          }
        }
      }
    }

    // Create flat plateau areas for buildings (not in Atlantic Ocean or Switzerland)
    const oceanStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const oceanEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
    const switzerlandStartX = COUNTRIES.find(c => c.name === 'Switzerland')?.startX ?? 10000;
    const switzerlandEndX = COUNTRIES.find(c => c.name === 'Germany')?.startX ?? 12000;
    const plateauWidth = 300; // Width of flat area in pixels
    const plateauSpacing = 800; // Average spacing between plateaus

    // Create plateaus throughout the terrain, avoiding ocean, Switzerland (mountains), and landing pads
    for (let x = startX + 400; x < endX - 400; x += plateauSpacing + Math.random() * 400) {
      // Skip Atlantic Ocean
      if (x >= oceanStart && x < oceanEnd) continue;

      // Skip Switzerland (mountainous terrain, no buildings)
      if (x >= switzerlandStartX && x < switzerlandEndX) continue;

      // Skip areas near landing pads
      const nearPad = LANDING_PADS.some(pad => Math.abs(x - pad.x) < pad.width + 200);
      if (nearPad) continue;

      // Calculate indices for this plateau
      const plateauStartIdx = Math.floor((x - plateauWidth / 2 - startX) / TERRAIN_SEGMENT_WIDTH);
      const plateauEndIdx = Math.ceil((x + plateauWidth / 2 - startX) / TERRAIN_SEGMENT_WIDTH);

      if (plateauStartIdx >= 0 && plateauEndIdx < numPoints) {
        // Find average height in plateau area
        let avgHeight = 0;
        let count = 0;
        for (let i = plateauStartIdx; i <= plateauEndIdx; i++) {
          if (i >= 0 && i < heights.length) {
            avgHeight += heights[i];
            count++;
          }
        }
        avgHeight = count > 0 ? avgHeight / count : baseHeight;

        // Clamp plateau height to reasonable range
        avgHeight = Phaser.Math.Clamp(avgHeight, GAME_HEIGHT * 0.5, GAME_HEIGHT * 0.85);

        // Flatten the plateau area
        for (let i = plateauStartIdx; i <= plateauEndIdx; i++) {
          if (i >= 0 && i < heights.length) {
            heights[i] = avgHeight;
          }
        }

        // Record this flat area for decoration placement
        this.flatAreas.push({
          x: x,
          width: plateauWidth,
          y: avgHeight,
        });
      }
    }

    // Clamp heights (but NOT for Switzerland mountains)
    const swissStart = COUNTRIES.find(c => c.name === 'Switzerland')?.startX ?? 10000;
    const swissEnd = COUNTRIES.find(c => c.name === 'Germany')?.startX ?? 12000;
    for (let i = 0; i < heights.length; i++) {
      const x = startX + i * TERRAIN_SEGMENT_WIDTH;
      // Don't clamp Switzerland - mountains go much higher
      if (x < swissStart || x >= swissEnd) {
        heights[i] = Phaser.Math.Clamp(heights[i], GAME_HEIGHT * 0.4, GAME_HEIGHT * 0.9);
      }
    }

    // Make Atlantic Ocean completely flat
    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
    const oceanHeight = GAME_HEIGHT * 0.75; // Flat ocean level

    for (let i = 0; i < heights.length; i++) {
      const x = startX + i * TERRAIN_SEGMENT_WIDTH;
      if (x >= atlanticStart && x < atlanticEnd) {
        heights[i] = oceanHeight;
      }
    }

    // Convert to vertices
    for (let i = 0; i < numPoints; i++) {
      this.vertices.push({
        x: startX + i * TERRAIN_SEGMENT_WIDTH,
        y: heights[i],
      });
    }
  }

  private createPhysicsBodies(): void {
    // Create static physics bodies for each segment using simple rectangles
    // This is more reliable than fromVertices which can create unexpected shapes
    for (let i = 0; i < this.vertices.length - 1; i++) {
      const v1 = this.vertices[i];
      const v2 = this.vertices[i + 1];

      // Create a thin rectangle at the terrain surface
      // Use the average height of the two vertices
      const avgY = (v1.y + v2.y) / 2;
      const centerX = (v1.x + v2.x) / 2;
      const width = v2.x - v1.x;
      const height = 10; // Thin surface collision

      const body = this.scene.matter.add.rectangle(
        centerX,
        avgY + height / 2, // Position just below the terrain line
        width,
        height,
        {
          isStatic: true,
          label: 'terrain',
          friction: 0.8,
          restitution: 0.1,
          angle: Math.atan2(v2.y - v1.y, v2.x - v1.x), // Rotate to match slope
          collisionFilter: {
            category: 2,
          },
        }
      );

      if (body) {
        this.bodies.push(body);
      }
    }

    // Create brick wall physics bodies at ocean edges
    this.createBrickWallBodies();
  }

  private createBrickWallBodies(): void {
    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
    const oceanHeight = GAME_HEIGHT * 0.75;

    // Get terrain heights at ocean edges (go far enough to get actual land, not flattened ocean)
    const leftLandHeight = Math.min(this.getHeightAt(atlanticStart - 50) ?? oceanHeight, oceanHeight);
    const rightLandHeight = Math.min(this.getHeightAt(atlanticEnd + 50) ?? oceanHeight, oceanHeight);

    const wallWidth = 12;

    // Left wall
    const leftWallHeight = GAME_HEIGHT - leftLandHeight;
    const leftWallBody = this.scene.matter.add.rectangle(
      atlanticStart,
      leftLandHeight + leftWallHeight / 2,
      wallWidth,
      leftWallHeight,
      {
        isStatic: true,
        label: 'brick_wall',
        friction: 0.9,
        restitution: 0.3, // Some bounce
        collisionFilter: {
          category: 2,
        },
      }
    );
    if (leftWallBody) {
      this.bodies.push(leftWallBody);
    }

    // Right wall
    const rightWallHeight = GAME_HEIGHT - rightLandHeight;
    const rightWallBody = this.scene.matter.add.rectangle(
      atlanticEnd,
      rightLandHeight + rightWallHeight / 2,
      wallWidth,
      rightWallHeight,
      {
        isStatic: true,
        label: 'brick_wall',
        friction: 0.9,
        restitution: 0.3, // Some bounce
        collisionFilter: {
          category: 2,
        },
      }
    );
    if (rightWallBody) {
      this.bodies.push(rightWallBody);
    }
  }

  private draw(): void {
    this.graphics.clear();

    const BLEND_WIDTH = 150; // Width of gradient transition between countries

    // Draw filled terrain for each country section
    for (let countryIdx = 0; countryIdx < COUNTRIES.length; countryIdx++) {
      const country = COUNTRIES[countryIdx];
      const nextCountry = COUNTRIES[countryIdx + 1];
      const endX = nextCountry ? nextCountry.startX : Infinity;
      const isOcean = country.name === 'Atlantic Ocean';

      // Collect vertices for this country (include one extra vertex past the boundary to ensure overlap)
      const countryVertices: TerrainVertex[] = [];
      for (let i = 0; i < this.vertices.length; i++) {
        const vertex = this.vertices[i];
        if (vertex.x >= country.startX && vertex.x <= endX + TERRAIN_SEGMENT_WIDTH) {
          countryVertices.push(vertex);
        }
      }

      if (countryVertices.length < 2) continue;

      // Skip detailed drawing for ocean (handled separately)
      if (isOcean) continue;

      // Draw underground dirt/rock layers
      const dirtColor = darkenColor(country.color, 0.5);
      const rockColor = darkenColor(country.color, 0.35);

      // For Switzerland, use alpine meadow green for the base fill
      const isSwiss = country.name === 'Switzerland';
      const baseFillColor = isSwiss ? 0x3d6834 : rockColor; // Dark meadow green for Swiss

      // FIRST: Draw a solid base fill from terrain surface to bottom of screen
      // This ensures no gaps can appear
      this.graphics.fillStyle(baseFillColor, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(countryVertices[0].x, countryVertices[0].y);
      for (let i = 1; i < countryVertices.length; i++) {
        this.graphics.lineTo(countryVertices[i].x, countryVertices[i].y);
      }
      this.graphics.lineTo(countryVertices[countryVertices.length - 1].x, GAME_HEIGHT + 100);
      this.graphics.lineTo(countryVertices[0].x, GAME_HEIGHT + 100);
      this.graphics.closePath();
      this.graphics.fillPath();

      // Middle dirt layer (on top of rock)
      // Draw with bottom edge following terrain profile offset by 60px
      const middleLayerColor = isSwiss ? 0x4a7c3f : dirtColor; // Meadow green for Swiss
      this.graphics.fillStyle(middleLayerColor, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(countryVertices[0].x, countryVertices[0].y);
      for (let i = 1; i < countryVertices.length; i++) {
        this.graphics.lineTo(countryVertices[i].x, countryVertices[i].y);
      }
      // Draw bottom edge in reverse, offset by 60px
      for (let i = countryVertices.length - 1; i >= 0; i--) {
        this.graphics.lineTo(countryVertices[i].x, countryVertices[i].y + 60);
      }
      this.graphics.closePath();
      this.graphics.fillPath();

      // Top grass/surface layer
      // Draw with bottom edge following terrain profile offset by 30px
      const topLayerColor = isSwiss ? 0x5a9c4f : country.color; // Light meadow green for Swiss
      this.graphics.fillStyle(topLayerColor, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(countryVertices[0].x, countryVertices[0].y);
      for (let i = 1; i < countryVertices.length; i++) {
        this.graphics.lineTo(countryVertices[i].x, countryVertices[i].y);
      }
      // Draw bottom edge in reverse, offset by 30px
      for (let i = countryVertices.length - 1; i >= 0; i--) {
        this.graphics.lineTo(countryVertices[i].x, countryVertices[i].y + 30);
      }
      this.graphics.closePath();
      this.graphics.fillPath();

      // Draw grass tufts on top
      const grassColor = lightenColor(country.color, 1.3);
      const darkGrassColor = darkenColor(country.color, 0.8);

      for (let i = 0; i < countryVertices.length - 1; i += 2) {
        const v = countryVertices[i];
        const seed = Math.sin(v.x * 0.1) * 10000;

        // Draw grass blades
        for (let g = 0; g < 3; g++) {
          const grassX = v.x + (seed % 15) - 7 + g * 5;
          const grassY = v.y;
          const grassHeight = 6 + (seed % 6);
          const lean = Math.sin(seed + g) * 3;

          this.graphics.lineStyle(2, grassColor, 0.9);
          this.graphics.beginPath();
          this.graphics.moveTo(grassX, grassY);
          this.graphics.lineTo(grassX + lean, grassY - grassHeight);
          this.graphics.strokePath();
        }
      }

      // Draw small rocks/pebbles along the dirt layer edge
      for (let i = 0; i < countryVertices.length - 1; i += 8) {
        const v = countryVertices[i];
        const seed = Math.cos(v.x * 0.05) * 10000;

        // Small rocks
        this.graphics.fillStyle(darkenColor(dirtColor, 0.7), 0.8);
        const rockX = v.x + (seed % 20) - 10;
        const rockY = v.y + 20 + (seed % 10);
        const rockSize = 3 + (seed % 4);
        this.graphics.fillCircle(rockX, rockY, rockSize);

        // Highlight on rock
        this.graphics.fillStyle(lightenColor(dirtColor, 1.2), 0.5);
        this.graphics.fillCircle(rockX - 1, rockY - 1, rockSize * 0.5);
      }

      // Draw darker outline on terrain edge
      this.graphics.lineStyle(2, darkenColor(country.color, 0.5), 1);
      this.graphics.beginPath();
      this.graphics.moveTo(countryVertices[0].x, countryVertices[0].y);
      for (let i = 1; i < countryVertices.length; i++) {
        this.graphics.lineTo(countryVertices[i].x, countryVertices[i].y);
      }
      this.graphics.strokePath();

      // Draw lighter highlight just below the edge
      this.graphics.lineStyle(3, lightenColor(country.color, 1.15), 0.7);
      this.graphics.beginPath();
      this.graphics.moveTo(countryVertices[0].x, countryVertices[0].y + 3);
      for (let i = 1; i < countryVertices.length; i++) {
        this.graphics.lineTo(countryVertices[i].x, countryVertices[i].y + 3);
      }
      this.graphics.strokePath();

      // Add small bushes/shrubs randomly
      for (let i = 0; i < countryVertices.length - 1; i += 15) {
        const v = countryVertices[i];
        const seed = Math.sin(v.x * 0.03) * 10000;

        if (Math.abs(seed % 10) < 4) { // ~40% chance
          this.drawBush(v.x + (seed % 30) - 15, v.y, country.color, seed);
        }
      }

      // Add small trees occasionally (not too many)
      for (let i = 0; i < countryVertices.length - 1; i += 40) {
        const v = countryVertices[i];
        const seed = Math.cos(v.x * 0.02) * 10000;

        if (Math.abs(seed % 10) < 2) { // ~20% chance
          this.drawSmallTree(v.x + (seed % 20) - 10, v.y, country.color, seed);
        }
      }

      // Draw gradient transition to next country
      if (nextCountry && nextCountry.name !== 'Atlantic Ocean' && country.name !== 'Atlantic Ocean') {
        this.drawCountryTransition(country.color, nextCountry.color, nextCountry.startX, BLEND_WIDTH);
      }

      // Draw snow caps for Switzerland (high altitude terrain)
      if (country.name === 'Switzerland') {
        this.drawSwissGrassSlopes(countryVertices, country.color);
        this.drawSwissSnowCaps(countryVertices);
      }
    }
  }

  private drawSwissGrassSlopes(vertices: TerrainVertex[], baseGrassColor: number): void {
    // The base terrain is already green - just add decorative grass tufts and flowers
    const snowLineY = GAME_HEIGHT * 0.35;
    const groundLevel = GAME_HEIGHT * 0.75;
    const lightMeadowGreen = 0x5a9c4f;

    // Draw grass tufts and alpine flowers on the meadow slopes
    for (let i = 0; i < vertices.length - 1; i += 3) {
      const v = vertices[i];

      // Only on slopes below snow line
      if (v.y > snowLineY && v.y < groundLevel - 20) {
        const seed = Math.sin(v.x * 0.1) * 10000;
        const elevationRatio = (v.y - snowLineY) / (groundLevel - snowLineY);

        // Draw grass tufts - more at lower elevations
        const tuftsCount = Math.floor(2 + elevationRatio * 4);
        for (let t = 0; t < tuftsCount; t++) {
          const tX = v.x + (seed % 20) - 10 + t * 8;
          const tY = v.y + 5 + (seed % 15);
          const height = 8 + (seed % 8);
          const lean = Math.sin(seed + t) * 4;

          this.graphics.lineStyle(2, lightMeadowGreen, 0.9);
          this.graphics.beginPath();
          this.graphics.moveTo(tX, tY);
          this.graphics.lineTo(tX + lean, tY - height);
          this.graphics.strokePath();
        }

        // Occasional alpine flowers (small colored dots)
        if (Math.abs(seed % 15) < 3 && elevationRatio > 0.2) {
          const flowerColors = [0xFFFF00, 0xFF69B4, 0x9370DB, 0xFFFFFF]; // Yellow, pink, purple, white
          const flowerColor = flowerColors[Math.floor(Math.abs(seed % 4))];
          this.graphics.fillStyle(flowerColor, 0.9);
          this.graphics.fillCircle(v.x + (seed % 25) - 12, v.y + 10 + (seed % 20), 3);
        }
      }
    }
  }

  private drawSwissSnowCaps(vertices: TerrainVertex[]): void {
    // Snow appears above a certain altitude (lower y value = higher altitude)
    // Snow line is about 40% up the screen
    const snowLineY = GAME_HEIGHT * 0.35;

    // Draw snow layer on terrain above snow line
    for (let i = 0; i < vertices.length - 1; i++) {
      const v1 = vertices[i];
      const v2 = vertices[i + 1];

      // Only draw snow above the snow line
      if (v1.y < snowLineY || v2.y < snowLineY) {
        // Calculate how much of this segment is above snow line
        const minY = Math.min(v1.y, v2.y);

        // Snow is whiter at higher altitudes
        const altitude = snowLineY - minY;
        const snowIntensity = Math.min(1, altitude / (GAME_HEIGHT * 0.5));

        // Draw snow cap - white layer on top of terrain
        const snowDepth = 15 + snowIntensity * 20; // Deeper snow at higher elevations

        // Pure white snow at peaks, slightly gray lower
        const snowColor = snowIntensity > 0.5 ? 0xFFFFFF : 0xF0F0F0;

        this.graphics.fillStyle(snowColor, 0.95);
        this.graphics.beginPath();
        this.graphics.moveTo(v1.x, Math.min(v1.y, snowLineY));
        this.graphics.lineTo(v2.x, Math.min(v2.y, snowLineY));
        this.graphics.lineTo(v2.x, Math.min(v2.y, snowLineY) + snowDepth);
        this.graphics.lineTo(v1.x, Math.min(v1.y, snowLineY) + snowDepth);
        this.graphics.closePath();
        this.graphics.fillPath();

        // Add some snow texture/sparkle
        if (i % 3 === 0) {
          const seed = Math.sin(v1.x * 0.1) * 1000;
          this.graphics.fillStyle(0xFFFFFF, 0.8);
          this.graphics.fillCircle(v1.x + (seed % 10), v1.y + 5, 2 + (seed % 2));
        }
      }
    }

    // Draw icicles/snow edges at snow line boundary
    for (let i = 0; i < vertices.length - 1; i += 4) {
      const v = vertices[i];
      if (v.y < snowLineY + 50 && v.y > snowLineY - 100) {
        const seed = Math.cos(v.x * 0.08) * 1000;
        // Small snow patches near snow line
        this.graphics.fillStyle(0xFFFFFF, 0.7);
        this.graphics.fillCircle(v.x + (seed % 15) - 7, v.y - 3, 4 + (seed % 3));
      }
    }
  }

  private drawCountryTransition(fromColor: number, toColor: number, borderX: number, width: number): void {
    const steps = 10;
    const stepWidth = width / steps;

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const alpha = t; // Fade in the next country's color

      // Get height at this position
      const x = borderX - width / 2 + i * stepWidth;
      const height = this.getHeightAt(x);

      // Draw a vertical strip with blended color
      this.graphics.fillStyle(toColor, alpha * 0.7);
      this.graphics.fillRect(x, height, stepWidth + 1, GAME_HEIGHT - height + 50);

      // Also blend the dirt layer
      const dirtColor = darkenColor(toColor, 0.5);
      this.graphics.fillStyle(dirtColor, alpha * 0.5);
      this.graphics.fillRect(x, height + 25, stepWidth + 1, GAME_HEIGHT - height + 25);
    }
  }

  private drawBush(x: number, y: number, baseColor: number, seed: number): void {
    const bushColor = darkenColor(baseColor, 0.75);
    const highlightColor = lightenColor(baseColor, 1.1);
    const size = 8 + (seed % 6);

    // Bush shadow
    this.graphics.fillStyle(darkenColor(bushColor, 0.6), 0.5);
    this.graphics.fillEllipse(x + 2, y + 2, size * 1.2, size * 0.7);

    // Main bush body (multiple overlapping circles)
    this.graphics.fillStyle(bushColor, 1);
    this.graphics.fillCircle(x - size * 0.3, y - size * 0.3, size * 0.6);
    this.graphics.fillCircle(x + size * 0.3, y - size * 0.3, size * 0.55);
    this.graphics.fillCircle(x, y - size * 0.5, size * 0.7);

    // Highlights
    this.graphics.fillStyle(highlightColor, 0.6);
    this.graphics.fillCircle(x - size * 0.2, y - size * 0.6, size * 0.3);
  }

  private drawSmallTree(x: number, y: number, baseColor: number, seed: number): void {
    const trunkColor = 0x8B4513; // Saddle brown
    const leafColor = darkenColor(baseColor, 0.7);
    const highlightColor = lightenColor(baseColor, 1.2);
    const height = 20 + (seed % 15);

    // Tree shadow
    this.graphics.fillStyle(0x000000, 0.2);
    this.graphics.fillEllipse(x + 3, y + 2, 12, 5);

    // Trunk
    this.graphics.fillStyle(trunkColor, 1);
    this.graphics.fillRect(x - 2, y - height * 0.4, 4, height * 0.4);

    // Trunk highlight
    this.graphics.fillStyle(0xA0522D, 0.7);
    this.graphics.fillRect(x - 2, y - height * 0.4, 2, height * 0.4);

    // Foliage (layered circles)
    this.graphics.fillStyle(leafColor, 1);
    this.graphics.fillCircle(x, y - height * 0.6, height * 0.35);
    this.graphics.fillCircle(x - height * 0.2, y - height * 0.5, height * 0.25);
    this.graphics.fillCircle(x + height * 0.2, y - height * 0.5, height * 0.25);
    this.graphics.fillCircle(x, y - height * 0.8, height * 0.25);

    // Foliage highlights
    this.graphics.fillStyle(highlightColor, 0.5);
    this.graphics.fillCircle(x - height * 0.1, y - height * 0.7, height * 0.15);
  }

  /**
   * Draw terrain in chunks for better performance (culling)
   */
  private drawChunked(): void {
    // Calculate chunk indices
    const startChunk = Math.floor(this.chunkStartX / this.CHUNK_WIDTH);
    const endChunk = Math.ceil(this.chunkEndX / this.CHUNK_WIDTH);

    // Create a Graphics object for each chunk
    for (let chunkIndex = startChunk; chunkIndex <= endChunk; chunkIndex++) {
      const chunkStartX = chunkIndex * this.CHUNK_WIDTH;
      const chunkEndX = chunkStartX + this.CHUNK_WIDTH;

      const chunkGraphics = this.scene.add.graphics();
      chunkGraphics.setDepth(0);
      this.chunks.set(chunkIndex, chunkGraphics);

      // Draw this chunk's terrain
      this.drawChunk(chunkGraphics, chunkStartX, chunkEndX);
    }
  }

  /**
   * Draw a single chunk of terrain
   */
  private drawChunk(graphics: Phaser.GameObjects.Graphics, chunkStartX: number, chunkEndX: number): void {
    const BLEND_WIDTH = 150;

    // Get vertices in this chunk (with some overlap for smooth edges)
    const chunkVertices = this.vertices.filter(
      v => v.x >= chunkStartX - TERRAIN_SEGMENT_WIDTH && v.x <= chunkEndX + TERRAIN_SEGMENT_WIDTH
    );

    if (chunkVertices.length < 2) return;

    // Find which countries this chunk spans
    for (let countryIdx = 0; countryIdx < COUNTRIES.length; countryIdx++) {
      const country = COUNTRIES[countryIdx];
      const nextCountry = COUNTRIES[countryIdx + 1];
      const countryEndX = nextCountry ? nextCountry.startX : Infinity;
      const isOcean = country.name === 'Atlantic Ocean';

      // Skip if country doesn't overlap this chunk
      if (countryEndX < chunkStartX || country.startX > chunkEndX) continue;

      // Skip ocean (handled separately)
      if (isOcean) continue;

      // Get vertices for this country within this chunk
      const countryVertices = chunkVertices.filter(
        v => v.x >= country.startX && v.x <= countryEndX + TERRAIN_SEGMENT_WIDTH
      );

      if (countryVertices.length < 2) continue;

      // Draw the terrain layers for this country section
      const isSwiss = country.name === 'Switzerland';
      const dirtColor = darkenColor(country.color, 0.5);
      const rockColor = darkenColor(country.color, 0.35);
      const baseFillColor = isSwiss ? 0x3d6834 : rockColor;

      // Base fill
      graphics.fillStyle(baseFillColor, 1);
      graphics.beginPath();
      graphics.moveTo(countryVertices[0].x, countryVertices[0].y);
      for (let i = 1; i < countryVertices.length; i++) {
        graphics.lineTo(countryVertices[i].x, countryVertices[i].y);
      }
      graphics.lineTo(countryVertices[countryVertices.length - 1].x, GAME_HEIGHT + 100);
      graphics.lineTo(countryVertices[0].x, GAME_HEIGHT + 100);
      graphics.closePath();
      graphics.fillPath();

      // Middle dirt layer
      const middleLayerColor = isSwiss ? 0x4a7c3f : dirtColor;
      graphics.fillStyle(middleLayerColor, 1);
      graphics.beginPath();
      graphics.moveTo(countryVertices[0].x, countryVertices[0].y);
      for (let i = 1; i < countryVertices.length; i++) {
        graphics.lineTo(countryVertices[i].x, countryVertices[i].y);
      }
      for (let i = countryVertices.length - 1; i >= 0; i--) {
        graphics.lineTo(countryVertices[i].x, countryVertices[i].y + 60);
      }
      graphics.closePath();
      graphics.fillPath();

      // Top grass/surface layer
      const topLayerColor = isSwiss ? 0x5a9c4f : country.color;
      graphics.fillStyle(topLayerColor, 1);
      graphics.beginPath();
      graphics.moveTo(countryVertices[0].x, countryVertices[0].y);
      for (let i = 1; i < countryVertices.length; i++) {
        graphics.lineTo(countryVertices[i].x, countryVertices[i].y);
      }
      for (let i = countryVertices.length - 1; i >= 0; i--) {
        graphics.lineTo(countryVertices[i].x, countryVertices[i].y + 30);
      }
      graphics.closePath();
      graphics.fillPath();

      // Note: Grass blades removed from chunked terrain for cleaner look and better performance
    }
  }

  /**
   * Update which chunks are visible based on camera position
   */
  updateChunkVisibility(cameraX: number, screenWidth: number): void {
    const margin = 1000; // Show chunks within this margin of screen
    const visibleStart = cameraX - margin;
    const visibleEnd = cameraX + screenWidth + margin;

    // Cull terrain chunks
    for (const [chunkIndex, graphics] of this.chunks) {
      const chunkStartX = chunkIndex * this.CHUNK_WIDTH;
      const chunkEndX = chunkStartX + this.CHUNK_WIDTH;

      const isVisible = chunkEndX >= visibleStart && chunkStartX <= visibleEnd;
      graphics.setVisible(isVisible);
    }

    // Cull ocean (Atlantic is from 2000 to 5000)
    const atlanticStart = 2000;
    const atlanticEnd = 5000;
    const oceanVisible = atlanticEnd >= visibleStart && atlanticStart <= visibleEnd;
    if (this.oceanGraphics) {
      this.oceanGraphics.setVisible(oceanVisible);
    }
  }

  getVertices(): TerrainVertex[] {
    return this.vertices;
  }

  getFlatAreas(): FlatArea[] {
    return this.flatAreas;
  }

  getHeightAt(x: number): number {
    // Find the two vertices this x is between
    for (let i = 0; i < this.vertices.length - 1; i++) {
      const v1 = this.vertices[i];
      const v2 = this.vertices[i + 1];

      if (x >= v1.x && x <= v2.x) {
        // Linear interpolation
        const t = (x - v1.x) / (v2.x - v1.x);
        return v1.y + t * (v2.y - v1.y);
      }
    }

    return GAME_HEIGHT * 0.7;
  }

  update(waterPollutionLevel: number = 0): void {
    // Check if ocean waves are enabled for performance
    const oceanWavesEnabled = PerformanceSettings.getPreset().oceanWaves;

    if (oceanWavesEnabled) {
      // Animate ocean waves
      this.waveOffset += 0.02;
      this.drawOcean(waterPollutionLevel);
      this.staticOceanDrawn = false; // Reset so we redraw if setting changes
    } else {
      // Draw static ocean only once for performance
      if (!this.staticOceanDrawn) {
        this.drawStaticOcean(waterPollutionLevel);
        this.staticOceanDrawn = true;
      }
    }
  }

  /**
   * Draw a simplified static ocean (no animation) for low-performance devices
   */
  private drawStaticOcean(waterPollutionLevel: number = 0): void {
    if (!this.oceanGraphics) {
      this.oceanGraphics = this.scene.add.graphics();
      this.oceanGraphics.setDepth(-1);
    }
    this.oceanGraphics.clear();

    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
    const oceanHeight = GAME_HEIGHT * 0.75;

    // Helper to tint a color towards dark brown/black based on pollution level
    const tintColor = (color: number, pollution: number): number => {
      const pollutionColor = 0x0a0805;
      const r = (color >> 16) & 0xFF;
      const g = (color >> 8) & 0xFF;
      const b = color & 0xFF;
      const pr = (pollutionColor >> 16) & 0xFF;
      const pg = (pollutionColor >> 8) & 0xFF;
      const pb = pollutionColor & 0xFF;
      const nr = Math.floor(r + (pr - r) * pollution);
      const ng = Math.floor(g + (pg - g) * pollution);
      const nb = Math.floor(b + (pb - b) * pollution);
      return (nr << 16) | (ng << 8) | nb;
    };

    // Draw simple static ocean - just a rectangle
    const baseOceanColor = tintColor(0x1E90FF, waterPollutionLevel);
    this.oceanGraphics.fillStyle(baseOceanColor, 1);
    this.oceanGraphics.fillRect(atlanticStart, oceanHeight, atlanticEnd - atlanticStart, GAME_HEIGHT - oceanHeight + 50);

    // Draw brick walls at ocean edges
    const leftLandHeight = this.getHeightAt(atlanticStart - 50) ?? oceanHeight;
    const rightLandHeight = this.getHeightAt(atlanticEnd + 50) ?? oceanHeight;
    this.drawBrickWall(atlanticStart, Math.min(leftLandHeight, oceanHeight), GAME_HEIGHT);
    this.drawBrickWall(atlanticEnd, Math.min(rightLandHeight, oceanHeight), GAME_HEIGHT);
  }

  getWaveOffset(): number {
    return this.waveOffset;
  }

  private drawOcean(waterPollutionLevel: number = 0): void {
    // Reuse graphics object - just clear it each frame
    if (!this.oceanGraphics) {
      this.oceanGraphics = this.scene.add.graphics();
      this.oceanGraphics.setDepth(-1);
    }
    this.oceanGraphics.clear();

    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
    const oceanHeight = GAME_HEIGHT * 0.75;

    // Helper to tint a color towards dark brown/black based on pollution level
    const tintColor = (color: number, pollution: number): number => {
      const pollutionColor = 0x0a0805; // Dark brown/black target
      const r = (color >> 16) & 0xFF;
      const g = (color >> 8) & 0xFF;
      const b = color & 0xFF;
      const pr = (pollutionColor >> 16) & 0xFF;
      const pg = (pollutionColor >> 8) & 0xFF;
      const pb = pollutionColor & 0xFF;
      // Lerp towards pollution color
      const nr = Math.floor(r + (pr - r) * pollution);
      const ng = Math.floor(g + (pg - g) * pollution);
      const nb = Math.floor(b + (pb - b) * pollution);
      return (nr << 16) | (ng << 8) | nb;
    };

    // Draw base ocean
    const baseOceanColor = tintColor(0x1E90FF, waterPollutionLevel);
    this.oceanGraphics.fillStyle(baseOceanColor, 1); // Dodger blue -> polluted
    this.oceanGraphics.fillRect(atlanticStart, oceanHeight, atlanticEnd - atlanticStart, GAME_HEIGHT - oceanHeight + 50);

    // Draw animated wave layers
    const waveColors = [0x4169E1, 0x6495ED, 0x87CEEB]; // Royal blue, Cornflower blue, Sky blue
    const waveAmplitudes = [12, 8, 5];
    const waveFrequencies = [0.015, 0.025, 0.035];
    const waveYOffsets = [0, 15, 30];

    for (let layer = 0; layer < 3; layer++) {
      const tintedWaveColor = tintColor(waveColors[layer], waterPollutionLevel);
      this.oceanGraphics.fillStyle(tintedWaveColor, 0.8 - layer * 0.2);
      this.oceanGraphics.beginPath();

      const y = oceanHeight + waveYOffsets[layer];
      this.oceanGraphics.moveTo(atlanticStart, y);

      // Draw wave shape
      for (let x = atlanticStart; x <= atlanticEnd; x += 10) {
        const waveY = y + Math.sin((x * waveFrequencies[layer]) + this.waveOffset * (3 - layer)) * waveAmplitudes[layer];
        this.oceanGraphics.lineTo(x, waveY);
      }

      // Complete the fill shape
      this.oceanGraphics.lineTo(atlanticEnd, GAME_HEIGHT + 50);
      this.oceanGraphics.lineTo(atlanticStart, GAME_HEIGHT + 50);
      this.oceanGraphics.closePath();
      this.oceanGraphics.fillPath();
    }

    // Draw foam/whitecaps (fade out with pollution)
    const foamAlpha = 0.6 * (1 - waterPollutionLevel * 0.8); // Foam gets murky too
    const foamColor = tintColor(0xFFFFFF, waterPollutionLevel * 0.7); // Gray out foam
    this.oceanGraphics.fillStyle(foamColor, foamAlpha);
    for (let x = atlanticStart + 50; x < atlanticEnd - 50; x += 150) {
      const foamX = x + Math.sin(this.waveOffset * 0.5 + x * 0.01) * 20;
      const foamY = oceanHeight + Math.sin(foamX * 0.015 + this.waveOffset) * 10;

      // Draw small foam patches
      this.oceanGraphics.fillCircle(foamX, foamY, 8);
      this.oceanGraphics.fillCircle(foamX + 15, foamY + 3, 5);
      this.oceanGraphics.fillCircle(foamX - 10, foamY + 5, 6);
    }

    // Draw brick walls at ocean edges - from land height down to bottom
    // Need to go far enough from ocean edge to get actual land height (not flattened ocean)
    const leftLandHeight = this.getHeightAt(atlanticStart - 50) ?? oceanHeight;
    const rightLandHeight = this.getHeightAt(atlanticEnd + 50) ?? oceanHeight;

    // Draw walls at the actual ocean boundaries
    this.drawBrickWall(atlanticStart, Math.min(leftLandHeight, oceanHeight), GAME_HEIGHT);
    this.drawBrickWall(atlanticEnd, Math.min(rightLandHeight, oceanHeight), GAME_HEIGHT);
  }

  private drawBrickWall(x: number, topY: number, bottomY: number): void {
    const wallWidth = 12;
    const brickHeight = 8;
    const brickWidth = wallWidth - 2;
    const mortarColor = 0x888888;
    const brickColor = 0x8B4513; // Saddle brown
    const brickColorDark = 0x6B3310;
    const brickColorLight = 0x9B5523;

    // Draw mortar background
    this.oceanGraphics.fillStyle(mortarColor, 1);
    this.oceanGraphics.fillRect(x - wallWidth / 2, topY, wallWidth, bottomY - topY);

    // Draw bricks in alternating pattern
    let row = 0;
    for (let y = topY; y < bottomY; y += brickHeight) {
      const offset = (row % 2) * (brickWidth / 2); // Alternate brick offset

      for (let bx = -1; bx <= 1; bx++) {
        const brickX = x - wallWidth / 2 + 1 + offset + bx * brickWidth;
        const brickY = y + 1;
        const actualHeight = Math.min(brickHeight - 2, bottomY - brickY);

        if (actualHeight <= 0) continue;

        // Vary brick colors slightly for texture
        const colorVariant = ((row + bx) % 3);
        const color = colorVariant === 0 ? brickColor : colorVariant === 1 ? brickColorDark : brickColorLight;

        this.oceanGraphics.fillStyle(color, 1);
        this.oceanGraphics.fillRect(brickX, brickY, brickWidth - 1, actualHeight);

        // Add subtle highlight on top edge
        this.oceanGraphics.fillStyle(0xAA6633, 0.5);
        this.oceanGraphics.fillRect(brickX, brickY, brickWidth - 1, 1);
      }
      row++;
    }
  }

  /**
   * Toggle terrain graphics visibility (for performance testing)
   */
  setVisible(visible: boolean): void {
    // Toggle all chunks
    for (const [, graphics] of this.chunks) {
      graphics.setVisible(visible);
    }
    if (this.oceanGraphics) {
      this.oceanGraphics.setVisible(visible);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.oceanGraphics.destroy();
    // Destroy all chunks
    for (const [, graphics] of this.chunks) {
      graphics.destroy();
    }
    this.chunks.clear();
    for (const body of this.bodies) {
      this.scene.matter.world.remove(body);
    }
  }
}
