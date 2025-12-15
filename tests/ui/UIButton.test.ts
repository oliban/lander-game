import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Phaser globally BEFORE importing modules that use it
// The factory must be self-contained (no external references)
vi.mock('phaser', () => {
  // Define MockRectangle inside the factory
  class MockRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    constructor(x: number, y: number, width: number, height: number) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }
    static Contains = () => true;
  }

  return {
    default: {
      Geom: {
        Rectangle: MockRectangle,
      },
    },
    Geom: {
      Rectangle: MockRectangle,
    },
  };
});

// Mock Phaser.GameObjects.Graphics
class MockGraphics {
  x: number = 0;
  y: number = 0;

  clear() { return this; }
  fillStyle(_color: number, _alpha: number) { return this; }
  fillRoundedRect(_x: number, _y: number, _w: number, _h: number, _r: number) { return this; }
  lineStyle(_width: number, _color: number) { return this; }
  strokeRoundedRect(_x: number, _y: number, _w: number, _h: number, _r: number) { return this; }
  destroy() {}
}

// Mock Phaser.GameObjects.Text
class MockText {
  x: number = 0;
  y: number = 0;
  text: string = '';
  originX: number = 0;
  originY: number = 0;

  constructor(_scene: any, _x: number, _y: number, text: string, _style: any) {
    this.text = text;
  }

  setOrigin(x: number, y: number) {
    this.originX = x;
    this.originY = y;
    return this;
  }

  setText(text: string) {
    this.text = text;
    return this;
  }

  destroy() {}
}

// Mock Phaser.GameObjects.Container
class MockContainer {
  x: number;
  y: number;
  children: any[] = [];
  visible: boolean = true;
  alpha: number = 1;
  depth: number = 0;
  interactive: boolean = false;
  eventHandlers: Map<string, Function[]> = new Map();

  constructor(_scene: any, x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(items: any | any[]) {
    if (Array.isArray(items)) {
      this.children.push(...items);
    } else {
      this.children.push(items);
    }
    return this;
  }

  setInteractive(_shape: any, _callback: any) {
    this.interactive = true;
    return this;
  }

  disableInteractive() {
    this.interactive = false;
    return this;
  }

  on(event: string, callback: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
    return this;
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(...args));
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    return this;
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }

  setDepth(depth: number) {
    this.depth = depth;
    return this;
  }

  setAlpha(alpha: number) {
    this.alpha = alpha;
    return this;
  }

  destroy() {}
}

// Create mock scene
function createMockScene() {
  return {
    add: {
      container: vi.fn((x: number, y: number) => new MockContainer(null, x, y)),
      graphics: vi.fn(() => new MockGraphics()),
      text: vi.fn((x: number, y: number, text: string, style: any) => new MockText(null, x, y, text, style)),
    },
  };
}

// Now import the modules
import { UIButton, createGreenButton, createColoredButton } from '../../src/ui/UIButton';
import { BUTTON_SIZES } from '../../src/ui/UIStyles';

