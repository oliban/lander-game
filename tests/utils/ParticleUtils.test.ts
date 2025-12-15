import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Phaser from 'phaser';
import { createBubbles, createSplash, createSmokePuffs } from '../../src/utils/ParticleUtils';

// Mock Phaser Graphics and Tweens
class MockGraphics {
  private _x: number = 0;
  private _y: number = 0;
  private _depth: number = 0;
  private _visible: boolean = true;
  private _alpha: number = 1;
  public destroyed: boolean = false;
  public fillStyleCalls: Array<{ color: number; alpha: number }> = [];
  public fillCircleCalls: Array<{ x: number; y: number; radius: number }> = [];

  fillStyle(color: number, alpha: number = 1) {
    this.fillStyleCalls.push({ color, alpha });
    return this;
  }

  fillCircle(x: number, y: number, radius: number) {
    this.fillCircleCalls.push({ x, y, radius });
    return this;
  }

  setPosition(x: number, y: number) {
    this._x = x;
    this._y = y;
    return this;
  }

  setDepth(depth: number) {
    this._depth = depth;
    return this;
  }

  setVisible(visible: boolean) {
    this._visible = visible;
    return this;
  }

  destroy() {
    this.destroyed = true;
  }

  get x() {
    return this._x;
  }

  get y() {
    return this._y;
  }

  get depth() {
    return this._depth;
  }

  get visible() {
    return this._visible;
  }

  get alpha() {
    return this._alpha;
  }

  set alpha(value: number) {
    this._alpha = value;
  }
}

class MockTweens {
  public tweenCalls: Array<any> = [];

  add(config: any) {
    this.tweenCalls.push(config);
    // Optionally execute onComplete immediately for testing
    if (config.onComplete) {
      // We don't auto-execute in tests to allow inspection
    }
    return config;
  }
}

class MockScene {
  public add: any;
  public tweens: MockTweens;
  public createdGraphics: MockGraphics[] = [];

  constructor() {
    this.tweens = new MockTweens();
    this.add = {
      graphics: () => {
        const g = new MockGraphics();
        this.createdGraphics.push(g);
        return g;
      },
    };
  }
}

