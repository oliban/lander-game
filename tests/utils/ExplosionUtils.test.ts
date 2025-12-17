import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock PerformanceSettings to return predictable values for tests
vi.mock('../../src/systems/PerformanceSettings', () => ({
  PerformanceSettings: {
    getPreset: vi.fn(() => ({
      explosionDebris: true,
      explosionDebrisCount: 0, // 0 means use config value, not override
      explosionSmoke: true,
      cameraShake: true,
    })),
  },
}));

import {
  createExplosionFlash,
  createExplosionDebris,
  createSmokePuffs,
  createExplosion,
  ExplosionFlashConfig,
  ExplosionDebrisConfig,
  SmokePuffConfig,
  ExplosionConfig,
} from '../../src/utils/ExplosionUtils';

// Mock Phaser.GameObjects.Graphics
class MockGraphics {
  x: number = 0;
  y: number = 0;
  alpha: number = 1;
  scale: number = 1;
  angle: number = 0;
  depth: number = 0;
  destroyed: boolean = false;

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }

  setDepth(depth: number) {
    this.depth = depth;
    return this;
  }

  fillStyle(_color: number, _alpha: number) {
    return this;
  }

  fillCircle(_x: number, _y: number, _radius: number) {
    return this;
  }

  fillRect(_x: number, _y: number, _width: number, _height: number) {
    return this;
  }

  setAngle(angle: number) {
    this.angle = angle;
    return this;
  }

  destroy() {
    this.destroyed = true;
  }
}

// Mock Phaser.Scene
class MockScene {
  add = {
    graphics: vi.fn(() => new MockGraphics()),
  };

  tweens = {
    add: vi.fn((config: any) => {
      // Immediately call onComplete for testing
      if (config.onComplete) {
        config.onComplete();
      }
      return { destroy: vi.fn() };
    }),
  };

  cameras = {
    main: {
      shake: vi.fn(),
    },
  };
}

