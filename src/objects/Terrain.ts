import Phaser from 'phaser';
import { TERRAIN_SEGMENT_WIDTH, TERRAIN_ROUGHNESS, GAME_HEIGHT, COLORS, COUNTRIES, LANDING_PADS, WORLD_START_X } from '../constants';

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
  private graphics: Phaser.GameObjects.Graphics;
  private oceanGraphics: Phaser.GameObjects.Graphics;
  private vertices: TerrainVertex[] = [];
  private bodies: MatterJS.BodyType[] = [];
  private waveOffset: number = 0;
  private flatAreas: FlatArea[] = [];

  constructor(scene: Phaser.Scene, startX: number, endX: number) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.oceanGraphics = scene.add.graphics();

    this.generateTerrain(startX, endX);
    this.createPhysicsBodies();
    this.draw();
  }

  private generateTerrain(startX: number, endX: number): void {
    const numPoints = Math.ceil((endX - startX) / TERRAIN_SEGMENT_WIDTH) + 1;
    const baseHeight = GAME_HEIGHT * 0.7;

    // Initialize with random heights
    const heights: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      heights[i] = baseHeight + (Math.random() - 0.5) * GAME_HEIGHT * 0.3;
    }

    // Midpoint displacement for natural terrain
    let displacement = GAME_HEIGHT * 0.2;
    for (let step = Math.floor(numPoints / 2); step > 1; step = Math.floor(step / 2)) {
      for (let i = step; i < numPoints - 1; i += step * 2) {
        if (i - step >= 0 && i + step < numPoints) {
          const left = heights[i - step];
          const right = heights[i + step];
          heights[i] = (left + right) / 2 + (Math.random() - 0.5) * displacement;
        }
      }
      displacement *= TERRAIN_ROUGHNESS;
    }

    // Flatten landing pad areas
    for (const pad of LANDING_PADS) {
      const padStartIdx = Math.floor((pad.x - pad.width / 2 - startX) / TERRAIN_SEGMENT_WIDTH);
      const padEndIdx = Math.ceil((pad.x + pad.width / 2 - startX) / TERRAIN_SEGMENT_WIDTH);

      if (padStartIdx >= 0 && padEndIdx < numPoints) {
        // Find average height in pad area
        let avgHeight = 0;
        let count = 0;
        for (let i = padStartIdx; i <= padEndIdx; i++) {
          if (i >= 0 && i < heights.length) {
            avgHeight += heights[i];
            count++;
          }
        }
        avgHeight = count > 0 ? avgHeight / count : baseHeight;

        // Flatten the area
        for (let i = padStartIdx; i <= padEndIdx; i++) {
          if (i >= 0 && i < heights.length) {
            heights[i] = avgHeight;
          }
        }
      }
    }

    // Create flat plateau areas for buildings (not in Atlantic Ocean)
    const oceanStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const oceanEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
    const plateauWidth = 300; // Width of flat area in pixels
    const plateauSpacing = 800; // Average spacing between plateaus

    // Create plateaus throughout the terrain, avoiding ocean and landing pads
    for (let x = startX + 400; x < endX - 400; x += plateauSpacing + Math.random() * 400) {
      // Skip Atlantic Ocean
      if (x >= oceanStart && x < oceanEnd) continue;

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

    // Clamp heights
    for (let i = 0; i < heights.length; i++) {
      heights[i] = Phaser.Math.Clamp(heights[i], GAME_HEIGHT * 0.4, GAME_HEIGHT * 0.9);
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
  }

  private draw(): void {
    this.graphics.clear();

    // Draw filled terrain for each country section
    for (let countryIdx = 0; countryIdx < COUNTRIES.length; countryIdx++) {
      const country = COUNTRIES[countryIdx];
      const nextCountry = COUNTRIES[countryIdx + 1];
      const endX = nextCountry ? nextCountry.startX : Infinity;

      // Collect vertices for this country
      const countryVertices: TerrainVertex[] = [];
      for (const vertex of this.vertices) {
        if (vertex.x >= country.startX && vertex.x < endX) {
          countryVertices.push(vertex);
        }
      }

      if (countryVertices.length < 2) continue;

      // Draw filled terrain
      this.graphics.fillStyle(country.color, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(countryVertices[0].x, countryVertices[0].y);

      for (let i = 1; i < countryVertices.length; i++) {
        this.graphics.lineTo(countryVertices[i].x, countryVertices[i].y);
      }

      // Close the shape at the bottom
      this.graphics.lineTo(countryVertices[countryVertices.length - 1].x, GAME_HEIGHT + 50);
      this.graphics.lineTo(countryVertices[0].x, GAME_HEIGHT + 50);
      this.graphics.closePath();
      this.graphics.fillPath();

      // Draw darker outline on top
      this.graphics.lineStyle(3, this.darkenColor(country.color, 0.6), 1);
      this.graphics.beginPath();
      this.graphics.moveTo(countryVertices[0].x, countryVertices[0].y);
      for (let i = 1; i < countryVertices.length; i++) {
        this.graphics.lineTo(countryVertices[i].x, countryVertices[i].y);
      }
      this.graphics.strokePath();

      // Draw grass/surface detail on top edge
      this.graphics.lineStyle(5, this.lightenColor(country.color, 1.2), 1);
      this.graphics.beginPath();
      this.graphics.moveTo(countryVertices[0].x, countryVertices[0].y);
      for (let i = 1; i < countryVertices.length; i++) {
        this.graphics.lineTo(countryVertices[i].x, countryVertices[i].y);
      }
      this.graphics.strokePath();
    }

    // No glow effect for cartoon style
  }

  private darkenColor(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xFF) * factor);
    const g = Math.floor(((color >> 8) & 0xFF) * factor);
    const b = Math.floor((color & 0xFF) * factor);
    return (r << 16) | (g << 8) | b;
  }

  private lightenColor(color: number, factor: number): number {
    const r = Math.min(255, Math.floor(((color >> 16) & 0xFF) * factor));
    const g = Math.min(255, Math.floor(((color >> 8) & 0xFF) * factor));
    const b = Math.min(255, Math.floor((color & 0xFF) * factor));
    return (r << 16) | (g << 8) | b;
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

  update(): void {
    // Animate ocean waves
    this.waveOffset += 0.02;
    this.drawOcean();
  }

  private drawOcean(): void {
    this.oceanGraphics.clear();

    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 4000;
    const oceanHeight = GAME_HEIGHT * 0.75;

    // Draw base ocean
    this.oceanGraphics.fillStyle(0x1E90FF, 1); // Dodger blue
    this.oceanGraphics.fillRect(atlanticStart, oceanHeight, atlanticEnd - atlanticStart, GAME_HEIGHT - oceanHeight + 50);

    // Draw animated wave layers
    const waveColors = [0x4169E1, 0x6495ED, 0x87CEEB]; // Royal blue, Cornflower blue, Sky blue
    const waveAmplitudes = [12, 8, 5];
    const waveFrequencies = [0.015, 0.025, 0.035];
    const waveYOffsets = [0, 15, 30];

    for (let layer = 0; layer < 3; layer++) {
      this.oceanGraphics.fillStyle(waveColors[layer], 0.8 - layer * 0.2);
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

    // Draw foam/whitecaps
    this.oceanGraphics.fillStyle(0xFFFFFF, 0.6);
    for (let x = atlanticStart + 50; x < atlanticEnd - 50; x += 150) {
      const foamX = x + Math.sin(this.waveOffset * 0.5 + x * 0.01) * 20;
      const foamY = oceanHeight + Math.sin(foamX * 0.015 + this.waveOffset) * 10;

      // Draw small foam patches
      this.oceanGraphics.fillCircle(foamX, foamY, 8);
      this.oceanGraphics.fillCircle(foamX + 15, foamY + 3, 5);
      this.oceanGraphics.fillCircle(foamX - 10, foamY + 5, 6);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.oceanGraphics.destroy();
    for (const body of this.bodies) {
      this.scene.matter.world.remove(body);
    }
  }
}
