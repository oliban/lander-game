import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, WORLD_START_X, COUNTRIES } from '../constants';
import { PerformanceSettings } from '../systems/PerformanceSettings';

interface ScorchMarkData {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'thrust' | 'crater';
  seed: number;
  distance?: number;
}

interface SinkingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rotation: number;
  rotSpeed: number;
  shape: number;
}

interface ThrustInfo {
  isThrusting: boolean;
  position: { x: number; y: number };
  direction: { x: number; y: number };
  shuttleX: number;
}

interface CollisionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScorchCallbacks {
  getShuttleThrustInfo: () => ThrustInfo;
  getTerrainHeightAt: (x: number) => number;
  getDecorationBounds: () => CollisionBounds[];
  getLandingPadBounds: () => { x: number; y: number; width: number; height: number }[];
  getCameraScrollX: () => number;
}

export class ScorchMarkManager {
  private scene: Phaser.Scene;
  private callbacks: ScorchCallbacks;

  // Scorch marks
  private scorchTexture: Phaser.GameObjects.RenderTexture | null = null;
  private scorchGraphics: Phaser.GameObjects.Graphics | null = null;
  private scorchTextureOffsetX: number = 0;
  private lastScorchTime: number = 0;
  private scorchMarkData: ScorchMarkData[] = [];
  private static readonly MAX_SCORCH_MARKS = 150;

  // Water pollution
  private sinkingScorchParticles: SinkingParticle[] = [];
  private waterPollution: Phaser.GameObjects.Graphics | null = null;
  private waterPollutionLevel: number = 0;
  private totalWaterPollutionParticles: number = 0;

  // Water bounds (cached)
  private atlanticStart: number;
  private atlanticEnd: number;

  constructor(scene: Phaser.Scene, callbacks: ScorchCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;

    // Cache water bounds
    this.atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    this.atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 5000;
  }

  initialize(): void {
    // Create scorch marks using RenderTexture for performance
    this.scorchTextureOffsetX = WORLD_START_X;
    this.scorchTexture = this.scene.add.renderTexture(WORLD_START_X, 0, 4096, GAME_HEIGHT);
    this.scorchTexture.setOrigin(0, 0);
    this.scorchTexture.setDepth(2);

    this.scorchGraphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Initialize arrays
    this.scorchMarkData = [];
    this.sinkingScorchParticles = [];
    this.waterPollutionLevel = 0;
    this.totalWaterPollutionParticles = 0;
  }

  update(time: number): void {
    this.updateScorchMarks(time);
    this.cullOffScreenScorchMarks();
    this.updateScorchTexturePosition();
    this.updateWaterPollution();
  }

  private updateScorchMarks(time: number): void {
    if (!this.scorchTexture) return;

    // Check performance settings - skip if scorch marks disabled
    const preset = PerformanceSettings.getPreset();
    if (!preset.scorchMarks) return;

    const thrustInfo = this.callbacks.getShuttleThrustInfo();
    if (!thrustInfo.isThrusting) return;

    // Use performance setting for raycast interval (default 50ms, longer at lower quality)
    const raycastInterval = preset.scorchRaycastInterval;
    if (time - this.lastScorchTime < raycastInterval) return;
    this.lastScorchTime = time;

    const thrustPos = thrustInfo.position;
    const thrustDir = thrustInfo.direction;

    // Raycast from thrust position in thrust direction
    const maxDistance = 150;
    const stepSize = 5;

    for (let dist = 20; dist < maxDistance; dist += stepSize) {
      const checkX = thrustPos.x + thrustDir.x * dist;
      const checkY = thrustPos.y + thrustDir.y * dist;

      // Check terrain collision
      const terrainY = this.callbacks.getTerrainHeightAt(checkX);
      if (checkY >= terrainY - 5) {
        // Check if over water
        const isOverWater = checkX >= this.atlanticStart && checkX < this.atlanticEnd;

        if (!isOverWater) {
          this.createScorchMark(checkX, terrainY, dist);
        } else {
          this.createWaterScorchParticle(checkX, terrainY, dist);
        }
        break;
      }

      // Check building collisions
      const decorationBounds = this.callbacks.getDecorationBounds();
      for (const bounds of decorationBounds) {
        if (
          checkX >= bounds.x &&
          checkX <= bounds.x + bounds.width &&
          checkY >= bounds.y &&
          checkY <= bounds.y + bounds.height
        ) {
          this.createScorchMark(checkX, checkY, dist);
          return;
        }
      }

      // Check landing pad surfaces
      const landingPadBounds = this.callbacks.getLandingPadBounds();
      for (const pad of landingPadBounds) {
        const padLeft = pad.x - pad.width / 2;
        const padRight = pad.x + pad.width / 2;
        const padTop = pad.y - 5;
        if (checkX >= padLeft && checkX <= padRight && checkY >= padTop && checkY <= pad.y + 10) {
          this.createScorchMark(checkX, padTop, dist);
          return;
        }
      }
    }
  }