describe('ExplosionUtils', () => {
  let mockScene: MockScene;

  beforeEach(() => {
    mockScene = new MockScene();
    vi.clearAllMocks();
  });

  describe('createExplosionFlash', () => {
    it('should create a flash graphics object at the correct position', () => {
      const x = 100;
      const y = 200;

      createExplosionFlash(mockScene as any, x, y);

      expect(mockScene.add.graphics).toHaveBeenCalledTimes(1);
      const graphics = mockScene.add.graphics.mock.results[0].value;
      expect(graphics.x).toBe(x);
      expect(graphics.y).toBe(y);
    });

    it('should use default config values when no config is provided', () => {
      createExplosionFlash(mockScene as any, 100, 100);

      expect(mockScene.add.graphics).toHaveBeenCalledTimes(1);
      expect(mockScene.tweens.add).toHaveBeenCalledTimes(1);

      const tweenConfig = mockScene.tweens.add.mock.calls[0][0];
      expect(tweenConfig.duration).toBe(400);
      expect(tweenConfig.alpha).toBe(0);
    });

    it('should apply custom flash colors and sizes', () => {
      const config: ExplosionFlashConfig = {
        flashColors: [0xFF0000, 0x00FF00, 0x0000FF],
        flashSizes: [50, 30, 10],
        duration: 500,
        depth: 200,
      };

      createExplosionFlash(mockScene as any, 100, 100, config);

      const graphics = mockScene.add.graphics.mock.results[0].value;
      expect(graphics.depth).toBe(200);

      const tweenConfig = mockScene.tweens.add.mock.calls[0][0];
      expect(tweenConfig.duration).toBe(500);
    });

    it('should create a tween that fades out the flash', () => {
      createExplosionFlash(mockScene as any, 100, 100);

      expect(mockScene.tweens.add).toHaveBeenCalledTimes(1);
      const tweenConfig = mockScene.tweens.add.mock.calls[0][0];

      expect(tweenConfig.alpha).toBe(0);
      expect(tweenConfig.onComplete).toBeDefined();
    });

    it('should destroy graphics when tween completes', () => {
      createExplosionFlash(mockScene as any, 100, 100);

      const graphics = mockScene.add.graphics.mock.results[0].value;
      expect(graphics.destroyed).toBe(true);
    });
  });

  describe('createExplosionDebris', () => {
    it('should create the correct number of debris pieces', () => {
      const debrisCount = 15;
      createExplosionDebris(mockScene as any, 100, 100, { debrisCount });

      expect(mockScene.add.graphics).toHaveBeenCalledTimes(debrisCount);
    });

    it('should use default debris count of 12 when not specified', () => {
      createExplosionDebris(mockScene as any, 100, 100);

      expect(mockScene.add.graphics).toHaveBeenCalledTimes(12);
    });

    it('should position all debris at the explosion center initially', () => {
      const x = 150;
      const y = 250;

      createExplosionDebris(mockScene as any, x, y, { debrisCount: 5 });

      const graphics = mockScene.add.graphics.mock.results;
      graphics.forEach((result) => {
        expect(result.value.x).toBe(x);
        expect(result.value.y).toBe(y);
      });
    });

    it('should create tweens for all debris pieces', () => {
      const debrisCount = 8;
      createExplosionDebris(mockScene as any, 100, 100, { debrisCount });

      expect(mockScene.tweens.add).toHaveBeenCalledTimes(debrisCount);
    });

    it('should use custom debris colors', () => {
      const config: ExplosionDebrisConfig = {
        debrisColors: [0xFF0000, 0x00FF00],
        debrisCount: 4,
      };

      createExplosionDebris(mockScene as any, 100, 100, config);

      expect(mockScene.add.graphics).toHaveBeenCalledTimes(4);
    });

    it('should apply custom debris dimensions', () => {
      const config: ExplosionDebrisConfig = {
        debrisWidth: 16,
        debrisHeight: 12,
        debrisCount: 3,
      };

      createExplosionDebris(mockScene as any, 100, 100, config);

      expect(mockScene.add.graphics).toHaveBeenCalledTimes(3);
    });

    it('should use Power2 easing', () => {
      createExplosionDebris(mockScene as any, 100, 100, { debrisCount: 2 });

      const tweenConfig = mockScene.tweens.add.mock.calls[0][0];
      expect(tweenConfig.ease).toBe('Power2');
    });

    it('should set custom depth on debris', () => {
      const config: ExplosionDebrisConfig = {
        depth: 150,
        debrisCount: 2,
      };

      createExplosionDebris(mockScene as any, 100, 100, config);

      const graphics = mockScene.add.graphics.mock.results;
      graphics.forEach((result) => {
        expect(result.value.depth).toBe(150);
      });
    });

    it('should destroy debris when tween completes', () => {
      createExplosionDebris(mockScene as any, 100, 100, { debrisCount: 3 });

      const graphics = mockScene.add.graphics.mock.results;
      graphics.forEach((result) => {
        expect(result.value.destroyed).toBe(true);
      });
    });
  });

  describe('createSmokePuffs', () => {
    it('should create the correct number of smoke puffs', () => {
      const puffCount = 6;
      createSmokePuffs(mockScene as any, 100, 100, { puffCount });

      expect(mockScene.add.graphics).toHaveBeenCalledTimes(puffCount);
    });

    it('should use default puff count of 4 when not specified', () => {
      createSmokePuffs(mockScene as any, 100, 100);

      expect(mockScene.add.graphics).toHaveBeenCalledTimes(4);
    });

    it('should create tweens for all smoke puffs', () => {
      const puffCount = 5;
      createSmokePuffs(mockScene as any, 100, 100, { puffCount });

      expect(mockScene.tweens.add).toHaveBeenCalledTimes(puffCount);
    });

    it('should apply delay between puffs', () => {
      const puffCount = 3;
      const delayBetweenPuffs = 100;

      createSmokePuffs(mockScene as any, 100, 100, { puffCount, delayBetweenPuffs });

      for (let i = 0; i < puffCount; i++) {
        const tweenConfig = mockScene.tweens.add.mock.calls[i][0];
        expect(tweenConfig.delay).toBe(i * delayBetweenPuffs);
      }
    });

    it('should use custom smoke color and alpha', () => {
      const config: SmokePuffConfig = {
        smokeColor: 0x666666,
        smokeAlpha: 0.8,
        puffCount: 2,
      };

      createSmokePuffs(mockScene as any, 100, 100, config);

      expect(mockScene.add.graphics).toHaveBeenCalledTimes(2);
    });

    it('should apply custom scale multiplier', () => {
      const config: SmokePuffConfig = {
        scaleMultiplier: 3,
        puffCount: 2,
      };

      createSmokePuffs(mockScene as any, 100, 100, config);

      const tweenConfig = mockScene.tweens.add.mock.calls[0][0];
      expect(tweenConfig.scale).toBe(3);
    });

    it('should fade out smoke to alpha 0', () => {
      createSmokePuffs(mockScene as any, 100, 100, { puffCount: 1 });

      const tweenConfig = mockScene.tweens.add.mock.calls[0][0];
      expect(tweenConfig.alpha).toBe(0);
    });

    it('should set custom depth on smoke', () => {
      const config: SmokePuffConfig = {
        depth: 50,
        puffCount: 2,
      };

      createSmokePuffs(mockScene as any, 100, 100, config);

      const graphics = mockScene.add.graphics.mock.results;
      graphics.forEach((result) => {
        expect(result.value.depth).toBe(50);
      });
    });

    it('should destroy smoke when tween completes', () => {
      createSmokePuffs(mockScene as any, 100, 100, { puffCount: 2 });

      const graphics = mockScene.add.graphics.mock.results;
      graphics.forEach((result) => {
        expect(result.value.destroyed).toBe(true);
      });
    });
  });

  describe('createExplosion', () => {
    it('should create flash, debris, and smoke when all are enabled', () => {
      const config: ExplosionConfig = {
        includeFlash: true,
        includeDebris: true,
        includeSmoke: true,
        debrisCount: 10,
        puffCount: 3,
      };

      createExplosion(mockScene as any, 100, 100, config);

      // 1 flash + 10 debris + 3 smoke = 14 graphics
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(14);
    });

    it('should only create flash when other effects are disabled', () => {
      const config: ExplosionConfig = {
        includeFlash: true,
        includeDebris: false,
        includeSmoke: false,
      };

      createExplosion(mockScene as any, 100, 100, config);

      // Only 1 flash
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(1);
    });

    it('should only create debris when flash and smoke are disabled', () => {
      const config: ExplosionConfig = {
        includeFlash: false,
        includeDebris: true,
        includeSmoke: false,
        debrisCount: 5,
      };

      createExplosion(mockScene as any, 100, 100, config);

      // Only 5 debris
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(5);
    });

    it('should use default settings (flash and debris, no smoke)', () => {
      createExplosion(mockScene as any, 100, 100);

      // 1 flash + 12 debris (default) = 13 graphics
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(13);
    });

    it('should trigger camera shake when enabled', () => {
      const config: ExplosionConfig = {
        shakeCamera: true,
        shakeDuration: 500,
        shakeIntensity: 0.02,
      };

      createExplosion(mockScene as any, 100, 100, config);

      expect(mockScene.cameras.main.shake).toHaveBeenCalledWith(500, 0.02);
    });

    it('should not trigger camera shake when disabled', () => {
      const config: ExplosionConfig = {
        shakeCamera: false,
      };

      createExplosion(mockScene as any, 100, 100, config);

      expect(mockScene.cameras.main.shake).not.toHaveBeenCalled();
    });

    it('should use default camera shake settings', () => {
      createExplosion(mockScene as any, 100, 100, { shakeCamera: true });

      expect(mockScene.cameras.main.shake).toHaveBeenCalledWith(300, 0.015);
    });

    it('should pass through flash config to createExplosionFlash', () => {
      const config: ExplosionConfig = {
        includeFlash: true,
        flashColors: [0xFF0000, 0x00FF00],
        flashSizes: [40, 20],
        duration: 600,
      };

      createExplosion(mockScene as any, 100, 100, config);

      const tweenConfig = mockScene.tweens.add.mock.calls[0][0];
      expect(tweenConfig.duration).toBe(600);
    });

    it('should pass through debris config to createExplosionDebris', () => {
      const config: ExplosionConfig = {
        includeDebris: true,
        debrisCount: 20,
        debrisColors: [0xFF0000],
      };

      createExplosion(mockScene as any, 100, 100, config);

      expect(mockScene.add.graphics).toHaveBeenCalledTimes(21); // 1 flash + 20 debris
    });

    it('should pass through smoke config to createSmokePuffs', () => {
      const config: ExplosionConfig = {
        includeSmoke: true,
        puffCount: 8,
        smokeColor: 0x333333,
      };

      createExplosion(mockScene as any, 100, 100, config);

      // 1 flash + 12 debris + 8 smoke = 21
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(21);
    });

    it('should handle scene without cameras gracefully', () => {
      const sceneWithoutCameras = new MockScene();
      sceneWithoutCameras.cameras = undefined as any;

      // Should not throw
      expect(() => {
        createExplosion(sceneWithoutCameras as any, 100, 100, { shakeCamera: true });
      }).not.toThrow();
    });

    it('should create explosion at correct position', () => {
      const x = 300;
      const y = 400;

      createExplosion(mockScene as any, x, y);

      const flashGraphics = mockScene.add.graphics.mock.results[0].value;
      expect(flashGraphics.x).toBe(x);
      expect(flashGraphics.y).toBe(y);

      // Check debris starting positions (all should start at x, y)
      for (let i = 1; i < mockScene.add.graphics.mock.results.length; i++) {
        const debrisGraphics = mockScene.add.graphics.mock.results[i].value;
        expect(debrisGraphics.x).toBe(x);
        expect(debrisGraphics.y).toBe(y);
      }
    });
  });

  describe('Config Type Safety', () => {
    it('should accept partial ExplosionFlashConfig', () => {
      const config: Partial<ExplosionFlashConfig> = {
        duration: 500,
      };

      expect(() => {
        createExplosionFlash(mockScene as any, 100, 100, config);
      }).not.toThrow();
    });

    it('should accept partial ExplosionDebrisConfig', () => {
      const config: Partial<ExplosionDebrisConfig> = {
        debrisCount: 20,
      };

      expect(() => {
        createExplosionDebris(mockScene as any, 100, 100, config);
      }).not.toThrow();
    });

    it('should accept partial SmokePuffConfig', () => {
      const config: Partial<SmokePuffConfig> = {
        puffCount: 10,
      };

      expect(() => {
        createSmokePuffs(mockScene as any, 100, 100, config);
      }).not.toThrow();
    });

    it('should accept empty config object', () => {
      expect(() => {
        createExplosion(mockScene as any, 100, 100, {});
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero debris count', () => {
      createExplosionDebris(mockScene as any, 100, 100, { debrisCount: 0 });

      expect(mockScene.add.graphics).toHaveBeenCalledTimes(0);
    });

    it('should handle zero puff count', () => {
      createSmokePuffs(mockScene as any, 100, 100, { puffCount: 0 });

      expect(mockScene.add.graphics).toHaveBeenCalledTimes(0);
    });

    it('should handle explosion with all effects disabled', () => {
      const config: ExplosionConfig = {
        includeFlash: false,
        includeDebris: false,
        includeSmoke: false,
        shakeCamera: false,
      };

      createExplosion(mockScene as any, 100, 100, config);

      expect(mockScene.add.graphics).toHaveBeenCalledTimes(0);
      expect(mockScene.cameras.main.shake).not.toHaveBeenCalled();
    });

    it('should handle mismatched flashColors and flashSizes arrays', () => {
      const config: ExplosionFlashConfig = {
        flashColors: [0xFF0000, 0x00FF00, 0x0000FF],
        flashSizes: [30, 20], // Only 2 sizes for 3 colors
      };

      expect(() => {
        createExplosionFlash(mockScene as any, 100, 100, config);
      }).not.toThrow();
    });

    it('should handle negative coordinates', () => {
      expect(() => {
        createExplosion(mockScene as any, -100, -200);
      }).not.toThrow();

      const flashGraphics = mockScene.add.graphics.mock.results[0].value;
      expect(flashGraphics.x).toBe(-100);
      expect(flashGraphics.y).toBe(-200);
    });

    it('should handle very large coordinate values', () => {
      const x = 999999;
      const y = 888888;

      expect(() => {
        createExplosion(mockScene as any, x, y);
      }).not.toThrow();

      const flashGraphics = mockScene.add.graphics.mock.results[0].value;
      expect(flashGraphics.x).toBe(x);
      expect(flashGraphics.y).toBe(y);
    });
  });
});