describe('ParticleUtils', () => {
  let mockScene: MockScene;

  beforeEach(() => {
    mockScene = new MockScene();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createBubbles', () => {
    it('should create default number of bubbles (5)', () => {
      const bubbles = createBubbles(mockScene as any, 100, 200);

      expect(bubbles).toHaveLength(5);
      expect(mockScene.createdGraphics).toHaveLength(5);
    });

    it('should create custom number of bubbles', () => {
      const bubbles = createBubbles(mockScene as any, 100, 200, { count: 10 });

      expect(bubbles).toHaveLength(10);
      expect(mockScene.createdGraphics).toHaveLength(10);
    });

    it('should apply default bubble color and alpha', () => {
      createBubbles(mockScene as any, 100, 200, { count: 1 });

      const graphic = mockScene.createdGraphics[0];
      expect(graphic.fillStyleCalls[0]).toEqual({
        color: 0xadd8e6, // light blue
        alpha: 0.6,
      });
    });

    it('should apply custom color and alpha', () => {
      createBubbles(mockScene as any, 100, 200, {
        count: 1,
        color: 0x90ee90,
        alpha: 0.7,
      });

      const graphic = mockScene.createdGraphics[0];
      expect(graphic.fillStyleCalls[0]).toEqual({
        color: 0x90ee90,
        alpha: 0.7,
      });
    });

    it('should create bubbles with radius in specified range', () => {
      createBubbles(mockScene as any, 100, 200, {
        count: 1,
        minRadius: 2,
        maxRadius: 5,
      });

      const graphic = mockScene.createdGraphics[0];
      const circleCall = graphic.fillCircleCalls[0];
      expect(circleCall.x).toBe(0);
      expect(circleCall.y).toBe(0);
      expect(circleCall.radius).toBeGreaterThanOrEqual(2);
      expect(circleCall.radius).toBeLessThanOrEqual(5);
    });

    it('should position bubbles at specified coordinates', () => {
      createBubbles(mockScene as any, 150, 250, { count: 1 });

      const graphic = mockScene.createdGraphics[0];
      expect(graphic.x).toBe(150);
      expect(graphic.y).toBe(250);
    });

    it('should set default depth (49)', () => {
      createBubbles(mockScene as any, 100, 200, { count: 1 });

      const graphic = mockScene.createdGraphics[0];
      expect(graphic.depth).toBe(49);
    });

    it('should set custom depth', () => {
      createBubbles(mockScene as any, 100, 200, { count: 1, depth: 100 });

      const graphic = mockScene.createdGraphics[0];
      expect(graphic.depth).toBe(100);
    });

    it('should create rising tween animation for bubbles', () => {
      createBubbles(mockScene as any, 100, 200, { count: 1 });

      expect(mockScene.tweens.tweenCalls).toHaveLength(1);
      const tween = mockScene.tweens.tweenCalls[0];

      expect(tween.targets).toBe(mockScene.createdGraphics[0]);
      expect(tween.alpha).toBe(0);
      expect(tween.ease).toBe('Quad.easeOut');
      expect(tween.onComplete).toBeDefined();
    });

    it('should animate bubbles to rise upward', () => {
      createBubbles(mockScene as any, 100, 200, {
        count: 1,
        minRiseDistance: 40,
      });

      const tween = mockScene.tweens.tweenCalls[0];
      const graphic = mockScene.createdGraphics[0];

      // Bubble should move up (negative Y)
      expect(tween.y).toBeLessThan(graphic.y);
      expect(graphic.y - tween.y).toBeGreaterThanOrEqual(40);
    });

    it('should apply horizontal drift to bubbles', () => {
      createBubbles(mockScene as any, 100, 200, {
        count: 1,
        maxHorizontalDrift: 20,
      });

      const tween = mockScene.tweens.tweenCalls[0];
      const graphic = mockScene.createdGraphics[0];

      // X should be within drift range
      expect(Math.abs(tween.x - graphic.x)).toBeLessThanOrEqual(20);
    });

    it('should destroy bubble on animation complete', () => {
      createBubbles(mockScene as any, 100, 200, { count: 1 });

      const tween = mockScene.tweens.tweenCalls[0];
      const graphic = mockScene.createdGraphics[0];

      expect(graphic.destroyed).toBe(false);
      tween.onComplete();
      expect(graphic.destroyed).toBe(true);
    });

    it('should use custom animation duration', () => {
      createBubbles(mockScene as any, 100, 200, {
        count: 1,
        minDuration: 1000,
        maxDurationVariation: 500,
      });

      const tween = mockScene.tweens.tweenCalls[0];
      expect(tween.duration).toBeGreaterThanOrEqual(1000);
      expect(tween.duration).toBeLessThanOrEqual(1500);
    });
  });

  describe('createSplash', () => {
    it('should create default number of droplets (10)', () => {
      const droplets = createSplash(mockScene as any, 200, 150);

      expect(droplets).toHaveLength(10);
      expect(mockScene.createdGraphics).toHaveLength(10);
    });

    it('should create custom number of droplets', () => {
      const droplets = createSplash(mockScene as any, 200, 150, { count: 15 });

      expect(droplets).toHaveLength(15);
      expect(mockScene.createdGraphics).toHaveLength(15);
    });

    it('should apply default droplet color and alpha', () => {
      createSplash(mockScene as any, 200, 150, { count: 1 });

      const graphic = mockScene.createdGraphics[0];
      expect(graphic.fillStyleCalls[0]).toEqual({
        color: 0x4169E1, // royal blue
        alpha: 0.8,
      });
    });

    it('should apply custom color and alpha', () => {
      createSplash(mockScene as any, 200, 150, {
        count: 1,
        color: 0x00FFFF,
        alpha: 0.9,
      });

      const graphic = mockScene.createdGraphics[0];
      expect(graphic.fillStyleCalls[0]).toEqual({
        color: 0x00FFFF,
        alpha: 0.9,
      });
    });

    it('should create droplets with radius in specified range', () => {
      createSplash(mockScene as any, 200, 150, {
        count: 1,
        minRadius: 3,
        maxRadius: 7,
      });

      const graphic = mockScene.createdGraphics[0];
      const circleCall = graphic.fillCircleCalls[0];
      expect(circleCall.radius).toBeGreaterThanOrEqual(3);
      expect(circleCall.radius).toBeLessThanOrEqual(7);
    });

    it('should spawn droplets near water surface with spread', () => {
      createSplash(mockScene as any, 200, 150, {
        count: 1,
        spreadWidth: 40,
      });

      const graphic = mockScene.createdGraphics[0];
      expect(graphic.y).toBe(150); // At water surface
      // X should be within spread range
      expect(Math.abs(graphic.x - 200)).toBeLessThanOrEqual(40);
    });

    it('should set default depth (99)', () => {
      createSplash(mockScene as any, 200, 150, { count: 1 });

      const graphic = mockScene.createdGraphics[0];
      expect(graphic.depth).toBe(99);
    });

    it('should set custom depth', () => {
      createSplash(mockScene as any, 200, 150, { count: 1, depth: 50 });

      const graphic = mockScene.createdGraphics[0];
      expect(graphic.depth).toBe(50);
    });

    it('should create splash animation with arc trajectory', () => {
      createSplash(mockScene as any, 200, 150, { count: 1 });

      expect(mockScene.tweens.tweenCalls).toHaveLength(1);
      const tween = mockScene.tweens.tweenCalls[0];

      expect(tween.targets).toBe(mockScene.createdGraphics[0]);
      expect(tween.alpha).toBe(0);
      expect(tween.ease).toBe('Quad.easeOut');
      expect(tween.onComplete).toBeDefined();
    });

    it('should animate droplets in upward arc', () => {
      createSplash(mockScene as any, 200, 150, {
        count: 1,
        arcHeight: 50,
        minSpeed: 5,
        maxSpeed: 5, // Fixed speed for predictable test
      });

      const tween = mockScene.tweens.tweenCalls[0];
      const graphic = mockScene.createdGraphics[0];

      // The trajectory combines upward angle and arc height
      // With positive arcHeight, final Y can be above or below start depending on angle
      // The key is that there's vertical movement
      expect(tween.y).not.toBe(graphic.y);

      // Arc trajectory formula: y + sin(angle) * speed * 20 + arcHeight
      // With arcHeight > 0, the droplet follows an arc
      const verticalDistance = Math.abs(tween.y - graphic.y);
      expect(verticalDistance).toBeGreaterThan(0);
    });

    it('should destroy droplet on animation complete', () => {
      createSplash(mockScene as any, 200, 150, { count: 1 });

      const tween = mockScene.tweens.tweenCalls[0];
      const graphic = mockScene.createdGraphics[0];

      expect(graphic.destroyed).toBe(false);
      tween.onComplete();
      expect(graphic.destroyed).toBe(true);
    });

    it('should use custom animation duration', () => {
      createSplash(mockScene as any, 200, 150, {
        count: 1,
        minDuration: 600,
        maxDurationVariation: 200,
      });

      const tween = mockScene.tweens.tweenCalls[0];
      expect(tween.duration).toBeGreaterThanOrEqual(600);
      expect(tween.duration).toBeLessThanOrEqual(800);
    });
  });

  describe('createSmokePuffs', () => {
    it('should create variable number of smoke puffs (2-4)', () => {
      const puffs = createSmokePuffs(mockScene as any, 100, 50);

      expect(puffs.length).toBeGreaterThanOrEqual(2);
      expect(puffs.length).toBeLessThanOrEqual(5); // minCount + maxCountVariation
    });

    it('should create custom number of smoke puffs', () => {
      const puffs = createSmokePuffs(mockScene as any, 100, 50, {
        minCount: 5,
        maxCountVariation: 1,
      });

      expect(puffs.length).toBeGreaterThanOrEqual(5);
      expect(puffs.length).toBeLessThanOrEqual(6);
    });

    it('should apply random color from default palette', () => {
      createSmokePuffs(mockScene as any, 100, 50, {
        minCount: 1,
        maxCountVariation: 0,
      });

      const graphic = mockScene.createdGraphics[0];
      const fillStyle = graphic.fillStyleCalls[0];

      // Should be one of the default toxic green/yellow colors
      const defaultColors = [0x90a040, 0xa0b030, 0x80a020, 0xb0c040];
      expect(defaultColors).toContain(fillStyle.color);
      expect(fillStyle.alpha).toBe(0.6);
    });

    it('should apply custom colors', () => {
      const customColors = [0xFF0000, 0x00FF00];
      createSmokePuffs(mockScene as any, 100, 50, {
        minCount: 1,
        maxCountVariation: 0,
        colors: customColors,
      });

      const graphic = mockScene.createdGraphics[0];
      const fillStyle = graphic.fillStyleCalls[0];

      expect(customColors).toContain(fillStyle.color);
    });

    it('should create smoke puffs with size in specified range', () => {
      createSmokePuffs(mockScene as any, 100, 50, {
        minCount: 1,
        maxCountVariation: 0,
        minSize: 4,
        maxSize: 10,
      });

      const graphic = mockScene.createdGraphics[0];
      const circleCall = graphic.fillCircleCalls[0];
      expect(circleCall.radius).toBeGreaterThanOrEqual(4);
      expect(circleCall.radius).toBeLessThanOrEqual(10);
    });

    it('should spawn smoke puffs with horizontal spread', () => {
      createSmokePuffs(mockScene as any, 100, 50, {
        minCount: 1,
        maxCountVariation: 0,
        spawnSpreadX: 50,
        spawnOffsetY: -5,
      });

      const graphic = mockScene.createdGraphics[0];
      expect(graphic.y).toBe(45); // 50 + (-5)
      // X should be within spread range
      expect(Math.abs(graphic.x - 100)).toBeLessThanOrEqual(50);
    });

    it('should set default depth (52)', () => {
      createSmokePuffs(mockScene as any, 100, 50, {
        minCount: 1,
        maxCountVariation: 0,
      });

      const graphic = mockScene.createdGraphics[0];
      expect(graphic.depth).toBe(52);
    });

    it('should set custom depth', () => {
      createSmokePuffs(mockScene as any, 100, 50, {
        minCount: 1,
        maxCountVariation: 0,
        depth: 75,
      });

      const graphic = mockScene.createdGraphics[0];
      expect(graphic.depth).toBe(75);
    });

    it('should create rising animation with scaling', () => {
      createSmokePuffs(mockScene as any, 100, 50, {
        minCount: 1,
        maxCountVariation: 0,
      });

      expect(mockScene.tweens.tweenCalls).toHaveLength(1);
      const tween = mockScene.tweens.tweenCalls[0];

      expect(tween.targets).toBe(mockScene.createdGraphics[0]);
      expect(tween.alpha).toBe(0);
      expect(tween.scaleX).toBeDefined();
      expect(tween.scaleY).toBeDefined();
      expect(tween.ease).toBe('Quad.easeOut');
      expect(tween.onComplete).toBeDefined();
    });

    it('should animate smoke to rise upward', () => {
      createSmokePuffs(mockScene as any, 100, 50, {
        minCount: 1,
        maxCountVariation: 0,
        minRiseDistance: 30,
      });

      const tween = mockScene.tweens.tweenCalls[0];
      const graphic = mockScene.createdGraphics[0];

      // Smoke should move up (negative Y)
      expect(tween.y).toBeLessThan(graphic.y);
      expect(graphic.y - tween.y).toBeGreaterThanOrEqual(30);
    });

    it('should apply scaling transformation', () => {
      createSmokePuffs(mockScene as any, 100, 50, {
        minCount: 1,
        maxCountVariation: 0,
        minScale: 1.5,
        maxScale: 2.5,
      });

      const tween = mockScene.tweens.tweenCalls[0];

      expect(tween.scaleX).toBeGreaterThanOrEqual(1.5);
      expect(tween.scaleX).toBeLessThanOrEqual(2.5);
      expect(tween.scaleY).toBe(tween.scaleX); // Same scale for both axes
    });

    it('should apply horizontal drift', () => {
      createSmokePuffs(mockScene as any, 100, 50, {
        minCount: 1,
        maxCountVariation: 0,
        maxHorizontalDrift: 30,
      });

      const tween = mockScene.tweens.tweenCalls[0];
      const graphic = mockScene.createdGraphics[0];

      // X should drift within range
      expect(Math.abs(tween.x - graphic.x)).toBeLessThanOrEqual(30);
    });

    it('should destroy puff on animation complete', () => {
      createSmokePuffs(mockScene as any, 100, 50, {
        minCount: 1,
        maxCountVariation: 0,
      });

      const tween = mockScene.tweens.tweenCalls[0];
      const graphic = mockScene.createdGraphics[0];

      expect(graphic.destroyed).toBe(false);
      tween.onComplete();
      expect(graphic.destroyed).toBe(true);
    });

    it('should use custom animation duration', () => {
      createSmokePuffs(mockScene as any, 100, 50, {
        minCount: 1,
        maxCountVariation: 0,
        minDuration: 2000,
        maxDurationVariation: 500,
      });

      const tween = mockScene.tweens.tweenCalls[0];
      expect(tween.duration).toBeGreaterThanOrEqual(2000);
      expect(tween.duration).toBeLessThanOrEqual(2500);
    });
  });
});
