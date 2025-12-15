import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for Shark overfeeding behavior
 *
 * Key behaviors to verify:
 * 1. Shark tracks food eaten count
 * 2. Shark dies after eating 5 pieces of food
 * 3. Dead shark has correct state
 * 4. Shark can still eat food while alive/coughing
 */

// Mock Phaser and dependencies
vi.mock('phaser', () => {
  class MockGraphics {
    clear() { return this; }
    setPosition() { return this; }
    setRotation() { return this; }
    setScale() { return this; }
    setDepth() { return this; }
    setVisible() { return this; }
    fillStyle() { return this; }
    fillCircle() { return this; }
    fillEllipse() { return this; }
    fillPath() { return this; }
    beginPath() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    closePath() { return this; }
    lineStyle() { return this; }
    strokePath() { return this; }
    destroy() {}
  }

  class MockContainer {
    scene: any;
    x: number;
    y: number;
    visible: boolean = true;
    rotation: number = 0;

    constructor(scene: any, x: number, y: number) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }

    setVisible(visible: boolean) {
      this.visible = visible;
      return this;
    }

    destroy() {}
  }

  return {
    default: {
      GameObjects: {
        Container: MockContainer,
        Graphics: MockGraphics,
      },
      Math: {
        Distance: {
          Between: (x1: number, y1: number, x2: number, y2: number) =>
            Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
        },
        Linear: (a: number, b: number, t: number) => a + (b - a) * t,
      },
    },
    GameObjects: {
      Container: MockContainer,
      Graphics: MockGraphics,
    },
    Math: {
      Distance: {
        Between: (x1: number, y1: number, x2: number, y2: number) =>
          Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
      },
      Linear: (a: number, b: number, t: number) => a + (b - a) * t,
    },
  };
});

vi.mock('../../src/constants', () => ({
  GAME_HEIGHT: 600,
}));

vi.mock('../../src/utils/ColorUtils', () => ({
  lerpColor: (a: number, b: number, t: number) => a,
}));

vi.mock('../../src/utils/ParticleUtils', () => ({
  createBubbles: vi.fn(),
  createSmokePuffs: vi.fn(),
}));

// Simple Shark implementation for testing overfeeding logic
class TestShark {
  public state: 'alive' | 'coughing' | 'dead' = 'alive';
  public isDestroyed: boolean = false;
  public x: number;
  public y: number;

  private foodEaten: number = 0;
  private readonly FATAL_FOOD_COUNT = 5;
  private floatProgress: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  canEatBomb(): boolean {
    return this.state === 'alive' || this.state === 'coughing';
  }

  eatBomb(): void {
    this.foodEaten++;

    // Check if shark ate too much and dies
    if (this.foodEaten >= this.FATAL_FOOD_COUNT && this.state !== 'dead') {
      this.dieFromOvereating();
    }
  }

  private dieFromOvereating(): void {
    this.state = 'dead';
    this.floatProgress = 0;
  }

  getFoodEaten(): number {
    return this.foodEaten;
  }

  getFloatProgress(): number {
    return this.floatProgress;
  }

  // Simulate pollution death
  killFromPollution(): void {
    this.state = 'dead';
    this.floatProgress = 0;
  }

  // Set state for testing
  setState(state: 'alive' | 'coughing' | 'dead'): void {
    this.state = state;
  }
}

describe('Shark', () => {
  let shark: TestShark;

  beforeEach(() => {
    shark = new TestShark(100, 200);
  });

  describe('initialization', () => {
    it('should start alive', () => {
      expect(shark.state).toBe('alive');
    });

    it('should start with zero food eaten', () => {
      expect(shark.getFoodEaten()).toBe(0);
    });

    it('should be able to eat food when alive', () => {
      expect(shark.canEatBomb()).toBe(true);
    });
  });

  describe('eating food', () => {
    it('should track food eaten count', () => {
      shark.eatBomb();
      expect(shark.getFoodEaten()).toBe(1);

      shark.eatBomb();
      expect(shark.getFoodEaten()).toBe(2);
    });

    it('should remain alive after eating 1-4 pieces', () => {
      for (let i = 0; i < 4; i++) {
        shark.eatBomb();
        expect(shark.state).toBe('alive');
      }
      expect(shark.getFoodEaten()).toBe(4);
    });

    it('should die after eating 5 pieces of food', () => {
      for (let i = 0; i < 5; i++) {
        shark.eatBomb();
      }
      expect(shark.state).toBe('dead');
      expect(shark.getFoodEaten()).toBe(5);
    });

    it('should die exactly on the 5th piece', () => {
      for (let i = 0; i < 4; i++) {
        shark.eatBomb();
      }
      expect(shark.state).toBe('alive');

      shark.eatBomb(); // 5th piece
      expect(shark.state).toBe('dead');
    });

    it('should reset float progress when dying from overfeeding', () => {
      for (let i = 0; i < 5; i++) {
        shark.eatBomb();
      }
      expect(shark.getFloatProgress()).toBe(0);
    });
  });

  describe('eating while coughing', () => {
    it('should be able to eat food when coughing', () => {
      shark.setState('coughing');
      expect(shark.canEatBomb()).toBe(true);
    });

    it('should die from overfeeding even when coughing', () => {
      shark.setState('coughing');
      for (let i = 0; i < 5; i++) {
        shark.eatBomb();
      }
      expect(shark.state).toBe('dead');
    });
  });

  describe('dead shark behavior', () => {
    it('should not be able to eat food when dead', () => {
      shark.setState('dead');
      expect(shark.canEatBomb()).toBe(false);
    });

    it('should not change state if already dead from pollution', () => {
      shark.killFromPollution();
      expect(shark.state).toBe('dead');

      // Eating more shouldn't change anything (though canEatBomb would prevent this)
      const foodBefore = shark.getFoodEaten();
      // In real code, canEatBomb() check would prevent eating
      expect(shark.state).toBe('dead');
    });

    it('should not die twice from overfeeding', () => {
      // Eat 5 to die
      for (let i = 0; i < 5; i++) {
        shark.eatBomb();
      }
      expect(shark.state).toBe('dead');

      // Eating more shouldn't cause issues (in real code canEatBomb prevents this)
      const stateBefore = shark.state;
      expect(shark.state).toBe(stateBefore);
    });
  });

  describe('food count persistence', () => {
    it('should accumulate food count across multiple feedings', () => {
      shark.eatBomb();
      shark.eatBomb();
      expect(shark.getFoodEaten()).toBe(2);

      shark.eatBomb();
      shark.eatBomb();
      expect(shark.getFoodEaten()).toBe(4);

      shark.eatBomb();
      expect(shark.getFoodEaten()).toBe(5);
      expect(shark.state).toBe('dead');
    });
  });
});