  // Simple seeded random number generator for reproducible scorch marks
  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  private createScorchMark(x: number, y: number, distance: number, existingSeed?: number): void {
    if (!this.scorchTexture || !this.scorchGraphics) return;

    const thrustInfo = this.callbacks.getShuttleThrustInfo();

    // Use performance settings for max scorch marks (fallback to default if 0)
    const preset = PerformanceSettings.getPreset();
    const maxScorchMarks = preset.maxScorchMarks > 0 ? preset.maxScorchMarks : ScorchMarkManager.MAX_SCORCH_MARKS;

    // Only enforce hard limit as emergency fallback
    if (existingSeed === undefined && this.scorchMarkData.length >= maxScorchMarks) {
      const playerX = thrustInfo.shuttleX;
      this.scorchMarkData.sort((a, b) => {
        const distA = Math.abs(a.x - playerX);
        const distB = Math.abs(b.x - playerX);
        return distB - distA; // Furthest first
      });
      // Remove the 20% furthest from player
      const removeCount = Math.max(1, Math.floor(maxScorchMarks * 0.2));
      this.scorchMarkData.splice(0, removeCount);
      this.redrawAllScorchMarks();
    }

    const seed = existingSeed ?? Date.now() + Math.random() * 10000;
    const rand = this.seededRandom(seed);

    // Scorch intensity based on distance (closer = more intense)
    const intensity = Math.max(0.3, 1 - distance / 150);

    // Random variation for organic look
    const offsetX = (rand() - 0.5) * 10;
    const offsetY = (rand() - 0.5) * 3;

    // Draw scorch marks - charred black/brown ellipses
    const baseAlpha = intensity * 0.7;
    const width = 10 + rand() * 15;
    const height = 4 + rand() * 6;

    // Store scorch mark data for potential redraw (only if new and not duplicate location)
    if (existingSeed === undefined) {
      const isDuplicate = this.scorchMarkData.some(mark => mark.x === x && mark.y === y);
      if (!isDuplicate) {
        this.scorchMarkData.push({
          x, y, width: width * 1.5, height: height * 1.5,
          type: 'thrust', seed, distance
        });
      }
    }

    // Draw to temp graphics at local coordinates (centered at 0,0)
    const g = this.scorchGraphics;
    g.clear();

    // Outer glow/heat discoloration (reddish-brown)
    g.fillStyle(0x4a2810, baseAlpha * 0.3);
    g.fillEllipse(offsetX, offsetY - 1, width * 1.4, height * 1.3);

    // Main char mark
    g.fillStyle(0x1a1a1a, baseAlpha);
    g.fillEllipse(offsetX, offsetY, width, height);

    // Darker center with slight gradient effect
    g.fillStyle(0x050505, baseAlpha * 0.9);
    g.fillEllipse(offsetX, offsetY, width * 0.5, height * 0.5);

    // Ashy grey edges
    g.fillStyle(0x3a3a3a, baseAlpha * 0.4);
    const numAshSpots = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < numAshSpots; i++) {
      const angle = (i / numAshSpots) * Math.PI * 2 + rand() * 0.5;
      const dist = width * 0.4 + rand() * width * 0.3;
      const spotX = offsetX + Math.cos(angle) * dist;
      const spotY = offsetY + Math.sin(angle) * dist * 0.4;
      const spotSize = 2 + rand() * 4;
      g.fillCircle(spotX, spotY, spotSize);
    }