describe('UIButton', () => {
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    mockScene = createMockScene();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a button at the specified position', () => {
      new UIButton(mockScene as any, {
        x: 100,
        y: 200,
        label: 'Test',
        onClick: vi.fn(),
      });

      expect(mockScene.add.container).toHaveBeenCalledWith(100, 200);
    });

    it('should create graphics and text elements', () => {
      new UIButton(mockScene as any, {
        x: 100,
        y: 200,
        label: 'Test Button',
        onClick: vi.fn(),
      });

      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalledWith(0, 0, 'Test Button', expect.any(Object));
    });

    it('should use default green color when no color specified', () => {
      new UIButton(mockScene as any, {
        x: 100,
        y: 200,
        label: 'Test',
        onClick: vi.fn(),
      });

      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should use custom color when specified', () => {
      new UIButton(mockScene as any, {
        x: 100,
        y: 200,
        label: 'Test',
        onClick: vi.fn(),
        color: 0xFF0000,
      });

      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should use default LARGE size dimensions', () => {
      new UIButton(mockScene as any, {
        x: 100,
        y: 200,
        label: 'Test',
        onClick: vi.fn(),
      });

      expect(mockScene.add.text).toHaveBeenCalledWith(
        0, 0, 'Test',
        expect.objectContaining({ fontSize: '24px' })
      );
    });

    it('should use custom dimensions when specified', () => {
      new UIButton(mockScene as any, {
        x: 100,
        y: 200,
        label: 'Test',
        onClick: vi.fn(),
        width: 300,
        height: 60,
        fontSize: '30px',
      });

      expect(mockScene.add.text).toHaveBeenCalledWith(
        0, 0, 'Test',
        expect.objectContaining({ fontSize: '30px' })
      );
    });
  });

  describe('methods', () => {
    it('setVisible should update container visibility', () => {
      const button = new UIButton(mockScene as any, {
        x: 100,
        y: 200,
        label: 'Test',
        onClick: vi.fn(),
      });

      const container = button.getContainer() as unknown as MockContainer;
      button.setVisible(false);
      expect(container.visible).toBe(false);

      button.setVisible(true);
      expect(container.visible).toBe(true);
    });

    it('setPosition should update container position', () => {
      const button = new UIButton(mockScene as any, {
        x: 100,
        y: 200,
        label: 'Test',
        onClick: vi.fn(),
      });

      const container = button.getContainer() as unknown as MockContainer;
      button.setPosition(300, 400);
      expect(container.x).toBe(300);
      expect(container.y).toBe(400);
    });

    it('setDepth should update container depth', () => {
      const button = new UIButton(mockScene as any, {
        x: 100,
        y: 200,
        label: 'Test',
        onClick: vi.fn(),
      });

      const container = button.getContainer() as unknown as MockContainer;
      button.setDepth(50);
      expect(container.depth).toBe(50);
    });

    it('setEnabled(false) should disable interactivity and reduce alpha', () => {
      const button = new UIButton(mockScene as any, {
        x: 100,
        y: 200,
        label: 'Test',
        onClick: vi.fn(),
      });

      const container = button.getContainer() as unknown as MockContainer;
      button.setEnabled(false);
      expect(container.interactive).toBe(false);
      expect(container.alpha).toBe(0.5);
    });

    it('setEnabled(true) should enable interactivity and restore alpha', () => {
      const button = new UIButton(mockScene as any, {
        x: 100,
        y: 200,
        label: 'Test',
        onClick: vi.fn(),
      });

      const container = button.getContainer() as unknown as MockContainer;
      button.setEnabled(false);
      button.setEnabled(true);
      expect(container.interactive).toBe(true);
      expect(container.alpha).toBe(1);
    });
  });

  describe('events', () => {
    it('should call onClick when clicked', () => {
      const onClick = vi.fn();
      const button = new UIButton(mockScene as any, {
        x: 100,
        y: 200,
        label: 'Test',
        onClick,
      });

      const container = button.getContainer() as unknown as MockContainer;
      container.emit('pointerdown');
      expect(onClick).toHaveBeenCalled();
    });
  });
});

describe('createGreenButton', () => {
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    mockScene = createMockScene();
  });

  it('should create a button with green color', () => {
    const onClick = vi.fn();
    createGreenButton(mockScene as any, 100, 200, 'Green Button', onClick);

    expect(mockScene.add.container).toHaveBeenCalledWith(100, 200);
    expect(mockScene.add.text).toHaveBeenCalledWith(0, 0, 'Green Button', expect.any(Object));
  });

  it('should support different sizes', () => {
    const onClick = vi.fn();

    createGreenButton(mockScene as any, 100, 200, 'Large', onClick, 'large');
    expect(mockScene.add.text).toHaveBeenLastCalledWith(
      0, 0, 'Large',
      expect.objectContaining({ fontSize: BUTTON_SIZES.LARGE.fontSize })
    );

    createGreenButton(mockScene as any, 100, 200, 'Medium', onClick, 'medium');
    expect(mockScene.add.text).toHaveBeenLastCalledWith(
      0, 0, 'Medium',
      expect.objectContaining({ fontSize: BUTTON_SIZES.MEDIUM.fontSize })
    );

    createGreenButton(mockScene as any, 100, 200, 'Small', onClick, 'small');
    expect(mockScene.add.text).toHaveBeenLastCalledWith(
      0, 0, 'Small',
      expect.objectContaining({ fontSize: BUTTON_SIZES.SMALL.fontSize })
    );
  });
});

describe('createColoredButton', () => {
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    mockScene = createMockScene();
  });

  it('should create a button with custom color', () => {
    const onClick = vi.fn();
    createColoredButton(mockScene as any, 100, 200, 'Red Button', 0xFF0000, onClick);

    expect(mockScene.add.container).toHaveBeenCalledWith(100, 200);
    expect(mockScene.add.text).toHaveBeenCalledWith(0, 0, 'Red Button', expect.any(Object));
  });

  it('should default to medium size', () => {
    const onClick = vi.fn();
    createColoredButton(mockScene as any, 100, 200, 'Button', 0xFF0000, onClick);

    expect(mockScene.add.text).toHaveBeenCalledWith(
      0, 0, 'Button',
      expect.objectContaining({ fontSize: BUTTON_SIZES.MEDIUM.fontSize })
    );
  });
});
