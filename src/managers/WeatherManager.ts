import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COUNTRIES } from '../constants';
import { Terrain } from '../objects/Terrain';
import { Shuttle } from '../objects/Shuttle';

export type WeatherState = 'clear' | 'cloudy' | 'stormy' | 'unstable';
export type RainIntensity = 'none' | 'light' | 'medium' | 'heavy';

interface CloudData {
  x: number;
  y: number;
  scale: number;
  type: 'cumulus' | 'stratus' | 'alto' | 'storm';
  isStormCloud: boolean;
  lastLightningTime: number;
}

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
}

interface RainSplash {
  x: number;
  y: number;
  particles: { dx: number; dy: number; vy: number }[];
  age: number;
}

interface WindDebris {
  x: number;
  y: number;
  type: 'leaf' | 'dust';
  rotation: number;
  rotationSpeed: number;
}

interface PendingLightningStrike {
  cloud: CloudData;
  shuttle: Shuttle;
  warningStart: number;
  strikeDelay: number;
}

export interface WeatherCallbacks {
  onLightningStrike: (shuttle: Shuttle) => void;
  getTerrainHeightAt: (x: number) => number;
}

export class WeatherManager {
  private scene: Phaser.Scene;
  private callbacks: WeatherCallbacks;

  // Weather state
  private weatherState: WeatherState = 'clear';
  private rainIntensity: RainIntensity = 'none';

  // Clouds
  private cloudData: CloudData[] = [];
  private cloudGraphics: Phaser.GameObjects.Graphics | null = null;
  private lightningGraphics: Phaser.GameObjects.Graphics | null = null;

  // Rain
  private rainGraphics: Phaser.GameObjects.Graphics | null = null;
  private rainDrops: RainDrop[] = [];
  private rainSplashes: RainSplash[] = [];
  private rainEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  // Lightning
  private lastLightningCheck: number = 0;
  private pendingLightningStrike: PendingLightningStrike | null = null;

  // Unstable weather
  private lastWeatherChange: number = 0;
  private nextWeatherChangeDelay: number = 0;

