import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Phaser
vi.mock('phaser', () => {
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
      },
    },
    GameObjects: {
      Container: MockContainer,
    },
  };
});

import { GameObject, GameObjectConfig, BoundsAlignment } from '../../src/core/base/GameObject';

// Concrete implementation for testing
class TestGameObject extends GameObject {
  constructor(scene: any, x: number, y: number, config: GameObjectConfig) {
    super(scene, x, y, config);
  }
}

function createMockScene() {
  return {
    add: {
      existing: vi.fn(),
    },
  };
}

describe('GameObject', () => {
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    mockScene = createMockScene();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should set position and collision properties', () => {
      const obj = new TestGameObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
      });

      expect(obj.x).toBe(100);
      expect(obj.y).toBe(200);
    });

    it('should add itself to the scene', () => {
      new TestGameObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
      });

      expect(mockScene.add.existing).toHaveBeenCalled();
    });
  });

  describe('getCollisionBounds', () => {
    it('should return top-aligned bounds by default', () => {
      const obj = new TestGameObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
      });

      const bounds = obj.getCollisionBounds();

      expect(bounds).toEqual({
        x: 75, // 100 - 50/2
        y: 170, // 200 - 30
        width: 50,
        height: 30,
      });
    });

    it('should return center-aligned bounds when specified', () => {
      const obj = new TestGameObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        boundsAlignment: 'center',
      });

      const bounds = obj.getCollisionBounds();

      expect(bounds).toEqual({
        x: 75, // 100 - 50/2
        y: 185, // 200 - 30/2
        width: 50,
        height: 30,
      });
    });

    it('should include extra height when specified', () => {
      const obj = new TestGameObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        extraHeight: 20,
      });

      const bounds = obj.getCollisionBounds();

      expect(bounds).toEqual({
        x: 75,
        y: 170,
        width: 50,
        height: 50, // 30 + 20
      });
    });

    it('should update bounds when position changes', () => {
      const obj = new TestGameObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
      });

      obj.x = 150;
      obj.y = 250;

      const bounds = obj.getCollisionBounds();

      expect(bounds).toEqual({
        x: 125, // 150 - 50/2
        y: 220, // 250 - 30
        width: 50,
        height: 30,
      });
    });
  });
});
