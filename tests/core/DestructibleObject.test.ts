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

import { DestructibleObject, DestructibleObjectConfig } from '../../src/core/base/DestructibleObject';

// Concrete implementation for testing
class TestDestructibleObject extends DestructibleObject {
  public onExplodeCalled = false;

  constructor(scene: any, x: number, y: number, config: DestructibleObjectConfig) {
    super(scene, x, y, config);
  }

  protected onExplode(): void {
    this.onExplodeCalled = true;
  }
}

function createMockScene() {
  return {
    add: {
      existing: vi.fn(),
    },
  };
}

describe('DestructibleObject', () => {
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    mockScene = createMockScene();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with isDestroyed = false', () => {
      const obj = new TestDestructibleObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
      });

      expect(obj.isDestroyed).toBe(false);
    });

    it('should set pointValue from config', () => {
      const obj = new TestDestructibleObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 250,
        name: 'Test Object',
      });

      expect(obj.pointValue).toBe(250);
    });
  });

  describe('explode', () => {
    it('should set isDestroyed to true', () => {
      const obj = new TestDestructibleObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
      });

      obj.explode();

      expect(obj.isDestroyed).toBe(true);
    });

    it('should set visible to false', () => {
      const obj = new TestDestructibleObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
      });

      obj.explode();

      expect(obj.visible).toBe(false);
    });

    it('should call onExplode', () => {
      const obj = new TestDestructibleObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
      });

      obj.explode();

      expect(obj.onExplodeCalled).toBe(true);
    });

    it('should return destruction result with name and points', () => {
      const obj = new TestDestructibleObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 150,
        name: 'My Object',
      });

      const result = obj.explode();

      expect(result).toEqual({
        name: 'My Object',
        points: 150,
      });
    });

    it('should return 0 points if already destroyed', () => {
      const obj = new TestDestructibleObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 150,
        name: 'My Object',
      });

      obj.explode(); // First explosion
      const result = obj.explode(); // Second explosion

      expect(result).toEqual({
        name: 'My Object',
        points: 0,
      });
    });

    it('should not call onExplode if already destroyed', () => {
      const obj = new TestDestructibleObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
      });

      obj.explode();
      obj.onExplodeCalled = false; // Reset
      obj.explode();

      expect(obj.onExplodeCalled).toBe(false);
    });
  });
});
