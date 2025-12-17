import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage before importing the module
const localStorageMock: { [key: string]: string } = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => localStorageMock[key] || null),
  setItem: vi.fn((key: string, value: string) => { localStorageMock[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageMock[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]); }),
});

// Import types and constants
import {
  QualityLevel,
  QualityPreset,
  QUALITY_PRESETS,
} from '../../src/systems/PerformanceSettings';

/**
 * Tests for PerformanceSettings
 *
 * Key behaviors to verify:
 * 1. Quality preset configuration values
 * 2. Quality level management (get/set)
 * 3. Auto-adjust FPS logic
 * 4. Warmup period behavior
 * 5. Listener notification system
 * 6. localStorage persistence
 * 7. Device detection defaults
 */

describe('PerformanceSettings', () => {
  // Clear localStorage mock before each test
  beforeEach(() => {
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('QUALITY_PRESETS', () => {
    const qualityLevels: QualityLevel[] = ['ultra', 'high', 'medium', 'low', 'potato'];

    it('should have 5 quality levels', () => {
      expect(Object.keys(QUALITY_PRESETS)).toHaveLength(5);
    });

    it('should have all expected quality levels', () => {
      qualityLevels.forEach(level => {
        expect(QUALITY_PRESETS[level]).toBeDefined();
      });
    });

    describe('ultra preset', () => {
      const preset = QUALITY_PRESETS.ultra;

      it('should have name "Ultra"', () => {
        expect(preset.name).toBe('Ultra');
      });

      it('should have full weather effects', () => {
        expect(preset.weather).toBe('full');
      });

      it('should have all visual effects enabled', () => {
        expect(preset.chemtrails).toBe(true);
        expect(preset.scorchMarks).toBe(true);
        expect(preset.explosionDebris).toBe(true);
        expect(preset.explosionSmoke).toBe(true);
        expect(preset.thrusterParticles).toBe(true);
        expect(preset.waterSplash).toBe(true);
        expect(preset.rainSplash).toBe(true);
        expect(preset.windDebris).toBe(true);
        expect(preset.flagAnimations).toBe(true);
        expect(preset.decorations).toBe(true);
        expect(preset.cameraShake).toBe(true);
        expect(preset.speedTrails).toBe(true);
        expect(preset.oceanWaves).toBe(true);
      });

      it('should have particle multiplier of 1.0', () => {
        expect(preset.particleMultiplier).toBe(1.0);
      });

      it('should have cannon multiplier of 1.0', () => {
        expect(preset.cannonMultiplier).toBe(1.0);
      });

      it('should have no collision throttling', () => {
        expect(preset.collisionCheckInterval).toBe(0);
      });

      it('should have entity updates enabled', () => {
        expect(preset.entityUpdates).toBe(true);
      });

      it('should have projectile collisions enabled', () => {
        expect(preset.projectileCollisions).toBe(true);
      });
    });

    describe('high preset', () => {
      const preset = QUALITY_PRESETS.high;

      it('should have name "High"', () => {
        expect(preset.name).toBe('High');
      });

      it('should have light weather effects', () => {
        expect(preset.weather).toBe('light');
      });

      it('should have reduced particle multiplier', () => {
        expect(preset.particleMultiplier).toBe(0.75);
      });

      it('should have shorter chemtrail lifespan than ultra', () => {
        expect(preset.chemtrailLifespan).toBeLessThan(QUALITY_PRESETS.ultra.chemtrailLifespan);
      });
    });

    describe('medium preset', () => {
      const preset = QUALITY_PRESETS.medium;

      it('should have name "Medium"', () => {
        expect(preset.name).toBe('Medium');
      });

      it('should have weather disabled', () => {
        expect(preset.weather).toBe('off');
      });

      it('should have chemtrails disabled', () => {
        expect(preset.chemtrails).toBe(false);
      });

      it('should have half particle multiplier', () => {
        expect(preset.particleMultiplier).toBe(0.5);
      });

      it('should have flag animations disabled', () => {
        expect(preset.flagAnimations).toBe(false);
      });

      it('should have collision throttling at ~60fps interval', () => {
        expect(preset.collisionCheckInterval).toBe(16);
      });

      it('should have reduced cannon multiplier', () => {
        expect(preset.cannonMultiplier).toBe(0.75);
      });
    });

    describe('low preset', () => {
      const preset = QUALITY_PRESETS.low;

      it('should have name "Low"', () => {
        expect(preset.name).toBe('Low');
      });

      it('should have scorch marks disabled', () => {
        expect(preset.scorchMarks).toBe(false);
      });

      it('should have quarter particle multiplier', () => {
        expect(preset.particleMultiplier).toBe(0.25);
      });

      it('should have decorations disabled', () => {
        expect(preset.decorations).toBe(false);
      });

      it('should have entity updates disabled', () => {
        expect(preset.entityUpdates).toBe(false);
      });

      it('should have ocean waves disabled', () => {
        expect(preset.oceanWaves).toBe(false);
      });

      it('should have projectile collisions disabled', () => {
        expect(preset.projectileCollisions).toBe(false);
      });

      it('should have collision throttling at ~30fps interval', () => {
        expect(preset.collisionCheckInterval).toBe(33);
      });

      it('should have half cannon multiplier', () => {
        expect(preset.cannonMultiplier).toBe(0.5);
      });
    });

    describe('potato preset', () => {
      const preset = QUALITY_PRESETS.potato;

      it('should have name "Potato"', () => {
        expect(preset.name).toBe('Potato');
      });

      it('should have explosion debris disabled', () => {
        expect(preset.explosionDebris).toBe(false);
      });

      it('should have minimal particle multiplier', () => {
        expect(preset.particleMultiplier).toBe(0.15);
      });

      it('should have power-up visuals disabled', () => {
        expect(preset.powerupVisuals).toBe(false);
      });

      it('should have quarter cannon multiplier', () => {
        expect(preset.cannonMultiplier).toBe(0.25);
      });

      it('should have maximum collision throttling', () => {
        expect(preset.collisionCheckInterval).toBe(50);
      });

      it('should have longest scorch raycast interval', () => {
        expect(preset.scorchRaycastInterval).toBe(500);
      });
    });

    describe('quality degradation ordering', () => {
      it('should have progressively lower particle multipliers', () => {
        expect(QUALITY_PRESETS.ultra.particleMultiplier).toBeGreaterThan(QUALITY_PRESETS.high.particleMultiplier);
        expect(QUALITY_PRESETS.high.particleMultiplier).toBeGreaterThan(QUALITY_PRESETS.medium.particleMultiplier);
        expect(QUALITY_PRESETS.medium.particleMultiplier).toBeGreaterThan(QUALITY_PRESETS.low.particleMultiplier);
        expect(QUALITY_PRESETS.low.particleMultiplier).toBeGreaterThan(QUALITY_PRESETS.potato.particleMultiplier);
      });

      it('should have progressively higher collision check intervals', () => {
        expect(QUALITY_PRESETS.ultra.collisionCheckInterval).toBeLessThanOrEqual(QUALITY_PRESETS.high.collisionCheckInterval);
        expect(QUALITY_PRESETS.high.collisionCheckInterval).toBeLessThanOrEqual(QUALITY_PRESETS.medium.collisionCheckInterval);
        expect(QUALITY_PRESETS.medium.collisionCheckInterval).toBeLessThan(QUALITY_PRESETS.low.collisionCheckInterval);
        expect(QUALITY_PRESETS.low.collisionCheckInterval).toBeLessThan(QUALITY_PRESETS.potato.collisionCheckInterval);
      });

      it('should have progressively lower cannon multipliers', () => {
        expect(QUALITY_PRESETS.ultra.cannonMultiplier).toBeGreaterThanOrEqual(QUALITY_PRESETS.high.cannonMultiplier);
        expect(QUALITY_PRESETS.high.cannonMultiplier).toBeGreaterThanOrEqual(QUALITY_PRESETS.medium.cannonMultiplier);
        expect(QUALITY_PRESETS.medium.cannonMultiplier).toBeGreaterThan(QUALITY_PRESETS.low.cannonMultiplier);
        expect(QUALITY_PRESETS.low.cannonMultiplier).toBeGreaterThan(QUALITY_PRESETS.potato.cannonMultiplier);
      });
    });
  });

  describe('QualityPreset interface', () => {
    it('should have all required properties', () => {
      const preset: QualityPreset = QUALITY_PRESETS.ultra;
      const requiredKeys = [
        'name', 'weather', 'chemtrails', 'chemtrailLifespan', 'scorchMarks',
        'maxScorchMarks', 'explosionDebris', 'explosionDebrisCount', 'explosionSmoke',
        'thrusterParticles', 'particleMultiplier', 'waterSplash', 'rainSplash',
        'windDebris', 'flagAnimations', 'decorations', 'cameraShake',
        'achievementAnimations', 'powerupVisuals', 'speedTrails', 'cannonMultiplier',
        'collisionCheckInterval', 'scorchRaycastInterval', 'entityUpdates',
        'oceanWaves', 'altitudeOverlay', 'projectileCollisions'
      ];

      requiredKeys.forEach(key => {
        expect(preset).toHaveProperty(key);
      });
    });

    it('should have valid weather type values', () => {
      const validWeatherValues = ['full', 'light', 'off'];
      Object.values(QUALITY_PRESETS).forEach(preset => {
        expect(validWeatherValues).toContain(preset.weather);
      });
    });

    it('should have particle multiplier between 0 and 1', () => {
      Object.values(QUALITY_PRESETS).forEach(preset => {
        expect(preset.particleMultiplier).toBeGreaterThanOrEqual(0);
        expect(preset.particleMultiplier).toBeLessThanOrEqual(1);
      });
    });

    it('should have cannon multiplier between 0 and 1', () => {
      Object.values(QUALITY_PRESETS).forEach(preset => {
        expect(preset.cannonMultiplier).toBeGreaterThanOrEqual(0);
        expect(preset.cannonMultiplier).toBeLessThanOrEqual(1);
      });
    });

    it('should have non-negative collision check interval', () => {
      Object.values(QUALITY_PRESETS).forEach(preset => {
        expect(preset.collisionCheckInterval).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have non-negative scorch raycast interval', () => {
      Object.values(QUALITY_PRESETS).forEach(preset => {
        expect(preset.scorchRaycastInterval).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have non-negative chemtrail lifespan', () => {
      Object.values(QUALITY_PRESETS).forEach(preset => {
        expect(preset.chemtrailLifespan).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have non-negative max scorch marks', () => {
      Object.values(QUALITY_PRESETS).forEach(preset => {
        expect(preset.maxScorchMarks).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have non-negative explosion debris count', () => {
      Object.values(QUALITY_PRESETS).forEach(preset => {
        expect(preset.explosionDebrisCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('preset consistency', () => {
    it('should have thruster particles enabled in all presets (essential for gameplay)', () => {
      Object.values(QUALITY_PRESETS).forEach(preset => {
        expect(preset.thrusterParticles).toBe(true);
      });
    });

    it('should have consistent naming pattern', () => {
      const expectedNames: Record<QualityLevel, string> = {
        ultra: 'Ultra',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        potato: 'Potato',
      };

      (Object.keys(QUALITY_PRESETS) as QualityLevel[]).forEach(level => {
        expect(QUALITY_PRESETS[level].name).toBe(expectedNames[level]);
      });
    });
  });
});