  // Wind
  private windStrength: number = 0;
  private windTargetStrength: number = 0;
  private lastWindChange: number = 0;
  private nextWindChangeDelay: number = 0;
  private windDebris: WindDebris[] = [];
  private windDebrisGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, callbacks: WeatherCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  initialize(): void {
    // Reset graphics references
    this.rainEmitter = null;
    this.rainGraphics = null;
    this.windDebrisGraphics = null;

    // Initialize weather state (50% unstable, 25% clear, 15% cloudy, 10% stormy)
    const weatherRoll = Math.random();
    if (weatherRoll < 0.50) {
      this.weatherState = 'unstable';
    } else if (weatherRoll < 0.60) {
      this.weatherState = 'stormy';
    } else if (weatherRoll < 0.75) {
      this.weatherState = 'cloudy';
    } else {
      this.weatherState = 'clear';
    }

    // Initialize unstable weather timing
    if (this.weatherState === 'unstable') {
      this.lastWeatherChange = 0;
      this.nextWeatherChangeDelay = 15000 + Math.random() * 5000;
      const intensityOptions: RainIntensity[] = ['none', 'light', 'medium', 'heavy'];
      const startIntensity = Math.floor(Math.random() * intensityOptions.length);
      this.rainIntensity = intensityOptions[startIntensity];
      const displayIntensity = this.rainIntensity === 'none' ? 'clear' : this.rainIntensity;
      console.log(`[Weather] UNSTABLE - weather will change periodically! Starting at: ${displayIntensity}`);
    } else {
      console.log(`[Weather] ${this.weatherState.toUpperCase()}${this.weatherState === 'stormy' ? ' - watch out for lightning!' : ''}`);
    }

    // Initialize wind system
    this.windStrength = (Math.random() - 0.5) * 1.6;
    this.windTargetStrength = this.windStrength;
    this.lastWindChange = 0;
    this.nextWindChangeDelay = 20000 + Math.random() * 10000;
    const initWindStrength = Math.abs(this.windStrength);
    const initStrengthLabel = initWindStrength < 0.1 ? 'Calm' : initWindStrength < 0.4 ? 'Light' : initWindStrength < 0.7 ? 'Moderate' : 'Strong';
    const initWindDir = this.windStrength > 0.1 ? 'East' : this.windStrength < -0.1 ? 'West' : '';
    console.log(`[Weather] Wind: ${initStrengthLabel} ${initWindDir}`.trim());

    // Initialize wind debris
    this.windDebris = [];
    for (let i = 0; i < 30; i++) {
      this.windDebris.push({
        x: Math.random() * GAME_WIDTH * 5,
        y: Math.random() * GAME_HEIGHT,
        type: Math.random() < 0.7 ? 'leaf' : 'dust',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
    }

    this.createClouds();
    this.initializeRain();
  }

  private createClouds(): void {
    // Determine cloud count based on weather
    const cloudCounts = { clear: 15, cloudy: 25, stormy: 35, unstable: 30 };
    const cloudCount = cloudCounts[this.weatherState];

    // Determine storm cloud chance based on weather
    const stormCloudChance = { clear: 0, cloudy: 0.15, stormy: 0.4, unstable: 0.25 };
    const stormChance = stormCloudChance[this.weatherState];

    // Generate varied cloud data
    this.cloudData = [];
    for (let i = 0; i < cloudCount; i++) {
      const typeRoll = Math.random();
      let type: 'cumulus' | 'stratus' | 'alto' | 'storm';
      let y: number;
      let scale: number;

      if (Math.random() < stormChance) {
        type = 'storm';
        y = 80 + Math.random() * 120;
        scale = 1.0 + Math.random() * 1.0;
      } else if (typeRoll < 0.15) {
        type = 'alto';
        y = 30 + Math.random() * 50;
        scale = 0.3 + Math.random() * 0.3;
      } else if (typeRoll < 0.35) {
        type = 'stratus';
        y = 60 + Math.random() * 150;
        scale = 0.5 + Math.random() * 0.6;
      } else {
        type = 'cumulus';
        y = 50 + Math.random() * 200;
        scale = 0.5 + Math.random() * 0.8;
      }

      this.cloudData.push({
        x: Math.random() * GAME_WIDTH * 5,
        y,
        scale,
        type,
        isStormCloud: type === 'storm',
        lastLightningTime: 0
      });
    }

    // Draw clouds with parallax
    this.cloudGraphics = this.scene.add.graphics();
    this.cloudGraphics.setScrollFactor(0.02);
    this.cloudGraphics.setDepth(-90);

    for (const cloud of this.cloudData) {
      this.drawCloud(this.cloudGraphics, cloud);
    }

    // Add gentle cloud drift animation
    this.scene.tweens.add({
      targets: this.cloudGraphics,
      x: 30,
      duration: 15000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Create lightning graphics layer
    this.lightningGraphics = this.scene.add.graphics();
    this.lightningGraphics.setScrollFactor(0.02);
    this.lightningGraphics.setDepth(-85);

    // Create rain graphics layer
    this.rainGraphics = this.scene.add.graphics();
    this.rainGraphics.setScrollFactor(0);
    this.rainGraphics.setDepth(-80);
  }

  private drawCloud(graphics: Phaser.GameObjects.Graphics, cloud: CloudData): void {
    const { x, y, scale: s, type } = cloud;

    switch (type) {
      case 'cumulus':
        graphics.fillStyle(0xE8E8E8, 0.3);
        graphics.fillCircle(x - 25 * s, y + 8 * s, 30 * s);
        graphics.fillCircle(x + 15 * s, y + 10 * s, 35 * s);
        graphics.fillCircle(x + 55 * s, y + 8 * s, 28 * s);
        graphics.fillStyle(0xDDDDDD, 0.6);
        graphics.fillCircle(x - 20 * s, y + 5 * s, 26 * s);
        graphics.fillCircle(x + 8 * s, y + 8 * s, 30 * s);
        graphics.fillCircle(x + 38 * s, y + 6 * s, 28 * s);
        graphics.fillCircle(x + 60 * s, y + 5 * s, 22 * s);
        graphics.fillStyle(0xFFFFFF, 0.92);
        graphics.fillCircle(x - 25 * s, y - 2 * s, 28 * s);
        graphics.fillCircle(x - 5 * s, y - 8 * s, 32 * s);
        graphics.fillCircle(x + 25 * s, y - 12 * s, 30 * s);
        graphics.fillCircle(x + 55 * s, y - 5 * s, 26 * s);
        graphics.fillCircle(x + 10 * s, y + 3 * s, 24 * s);
        graphics.fillCircle(x + 40 * s, y + 2 * s, 22 * s);
        graphics.fillCircle(x - 12 * s, y + 6 * s, 20 * s);
        graphics.fillStyle(0xFFFFFF, 0.97);
        graphics.fillCircle(x - 10 * s, y - 18 * s, 20 * s);
        graphics.fillCircle(x + 12 * s, y - 22 * s, 22 * s);
        graphics.fillCircle(x + 35 * s, y - 18 * s, 18 * s);
        graphics.fillCircle(x + 5 * s, y - 12 * s, 16 * s);
        graphics.fillCircle(x + 48 * s, y - 10 * s, 14 * s);
        graphics.fillStyle(0xFFFFFF, 0.6);
        graphics.fillCircle(x - 5 * s, y - 25 * s, 12 * s);
        graphics.fillCircle(x + 18 * s, y - 28 * s, 10 * s);
        graphics.fillCircle(x + 40 * s, y - 22 * s, 11 * s);
        break;

      case 'stratus':
        graphics.fillStyle(0xCCCCCC, 0.4);
        graphics.fillEllipse(x, y + 3 * s, 70 * s, 15 * s);
        graphics.fillEllipse(x + 50 * s, y + 5 * s, 50 * s, 12 * s);
        graphics.fillStyle(0xFFFFFF, 0.7);
        graphics.fillEllipse(x, y, 70 * s, 15 * s);
        graphics.fillEllipse(x + 50 * s, y + 2 * s, 50 * s, 12 * s);
        graphics.fillEllipse(x - 30 * s, y + 3 * s, 40 * s, 10 * s);
        graphics.fillStyle(0xFFFFFF, 0.3);
        graphics.fillEllipse(x - 10 * s, y - 3 * s, 40 * s, 8 * s);
        break;

      case 'alto':
        graphics.fillStyle(0xDDDDDD, 0.4);
        graphics.fillCircle(x, y + 2 * s, 15 * s);
        graphics.fillCircle(x + 15 * s, y + 2 * s, 12 * s);
        graphics.fillStyle(0xFFFFFF, 0.6);
        graphics.fillCircle(x, y, 15 * s);
        graphics.fillCircle(x + 15 * s, y, 12 * s);
        graphics.fillCircle(x + 8 * s, y - 5 * s, 10 * s);
        break;

      case 'storm':
        graphics.fillStyle(0x333333, 0.6);
        graphics.fillCircle(x, y + 12 * s, 40 * s);
        graphics.fillCircle(x - 38 * s, y + 10 * s, 32 * s);
        graphics.fillCircle(x + 42 * s, y + 10 * s, 35 * s);
        graphics.fillStyle(0x555555, 0.9);
        graphics.fillCircle(x, y - 5 * s, 40 * s);
        graphics.fillCircle(x - 38 * s, y - 8 * s, 32 * s);
        graphics.fillCircle(x + 42 * s, y - 6 * s, 35 * s);
        graphics.fillCircle(x + 12 * s, y - 22 * s, 30 * s);
        graphics.fillCircle(x - 22 * s, y - 15 * s, 27 * s);
        graphics.fillStyle(0x444444, 0.95);
        graphics.fillCircle(x - 30 * s, y + 18 * s, 25 * s);
        graphics.fillCircle(x, y + 20 * s, 28 * s);
        graphics.fillCircle(x + 32 * s, y + 18 * s, 26 * s);
        graphics.fillStyle(0x3A3A3A, 0.9);
        graphics.fillCircle(x - 15 * s, y + 25 * s, 20 * s);
        graphics.fillCircle(x + 18 * s, y + 24 * s, 22 * s);
        if (this.weatherState === 'stormy') {
          graphics.fillStyle(0xFFFFAA, 0.1 + Math.random() * 0.08);
          graphics.fillCircle(x + 5 * s, y + 8 * s, 20 * s);
        }
        break;
    }
  }

  private initializeRain(): void {
    if (this.weatherState === 'stormy') {
      this.rainIntensity = Math.random() < 0.5 ? 'medium' : 'heavy';
    } else if (this.weatherState === 'cloudy') {
      this.rainIntensity = Math.random() < 0.3 ? 'light' : 'none';
    } else if (this.weatherState === 'unstable') {
      // Already set during initialization
    } else {
      this.rainIntensity = 'none';
    }

    if (this.rainIntensity === 'none') {
      this.rainDrops = [];
      return;
    }

    const params = {
      light: { count: 150, speedMin: 7, speedRange: 5, lengthMin: 10, lengthRange: 12, alpha: 0.45 },
      medium: { count: 300, speedMin: 10, speedRange: 8, lengthMin: 15, lengthRange: 20, alpha: 0.6 },
      heavy: { count: 500, speedMin: 14, speedRange: 10, lengthMin: 20, lengthRange: 30, alpha: 0.75 }
    }[this.rainIntensity];

    this.rainDrops = [];
    for (let i = 0; i < params.count; i++) {
      this.rainDrops.push({
        x: Math.random() * (GAME_WIDTH + 200) - 100,
        y: Math.random() * GAME_HEIGHT,
        speed: params.speedMin + Math.random() * params.speedRange,
        length: params.lengthMin + Math.random() * params.lengthRange
      });
    }

    console.log(`[Weather] Rain intensity: ${this.rainIntensity}`);
  }

  update(time: number, shuttles: Shuttle[]): void {
    this.checkLightningStrikes(time, shuttles);
    this.updateUnstableWeather(time);
    this.updateWind(time);
    this.updateWindDebris();
    this.updateRain();
  }

  private updateUnstableWeather(time: number): void {
    if (this.weatherState !== 'unstable') return;

    if (time - this.lastWeatherChange >= this.nextWeatherChangeDelay) {
      this.lastWeatherChange = time;
      this.nextWeatherChangeDelay = 15000 + Math.random() * 5000;

      const intensityLevels: RainIntensity[] = ['none', 'light', 'medium', 'heavy'];
      const currentIndex = intensityLevels.indexOf(this.rainIntensity);

      const changeRoll = Math.random();
      let newIndex = currentIndex;

      if (changeRoll < 0.4) {
        newIndex = Math.min(currentIndex + 1, intensityLevels.length - 1);
      } else if (changeRoll < 0.8) {
        newIndex = Math.max(currentIndex - 1, 0);
      }

      const newIntensity = intensityLevels[newIndex];

      if (newIntensity !== this.rainIntensity) {
        const oldIntensity = this.rainIntensity;
        this.rainIntensity = newIntensity;
        const displayOld = oldIntensity === 'none' ? 'clear' : oldIntensity;
        const displayNew = newIntensity === 'none' ? 'clear' : newIntensity;
        console.log(`[Weather] Unstable weather shift: ${displayOld} -> ${displayNew}`);
        this.adjustRainDropCount();
      }
    }
  }

  private adjustRainDropCount(): void {
    const params = {
      none: { count: 0, speedMin: 0, speedRange: 0, lengthMin: 0, lengthRange: 0 },
      light: { count: 150, speedMin: 7, speedRange: 5, lengthMin: 10, lengthRange: 12 },
      medium: { count: 300, speedMin: 10, speedRange: 8, lengthMin: 15, lengthRange: 20 },
      heavy: { count: 500, speedMin: 14, speedRange: 10, lengthMin: 20, lengthRange: 30 }
    }[this.rainIntensity];

    const targetCount = params.count;
    const currentCount = this.rainDrops.length;

    if (targetCount === 0) {
      this.rainDrops = [];
      this.rainSplashes = [];
      if (this.rainGraphics) {
        this.rainGraphics.destroy();
        this.rainGraphics = null;
      }
      if (this.rainEmitter) {
        this.rainEmitter.stop();
      }
    } else if (targetCount > currentCount) {
      for (let i = currentCount; i < targetCount; i++) {
        this.rainDrops.push({
          x: Math.random() * (GAME_WIDTH + 200) - 100,
          y: Math.random() * GAME_HEIGHT,
          speed: params.speedMin + Math.random() * params.speedRange,
          length: params.lengthMin + Math.random() * params.lengthRange
        });
      }
    } else if (targetCount < currentCount) {
      this.rainDrops.splice(targetCount);
    }

    for (const drop of this.rainDrops) {
      drop.speed = params.speedMin + Math.random() * params.speedRange;
      drop.length = params.lengthMin + Math.random() * params.lengthRange;
    }
  }

  private updateWind(time: number): void {
    if (time - this.lastWindChange >= this.nextWindChangeDelay) {
      this.lastWindChange = time;
      this.nextWindChangeDelay = 20000 + Math.random() * 10000;

      this.windTargetStrength = (Math.random() - 0.5) * 2;

      const strength = Math.abs(this.windTargetStrength);
      const strengthLabel = strength < 0.1 ? 'Calm' : strength < 0.4 ? 'Light' : strength < 0.7 ? 'Moderate' : 'Strong';
      const windDir = this.windTargetStrength > 0.1 ? 'East' : this.windTargetStrength < -0.1 ? 'West' : '';
      console.log(`[Weather] Wind shifting to: ${strengthLabel} ${windDir}`.trim());
    }

    this.windStrength += (this.windTargetStrength - this.windStrength) * 0.01;
  }

  private updateWindDebris(): void {
    if (Math.abs(this.windStrength) < 0.1) {
      if (this.windDebrisGraphics) {
        this.windDebrisGraphics.clear();
      }
      return;
    }

    if (!this.windDebrisGraphics) {
      this.windDebrisGraphics = this.scene.add.graphics();
      this.windDebrisGraphics.setScrollFactor(0);
      this.windDebrisGraphics.setDepth(-70);
    }
    this.windDebrisGraphics.clear();

    const cameraX = this.scene.cameras.main.scrollX;
    const speed = Math.abs(this.windStrength) * 8;

    for (const debris of this.windDebris) {
      debris.x += this.windStrength * speed;
      debris.y += Math.sin(debris.rotation) * 0.5;
      debris.rotation += debris.rotationSpeed;

      const screenX = debris.x - cameraX * 0.5;
      if (this.windStrength > 0 && screenX > GAME_WIDTH + 50) {
        debris.x -= GAME_WIDTH + 100;
      } else if (this.windStrength < 0 && screenX < -50) {
        debris.x += GAME_WIDTH + 100;
      }

      if (debris.y > GAME_HEIGHT) debris.y = -10;
      if (debris.y < -10) debris.y = GAME_HEIGHT;

      if (screenX > -50 && screenX < GAME_WIDTH + 50) {
        const alpha = Math.min(Math.abs(this.windStrength), 0.6);

        if (debris.type === 'leaf') {
          this.windDebrisGraphics.fillStyle(0x88AA44, alpha);
          const cos = Math.cos(debris.rotation);
          const sin = Math.sin(debris.rotation);
          const w = 6, h = 3;
          this.windDebrisGraphics.beginPath();
          this.windDebrisGraphics.moveTo(screenX + w * cos, debris.y + w * sin);
          this.windDebrisGraphics.lineTo(screenX - h * sin, debris.y + h * cos);
          this.windDebrisGraphics.lineTo(screenX - w * cos, debris.y - w * sin);
          this.windDebrisGraphics.lineTo(screenX + h * sin, debris.y - h * cos);
          this.windDebrisGraphics.closePath();
          this.windDebrisGraphics.fillPath();
        } else {
          this.windDebrisGraphics.fillStyle(0xAA9977, alpha * 0.7);
          this.windDebrisGraphics.fillCircle(screenX, debris.y, 2);
        }
      }
    }
  }

  private updateRain(): void {
    if (this.rainIntensity === 'none') {
      if (this.rainEmitter) {
        this.rainEmitter.stop();
      }
      return;
    }

    const windSpeedX = this.windStrength * 150;

    if (!this.rainEmitter) {
      this.rainEmitter = this.scene.add.particles(0, 0, 'raindrop', {
        x: { min: -50, max: GAME_WIDTH + 50 },
        y: -20,
        lifespan: 1500,
        speedY: { min: 500, max: 800 },
        speedX: { min: windSpeedX - 30, max: windSpeedX + 30 },
        alpha: { start: 0.6, end: 0.3 },
        scaleY: 1.0,
        scaleX: 1,
        quantity: 6,
        frequency: 16,
        blendMode: Phaser.BlendModes.NORMAL,
      });
      this.rainEmitter.setScrollFactor(0);
      this.rainEmitter.setDepth(-80);
    }

    if (!this.rainEmitter.emitting) {
      this.rainEmitter.start();
    }

    this.spawnRainSplashes();
    this.updateRainSplashes();
  }

  private spawnRainSplashes(): void {
    const cameraX = this.scene.cameras.main.scrollX;
    const atlanticStart = COUNTRIES.find(c => c.name === 'Atlantic Ocean')?.startX ?? 2000;
    const atlanticEnd = COUNTRIES.find(c => c.name === 'United Kingdom')?.startX ?? 5000;

    const cameraRight = cameraX + GAME_WIDTH;
    if (cameraRight < atlanticStart || cameraX > atlanticEnd) return;

    const waterWorldY = this.callbacks.getTerrainHeightAt(atlanticStart + 500);

    if (this.rainIntensity === 'none') return;

    const splashParams = {
      light: { maxSplashes: 25, particleCount: [2, 3], spread: 5, velocityMin: 1.5, velocityRange: 2, spawnRate: 2 },
      medium: { maxSplashes: 40, particleCount: [3, 4], spread: 7, velocityMin: 2, velocityRange: 3, spawnRate: 4 },
      heavy: { maxSplashes: 60, particleCount: [4, 6], spread: 10, velocityMin: 2.5, velocityRange: 4, spawnRate: 8 }
    }[this.rainIntensity];

    const visibleWaterStart = Math.max(atlanticStart, cameraX);
    const visibleWaterEnd = Math.min(atlanticEnd, cameraRight);
    const visibleWaterWidth = visibleWaterEnd - visibleWaterStart;

    if (visibleWaterWidth <= 0) return;

    for (let s = 0; s < splashParams.spawnRate; s++) {
      if (this.rainSplashes.length >= splashParams.maxSplashes) break;

      const splashX = visibleWaterStart + Math.random() * visibleWaterWidth;
      const numParticles = splashParams.particleCount[0] + Math.floor(Math.random() * (splashParams.particleCount[1] - splashParams.particleCount[0] + 1));
      const particles: { dx: number; dy: number; vy: number }[] = [];
      for (let p = 0; p < numParticles; p++) {
        particles.push({
          dx: (Math.random() - 0.5) * splashParams.spread,
          dy: 0,
          vy: -(splashParams.velocityMin + Math.random() * splashParams.velocityRange)
        });
      }
      this.rainSplashes.push({
        x: splashX,
        y: waterWorldY,
        particles,
        age: 0
      });
    }
  }

  private updateRainSplashes(): void {
    if (!this.rainGraphics) {
      this.rainGraphics = this.scene.add.graphics();
      this.rainGraphics.setScrollFactor(0);
      this.rainGraphics.setDepth(-80);
    }

    this.rainGraphics.clear();

    if (this.rainSplashes.length === 0) return;

    const cameraX = this.scene.cameras.main.scrollX;
    const cameraY = this.scene.cameras.main.scrollY;

    const particlesToDraw: { x: number; y: number; alpha: number }[] = [];

    for (let i = this.rainSplashes.length - 1; i >= 0; i--) {
      const splash = this.rainSplashes[i];
      splash.age++;

      if (splash.age > 20) {
        this.rainSplashes.splice(i, 1);
        continue;
      }

      const screenX = splash.x - cameraX;
      const screenY = splash.y - cameraY;

      if (screenX > -50 && screenX < GAME_WIDTH + 50 && screenY > 0 && screenY < GAME_HEIGHT) {
        const alpha = (1 - (splash.age / 20)) * 0.8;

        for (const particle of splash.particles) {
          particle.dy += particle.vy;
          particle.vy += 0.3;

          if (particle.dy <= 2) {
            particlesToDraw.push({
              x: screenX + particle.dx,
              y: screenY + particle.dy,
              alpha
            });
          }
        }
      }
    }

    if (particlesToDraw.length > 0) {
      this.rainGraphics.lineStyle(2, 0xCCDDEE, 0.7);
      this.rainGraphics.beginPath();
      for (const p of particlesToDraw) {
        this.rainGraphics.moveTo(p.x, p.y);
        this.rainGraphics.lineTo(p.x, p.y - 3);
      }
      this.rainGraphics.strokePath();
    }
  }

  private getCloudScreenX(cloud: CloudData): number {
    const cameraX = this.scene.cameras.main.scrollX;
    const driftX = this.cloudGraphics ? this.cloudGraphics.x : 0;
    return cloud.x - cameraX * 0.02 + driftX;
  }

  private getVisibleStormClouds(): CloudData[] {
    const margin = 100;
    return this.cloudData.filter(c => {
      if (!c.isStormCloud) return false;
      const screenX = this.getCloudScreenX(c);
      return screenX > -margin && screenX < GAME_WIDTH + margin;
    });
  }

  private checkLightningStrikes(time: number, shuttles: Shuttle[]): void {
    if (this.weatherState !== 'stormy') return;

    if (time - this.lastLightningCheck < 500) return;
    this.lastLightningCheck = time;

    if (this.pendingLightningStrike) {
      const elapsed = time - this.pendingLightningStrike.warningStart;
      if (elapsed >= this.pendingLightningStrike.strikeDelay) {
        const shuttle = this.pendingLightningStrike.shuttle;
        const cloud = this.pendingLightningStrike.cloud;

        if (shuttle.active) {
          const cameraX = this.scene.cameras.main.scrollX;
          const cameraY = this.scene.cameras.main.scrollY;
          const shuttleScreenX = shuttle.x - cameraX;
          const shuttleScreenY = shuttle.y - cameraY;
          const cloudScreenX = this.getCloudScreenX(cloud);
          const cloudScreenY = cloud.y - cameraY * 0.02;
          const cloudVisualCenterY = cloudScreenY + 5 * cloud.scale;
          const dx = Math.abs(shuttleScreenX - cloudScreenX);
          const dy = shuttleScreenY - cloudVisualCenterY;
          const collisionRadius = cloud.scale * 35;
          const maxStrikeRange = collisionRadius + 200;

          const terrainY = this.callbacks.getTerrainHeightAt(shuttle.x);
          const distanceFromGround = terrainY - shuttle.y;
          const isGrounded = distanceFromGround < 50;

          // Strike zone is wider (250px horizontal) - need to get to ground to escape
          const stillInRange = dx < 250 && dy > 0 && dy < maxStrikeRange;

          if (!isGrounded && stillInRange) {
            this.triggerLightningStrike(cloud, shuttle);
          } else {
            this.triggerAmbientLightning(cloud);
            console.log('[Lightning] Shuttle escaped! Strike missed.', { dx, dy, isGrounded, stillInRange });
          }
        }
        this.pendingLightningStrike = null;
      }
      return;
    }

    const visibleStormClouds = this.getVisibleStormClouds();
    if (visibleStormClouds.length === 0) return;

    const cameraX = this.scene.cameras.main.scrollX;
    const cameraY = this.scene.cameras.main.scrollY;
    for (const shuttle of shuttles) {
      if (!shuttle.active) continue;

      const shuttleScreenX = shuttle.x - cameraX;
      const shuttleScreenY = shuttle.y - cameraY;

      for (const cloud of visibleStormClouds) {
        if (time - cloud.lastLightningTime < 5000 + Math.random() * 5000) continue;

        const cloudScreenX = this.getCloudScreenX(cloud);
        const cloudScreenY = cloud.y - cameraY * 0.02;
        const cloudVisualCenterY = cloudScreenY + 5 * cloud.scale;
        const dx = Math.abs(shuttleScreenX - cloudScreenX);
        const dy = shuttleScreenY - cloudVisualCenterY;
        const collisionRadius = cloud.scale * 35;
        const warningStartY = collisionRadius + 10;

        // Warning zone is 180px horizontal (strike zone is 250px) - gives player time to react
        if (dx < 180 && dy > warningStartY && dy < warningStartY + 180) {
          if (Math.random() < 0.35) {
            this.showLightningWarning(cloud, shuttle);
            this.pendingLightningStrike = { cloud, shuttle, warningStart: time, strikeDelay: 2000 + Math.random() * 1000 };
            cloud.lastLightningTime = time;
            return;
          }
        }
      }
    }

    for (const cloud of visibleStormClouds) {
      if (time - cloud.lastLightningTime < 5000 + Math.random() * 5000) continue;

      if (Math.random() < 0.02) {
        this.triggerAmbientLightning(cloud);
        cloud.lastLightningTime = time;
        return;
      }
    }
  }

  private showLightningWarning(cloud: CloudData, shuttle: Shuttle): void {
    console.log('[Lightning] WARNING FLASH! Get to safety!');
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xFFFFAA, 1);
    flash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    flash.setScrollFactor(0);
    flash.setDepth(600);
    flash.setAlpha(0.6);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy()
    });

    const cloudScreenX = this.getCloudScreenX(cloud);
    const glowGraphics = this.scene.add.graphics();
    glowGraphics.setScrollFactor(0);
    glowGraphics.setDepth(500);
    glowGraphics.fillStyle(0xFFFF00, 1);
    glowGraphics.fillCircle(cloudScreenX, cloud.y, cloud.scale * 60);
    glowGraphics.setAlpha(0.5);

    this.scene.tweens.add({
      targets: glowGraphics,
      alpha: 0.15,
      duration: 400,
      yoyo: true,
      repeat: 2,
      onComplete: () => glowGraphics.destroy()
    });
  }

  private triggerLightningStrike(cloud: CloudData, shuttle: Shuttle): void {
    console.log('[Lightning] STRIKE! Hitting shuttle after warning');
    const cameraX = this.scene.cameras.main.scrollX;
    const cameraY = this.scene.cameras.main.scrollY;
    const cloudScreenX = this.getCloudScreenX(cloud);
    const cloudScreenY = cloud.y - cameraY * 0.02;
    const shuttleScreenX = shuttle.x - cameraX;
    const shuttleScreenY = shuttle.y - cameraY;

    const segments = this.generateLightningPath(cloudScreenX, cloudScreenY + 40 * cloud.scale, shuttleScreenX, shuttleScreenY);

    this.drawLightningBoltScreen(segments);
    this.createLightningFlash();

    // Notify GameScene to handle shuttle death
    this.callbacks.onLightningStrike(shuttle);
  }

  private triggerAmbientLightning(cloud: CloudData): void {
    const cameraY = this.scene.cameras.main.scrollY;
    const cloudScreenX = this.getCloudScreenX(cloud);
    const cloudScreenY = cloud.y - cameraY * 0.02;

    const targetX = cloudScreenX + (Math.random() - 0.5) * 150;
    const targetY = cloudScreenY + 250 + Math.random() * 250;

    const segments = this.generateLightningPath(cloudScreenX, cloudScreenY + 40 * cloud.scale, targetX, targetY);
    this.drawLightningBoltScreen(segments);
    this.createLightningFlash();
  }

  private generateLightningPath(startX: number, startY: number, endX: number, endY: number): { x: number; y: number }[] {
    const segments: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const numSegments = 8 + Math.floor(Math.random() * 6);

    for (let i = 1; i < numSegments; i++) {
      const progress = i / numSegments;
      const baseX = startX + (endX - startX) * progress;
      const baseY = startY + (endY - startY) * progress;

      const variationFactor = Math.sin(progress * Math.PI) * 50;
      const offsetX = (Math.random() - 0.5) * variationFactor;

      segments.push({ x: baseX + offsetX, y: baseY });
    }

    segments.push({ x: endX, y: endY });
    return segments;
  }

  private drawLightningBoltScreen(screenSegments: { x: number; y: number }[]): void {
    const bolt = this.scene.add.graphics();
    bolt.setScrollFactor(0);
    bolt.setDepth(500);

    bolt.lineStyle(12, 0x8888FF, 0.5);
    bolt.beginPath();
    bolt.moveTo(screenSegments[0].x, screenSegments[0].y);
    for (let i = 1; i < screenSegments.length; i++) {
      bolt.lineTo(screenSegments[i].x, screenSegments[i].y);
    }
    bolt.strokePath();

    bolt.lineStyle(6, 0xCCCCFF, 0.8);
    bolt.beginPath();
    bolt.moveTo(screenSegments[0].x, screenSegments[0].y);
    for (let i = 1; i < screenSegments.length; i++) {
      bolt.lineTo(screenSegments[i].x, screenSegments[i].y);
    }
    bolt.strokePath();

    bolt.lineStyle(3, 0xFFFFFF, 1);
    bolt.beginPath();
    bolt.moveTo(screenSegments[0].x, screenSegments[0].y);
    for (let i = 1; i < screenSegments.length; i++) {
      bolt.lineTo(screenSegments[i].x, screenSegments[i].y);
    }
    bolt.strokePath();

    if (screenSegments.length > 4 && Math.random() < 0.7) {
      const branchPoint = Math.floor(screenSegments.length * 0.4);
      const branchEnd = {
        x: screenSegments[branchPoint].x + (Math.random() - 0.5) * 100,
        y: screenSegments[branchPoint].y + 50 + Math.random() * 80
      };
      const branchSegments = this.generateLightningPath(
        screenSegments[branchPoint].x,
        screenSegments[branchPoint].y,
        branchEnd.x,
        branchEnd.y
      ).slice(0, 5);

      bolt.lineStyle(4, 0xCCCCFF, 0.6);
      bolt.beginPath();
      bolt.moveTo(branchSegments[0].x, branchSegments[0].y);
      for (let i = 1; i < branchSegments.length; i++) {
        bolt.lineTo(branchSegments[i].x, branchSegments[i].y);
      }
      bolt.strokePath();
    }

    this.scene.time.delayedCall(200, () => {
      bolt.destroy();
    });
  }

  private createLightningFlash(): void {
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xFFFFFF, 0.35);
    flash.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    flash.setScrollFactor(0);
    flash.setDepth(1000);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 120,
      onComplete: () => flash.destroy()
    });
  }

  // Public getters
  getWindStrength(): number {
    return this.windStrength;
  }

  getRainIntensity(): RainIntensity {
    return this.rainIntensity;
  }

  getWeatherState(): WeatherState {
    return this.weatherState;
  }

  getSplashParticleCount(): number {
    let count = 0;
    for (const splash of this.rainSplashes) {
      count += splash.particles.length;
    }
    return count;
  }

  // Cleanup
  destroy(): void {
    if (this.rainEmitter) {
      this.rainEmitter.destroy();
      this.rainEmitter = null;
    }
    if (this.rainGraphics) {
      this.rainGraphics.destroy();
      this.rainGraphics = null;
    }
    if (this.windDebrisGraphics) {
      this.windDebrisGraphics.destroy();
      this.windDebrisGraphics = null;
    }
    if (this.cloudGraphics) {
      this.cloudGraphics.destroy();
      this.cloudGraphics = null;
    }
    if (this.lightningGraphics) {
      this.lightningGraphics.destroy();
      this.lightningGraphics = null;
    }
  }
}