    // Brown singe marks radiating outward
    g.fillStyle(0x3d2817, baseAlpha * 0.5);
    const numSpots = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < numSpots; i++) {
      const spotX = offsetX + (rand() - 0.5) * width * 1.5;
      const spotY = offsetY + (rand() - 0.5) * height * 0.8;
      const spotSize = 2 + rand() * 3;
      g.fillCircle(spotX, spotY, spotSize);
    }

    // Stamp the graphics onto the RenderTexture at local texture position
    const localX = x - this.scorchTextureOffsetX;
    // Only draw if within texture bounds
    if (localX >= -50 && localX < 4096 + 50) {
      this.scorchTexture.draw(g, localX, y);
    }
  }

  createBombCrater(x: number, y: number, existingSeed?: number): void {
    if (!this.scorchTexture || !this.scorchGraphics) return;

    const seed = existingSeed ?? Date.now() + Math.random() * 10000;
    const rand = this.seededRandom(seed);

    // Large bomb crater scorch mark
    const craterRadius = 35 + rand() * 15;

    // Store crater data for potential redraw (only if new)
    if (existingSeed === undefined) {
      this.scorchMarkData.push({
        x, y, width: craterRadius * 4, height: craterRadius * 2,
        type: 'crater', seed
      });
    }

    // Draw to temp graphics at local coordinates (centered at 0,0)
    const g = this.scorchGraphics;
    g.clear();

    // Outer heat discoloration ring (dark reddish-brown)
    g.fillStyle(0x3d1a0a, 0.5);
    g.fillEllipse(0, -2, craterRadius * 2.2, craterRadius * 0.9);

    // Scorched earth ring (dark brown)
    g.fillStyle(0x2a1a0a, 0.6);
    g.fillEllipse(0, -1, craterRadius * 1.8, craterRadius * 0.75);

    // Main blast mark (very dark)
    g.fillStyle(0x0f0f0f, 0.8);
    g.fillEllipse(0, 0, craterRadius * 1.4, craterRadius * 0.6);

    // Charred center (black)
    g.fillStyle(0x050505, 0.9);
    g.fillEllipse(0, 0, craterRadius * 0.8, craterRadius * 0.35);

    // Impact point (darkest)
    g.fillStyle(0x020202, 0.95);
    g.fillEllipse(0, 0, craterRadius * 0.3, craterRadius * 0.15);

    // Radiating scorch lines (blast pattern)
    g.lineStyle(2, 0x1a1a1a, 0.6);
    const numRays = 8 + Math.floor(rand() * 6);
    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * Math.PI * 2 + (rand() - 0.5) * 0.3;
      const rayLength = craterRadius * (0.8 + rand() * 0.8);
      const startDist = craterRadius * 0.3;
      g.lineBetween(
        Math.cos(angle) * startDist,
        Math.sin(angle) * startDist * 0.4,
        Math.cos(angle) * rayLength,
        Math.sin(angle) * rayLength * 0.4
      );
    }

    // Scattered debris/ash spots around crater
    const numDebris = 15 + Math.floor(rand() * 10);
    for (let i = 0; i < numDebris; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = craterRadius * (0.6 + rand() * 1.2);
      const spotX = Math.cos(angle) * dist;
      const spotY = Math.sin(angle) * dist * 0.4;
      const spotSize = 2 + rand() * 5;

      // Vary colors between black, dark grey, and brown
      const colorChoice = rand();
      if (colorChoice < 0.4) {
        g.fillStyle(0x1a1a1a, 0.7);
      } else if (colorChoice < 0.7) {
        g.fillStyle(0x3a3a3a, 0.5);
      } else {
        g.fillStyle(0x3d2817, 0.6);
      }
      g.fillCircle(spotX, spotY, spotSize);
    }

    // Ash ring around outer edge
    g.fillStyle(0x4a4a4a, 0.3);
    const numAshPiles = 12 + Math.floor(rand() * 8);
    for (let i = 0; i < numAshPiles; i++) {
      const angle = (i / numAshPiles) * Math.PI * 2 + (rand() - 0.5) * 0.4;
      const dist = craterRadius * (1.5 + rand() * 0.5);
      const spotX = Math.cos(angle) * dist;
      const spotY = Math.sin(angle) * dist * 0.4;
      g.fillEllipse(spotX, spotY, 4 + rand() * 6, 2 + rand() * 3);
    }

    // Stamp the graphics onto the RenderTexture at local texture position
    const localX = x - this.scorchTextureOffsetX;
    // Only draw if within texture bounds (with margin for large craters)
    if (localX >= -100 && localX < 4096 + 100) {
      this.scorchTexture.draw(g, localX, y);
    }
  }

  clearScorchMarksInArea(bounds: CollisionBounds): void {
    // Filter out scorch marks that overlap with the destroyed building
    const originalCount = this.scorchMarkData.length;
    this.scorchMarkData = this.scorchMarkData.filter(mark => {
      const markRight = mark.x + mark.width / 2;
      const markLeft = mark.x - mark.width / 2;
      const markBottom = mark.y + mark.height / 2;
      const markTop = mark.y - mark.height / 2;

      const boundsRight = bounds.x + bounds.width;
      const boundsBottom = bounds.y + bounds.height;

      // Keep if no overlap
      return markRight < bounds.x || markLeft > boundsRight ||
             markBottom < bounds.y || markTop > boundsBottom;
    });

    if (this.scorchMarkData.length < originalCount) {
      this.redrawAllScorchMarks();
    }
  }

  private redrawAllScorchMarks(): void {
    if (!this.scorchTexture) return;

    // Clear the texture
    this.scorchTexture.clear();

    // Redraw all remaining scorch marks
    for (const mark of this.scorchMarkData) {
      if (mark.type === 'thrust') {
        this.createScorchMark(mark.x, mark.y, mark.distance ?? 50, mark.seed);
      } else {
        this.createBombCrater(mark.x, mark.y, mark.seed);
      }
    }
  }

  private cullOffScreenScorchMarks(): void {
    const thrustInfo = this.callbacks.getShuttleThrustInfo();
    const cullThreshold = thrustInfo.shuttleX - (GAME_WIDTH * 2);

    const originalLength = this.scorchMarkData.length;
    this.scorchMarkData = this.scorchMarkData.filter(mark => mark.x > cullThreshold);

    if (this.scorchMarkData.length < originalLength) {
      this.redrawAllScorchMarks();
    }
  }

  private updateScorchTexturePosition(): void {
    if (!this.scorchTexture) return;

    const cameraX = this.callbacks.getCameraScrollX();
    const textureWidth = 4096;
    const shiftThreshold = 1024;

    // Shift right
    if (cameraX + GAME_WIDTH > this.scorchTextureOffsetX + textureWidth - shiftThreshold) {
      const newOffset = cameraX - shiftThreshold;
      this.scorchTextureOffsetX = newOffset;
      this.scorchTexture.setPosition(newOffset, 0);
      this.redrawAllScorchMarks();
    }
    // Shift left
    else if (cameraX < this.scorchTextureOffsetX + shiftThreshold) {
      const newOffset = Math.max(WORLD_START_X, cameraX - textureWidth + GAME_WIDTH + shiftThreshold);
      if (newOffset !== this.scorchTextureOffsetX) {
        this.scorchTextureOffsetX = newOffset;
        this.scorchTexture.setPosition(newOffset, 0);
        this.redrawAllScorchMarks();
      }
    }
  }

  private createWaterScorchParticle(x: number, waterY: number, distance: number): void {
    const intensity = Math.max(0.2, 1 - distance / 150);
    const numParticles = Math.floor(2 + intensity * 3);

    for (let i = 0; i < numParticles; i++) {
      this.sinkingScorchParticles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: waterY + Math.random() * 3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0.2 + Math.random() * 0.4,
        size: 2 + Math.random() * 4 * intensity,
        alpha: 0.5 + Math.random() * 0.3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05,
        shape: Math.floor(Math.random() * 3),
      });
      this.totalWaterPollutionParticles++;
    }

    // Increase water pollution level
    this.waterPollutionLevel = Math.min(1, this.waterPollutionLevel + 0.0025 * intensity);
  }

  private updateWaterPollution(): void {
    // Lazy create graphics object
    if (!this.waterPollution) {
      this.waterPollution = this.scene.add.graphics();
      this.waterPollution.setDepth(100);
    }
    this.waterPollution.clear();

    // Get water level
    const waterY = this.callbacks.getTerrainHeightAt(this.atlanticStart + 100);

    // Draw pollution tint over water
    if (this.waterPollutionLevel > 0.01) {
      const pollutionAlpha = this.waterPollutionLevel * 0.95;
      this.waterPollution.fillStyle(0x0a0805, pollutionAlpha);
      this.waterPollution.fillRect(this.atlanticStart, waterY, this.atlanticEnd - this.atlanticStart, 200);
    }

    // Update and draw sinking particles
    for (let i = this.sinkingScorchParticles.length - 1; i >= 0; i--) {
      const particle = this.sinkingScorchParticles[i];

      // Move particle
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotSpeed;

      // Fade out
      particle.alpha -= 0.004;

      // Slow down (water resistance)
      particle.vy *= 0.992;
      particle.vx *= 0.98;

      // Remove if faded or sunk too deep
      if (particle.alpha <= 0 || particle.y > waterY + 120) {
        this.sinkingScorchParticles.splice(i, 1);
        continue;
      }

      // Draw particle based on shape type
      const cos = Math.cos(particle.rotation);
      const sin = Math.sin(particle.rotation);
      const s = particle.size * 1.5;

      if (particle.shape === 0) {
        // Ash flake
        this.waterPollution.fillStyle(0x2a2520, particle.alpha);
        this.waterPollution.beginPath();
        this.waterPollution.moveTo(particle.x + cos * s, particle.y + sin * s * 0.7);
        this.waterPollution.lineTo(particle.x - sin * s * 0.8, particle.y + cos * s * 0.8);
        this.waterPollution.lineTo(particle.x - cos * s * 0.9, particle.y - sin * s * 0.6);
        this.waterPollution.lineTo(particle.x + sin * s * 0.6, particle.y - cos * s * 0.7);
        this.waterPollution.closePath();
        this.waterPollution.fillPath();
      } else if (particle.shape === 1) {
        // Elongated char
        this.waterPollution.fillStyle(0x1a1815, particle.alpha);
        this.waterPollution.save();
        this.waterPollution.translateCanvas(particle.x, particle.y);
        this.waterPollution.rotateCanvas(particle.rotation);
        this.waterPollution.fillRect(-s * 0.8, -s * 0.25, s * 1.6, s * 0.5);
        this.waterPollution.restore();
      } else {
        // Irregular chunk
        this.waterPollution.fillStyle(0x252015, particle.alpha);
        this.waterPollution.beginPath();
        this.waterPollution.moveTo(particle.x + s * 0.5, particle.y - s * 0.3);
        this.waterPollution.lineTo(particle.x + s * 0.7, particle.y + s * 0.2);
        this.waterPollution.lineTo(particle.x + s * 0.2, particle.y + s * 0.5);
        this.waterPollution.lineTo(particle.x - s * 0.4, particle.y + s * 0.3);
        this.waterPollution.lineTo(particle.x - s * 0.6, particle.y - s * 0.2);
        this.waterPollution.lineTo(particle.x - s * 0.1, particle.y - s * 0.4);
        this.waterPollution.closePath();
        this.waterPollution.fillPath();
      }
    }
  }

  // Public getters
  getWaterPollutionLevel(): number {
    return this.waterPollutionLevel;
  }

  getTotalWaterPollutionParticles(): number {
    return this.totalWaterPollutionParticles;
  }

  getSinkingParticleCount(): number {
    return this.sinkingScorchParticles.length;
  }

  getScorchMarkCount(): number {
    return this.scorchMarkData.length;
  }

  // Cleanup
  destroy(): void {
    if (this.scorchTexture) {
      this.scorchTexture.destroy();
      this.scorchTexture = null;
    }
    if (this.scorchGraphics) {
      this.scorchGraphics.destroy();
      this.scorchGraphics = null;
    }
    if (this.waterPollution) {
      this.waterPollution.destroy();
      this.waterPollution = null;
    }
    this.scorchMarkData = [];
    this.sinkingScorchParticles = [];
  }
}
