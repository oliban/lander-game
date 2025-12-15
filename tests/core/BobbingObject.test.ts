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

import { BobbingObject, BobbingObjectConfig } from '../../src/core/base/BobbingObject';

// Concrete implementation for testing
class TestBobbingObject extends BobbingObject {
  public onExplodeCalled = false;

  constructor(scene: any, x: number, y: number, config: BobbingObjectConfig) {
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

describe('BobbingObject', () => {
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    mockScene = createMockScene();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should store baseY from initial y position', () => {
      const obj = new TestBobbingObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
      });

      expect(obj.baseY).toBe(200);
    });

    it('should use default bobbing config when not specified', () => {
      const obj = new TestBobbingObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
      });

      // Verify defaults by testing behavior
      obj.updateBobbing(0);
      expect(obj.y).toBe(200); // sin(0) = 0, so no offset
    });
  });

  describe('updateBobbing', () => {
    it('should update y position based on wave offset', () => {
      const obj = new TestBobbingObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
        bobbing: {
          bobAmplitude: 10,
          bobFrequency: 1,
        },
      });

      // At wave offset π/2, sin = 1, so y should be baseY + amplitude
      obj.updateBobbing(Math.PI / 2);
      expect(obj.y).toBeCloseTo(210, 5);
    });

    it('should update rotation based on wave offset', () => {
      const obj = new TestBobbingObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
        bobbing: {
          rotationAmplitude: 0.1,
          rotationFrequency: 1,
          rotationPhaseOffset: 0,
        },
      });

      // At wave offset π/2, sin = 1, so rotation should be amplitude
      obj.updateBobbing(Math.PI / 2);
      expect(obj.rotation).toBeCloseTo(0.1, 5);
    });

    it('should not update if destroyed', () => {
      const obj = new TestBobbingObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
        bobbing: {
          bobAmplitude: 10,
          bobFrequency: 1,
        },
      });

      obj.explode();
      obj.y = 200; // Reset position
      obj.updateBobbing(Math.PI / 2);

      expect(obj.y).toBe(200); // Should not have changed
    });

    it('should use custom bobbing config', () => {
      const obj = new TestBobbingObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
        bobbing: {
          bobAmplitude: 20,
          bobFrequency: 2,
          rotationAmplitude: 0.2,
          rotationFrequency: 0.5,
          rotationPhaseOffset: 0,
        },
      });

      // At wave offset π/4, sin(π/4 * 2) = sin(π/2) = 1
      obj.updateBobbing(Math.PI / 4);
      expect(obj.y).toBeCloseTo(220, 5); // 200 + 20
    });

    it('should oscillate around baseY', () => {
      const obj = new TestBobbingObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
        bobbing: {
          bobAmplitude: 10,
          bobFrequency: 1,
        },
      });

      // Track min and max y over a full cycle
      let minY = Infinity;
      let maxY = -Infinity;

      for (let i = 0; i < 100; i++) {
        const waveOffset = (i / 100) * Math.PI * 2;
        obj.updateBobbing(waveOffset);
        minY = Math.min(minY, obj.y);
        maxY = Math.max(maxY, obj.y);
      }

      expect(minY).toBeCloseTo(190, 0); // baseY - amplitude
      expect(maxY).toBeCloseTo(210, 0); // baseY + amplitude
    });
  });

  describe('inherits from DestructibleObject', () => {
    it('should have isDestroyed property', () => {
      const obj = new TestBobbingObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
      });

      expect(obj.isDestroyed).toBe(false);
    });

    it('should have pointValue property', () => {
      const obj = new TestBobbingObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 300,
        name: 'Test Object',
      });

      expect(obj.pointValue).toBe(300);
    });

    it('should have explode method', () => {
      const obj = new TestBobbingObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
      });

      const result = obj.explode();

      expect(result).toEqual({
        name: 'Test Object',
        points: 100,
      });
      expect(obj.isDestroyed).toBe(true);
    });
  });

  describe('inherits from GameObject', () => {
    it('should have getCollisionBounds method', () => {
      const obj = new TestBobbingObject(mockScene as any, 100, 200, {
        collisionWidth: 50,
        collisionHeight: 30,
        pointValue: 100,
        name: 'Test Object',
      });

      const bounds = obj.getCollisionBounds();

      expect(bounds).toEqual({
        x: 75,
        y: 170,
        width: 50,
        height: 30,
      });
    });
  });
});
