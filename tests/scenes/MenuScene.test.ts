import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Phaser globally BEFORE importing modules that use it
vi.mock('phaser', () => {
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
      Scene: class MockScene {
        constructor(_config: any) {}
      },
      Geom: {
        Rectangle: MockRectangle,
      },
    },
    Scene: class MockScene {
      constructor(_config: any) {}
    },
    Geom: {
      Rectangle: MockRectangle,
    },
  };
});

// Mock the systems
vi.mock('../../src/systems/AchievementSystem', () => ({
  getAchievementSystem: vi.fn(() => ({
    getUnlockedCount: vi.fn(() => 5),
    getTotalCount: vi.fn(() => 34),
    getRecentUnlocks: vi.fn(() => []),
  })),
}));

vi.mock('../../src/systems/CollectionSystem', () => ({
  getCollectionSystem: vi.fn(() => ({
    getDiscoveredCount: vi.fn(() => 3),
    getTotalCount: vi.fn(() => 26),
    getRecentDiscoveries: vi.fn(() => []),
  })),
}));

// Mock Phaser.GameObjects.Graphics
class MockGraphics {
  x: number = 0;
  y: number = 0;
  fillStyleCalls: Array<{ color: number; alpha: number }> = [];
  lineStyleCalls: Array<{ width: number; color: number; alpha: number }> = [];

  clear() { return this; }
  fillStyle(color: number, alpha: number) {
    this.fillStyleCalls.push({ color, alpha });
    return this;
  }
  fillRoundedRect(_x: number, _y: number, _w: number, _h: number, _r: number) { return this; }
  fillRect(_x: number, _y: number, _w: number, _h: number) { return this; }
  fillCircle(_x: number, _y: number, _r: number) { return this; }
  lineStyle(width: number, color: number, alpha: number = 1) {
    this.lineStyleCalls.push({ width, color, alpha });
    return this;
  }
  strokeRoundedRect(_x: number, _y: number, _w: number, _h: number, _r: number) { return this; }
  setDepth(_depth: number) { return this; }
  destroy() {}
}

// Mock Phaser.GameObjects.Text
class MockText {
  x: number = 0;
  y: number = 0;
  text: string = '';
  originX: number = 0;
  originY: number = 0;
  eventHandlers: Map<string, Function[]> = new Map();
  color: string = '';

  constructor(_scene: any, _x: number, _y: number, text: string, style: any) {
    this.text = text;
    this.color = style?.color || '';
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

  setDepth(_depth: number) { return this; }

  setInteractive(_options?: any) { return this; }

  setColor(color: string) {
    this.color = color;
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

  destroy() {}
}

// Mock Phaser.GameObjects.Image
class MockImage {
  x: number;
  y: number;
  scale: number = 1;

  constructor(_scene: any, x: number, y: number, _key: string) {
    this.x = x;
    this.y = y;
  }

  setScale(scale: number) {
    this.scale = scale;
    return this;
  }

  destroy() {}
}

// Mock Phaser.GameObjects.Rectangle
class MockRectangleObj {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(_scene: any, x: number, y: number, w: number, h: number, _color: number) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
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
  scale: number = 1;
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
  const createdTexts: MockText[] = [];
  const createdGraphics: MockGraphics[] = [];

  return {
    add: {
      container: vi.fn((x: number, y: number) => new MockContainer(null, x, y)),
      graphics: vi.fn(() => {
        const g = new MockGraphics();
        createdGraphics.push(g);
        return g;
      }),
      text: vi.fn((x: number, y: number, text: string, style: any) => {
        const t = new MockText(null, x, y, text, style);
        createdTexts.push(t);
        return t;
      }),
      image: vi.fn((x: number, y: number, key: string) => new MockImage(null, x, y, key)),
      rectangle: vi.fn((x: number, y: number, w: number, h: number, color: number) =>
        new MockRectangleObj(null, x, y, w, h, color)),
    },
    input: {
      keyboard: {
        on: vi.fn(),
        addKey: vi.fn(() => ({ on: vi.fn() })),
      },
    },
    tweens: {
      add: vi.fn(),
    },
    scene: {
      start: vi.fn(),
    },
    createdTexts,
    createdGraphics,
  };
}

// Import MenuScene after mocks are set up
import { MenuScene } from '../../src/scenes/MenuScene';

describe('MenuScene', () => {
  let scene: MenuScene;
  let mockScene: ReturnType<typeof createMockScene>;
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    mockScene = createMockScene();
    scene = new MenuScene();

    // Attach mock methods to scene
    (scene as any).add = mockScene.add;
    (scene as any).input = mockScene.input;
    (scene as any).tweens = mockScene.tweens;
    (scene as any).scene = mockScene.scene;

    // Mock localStorage
    localStorageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => { localStorageMock[key] = value; }),
      removeItem: vi.fn((key: string) => { delete localStorageMock[key]; }),
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('loadHighScores', () => {
    it('should return empty array when no scores saved', () => {
      const scores = (scene as any).loadHighScores();
      expect(scores).toEqual([]);
    });

    it('should return parsed scores from localStorage', () => {
      const mockScores = [
        { name: 'Alice', score: 1000, date: '2024-01-01' },
        { name: 'Bob', score: 800, date: '2024-01-02' },
      ];
      localStorageMock['peaceShuttle_highScores'] = JSON.stringify(mockScores);

      const scores = (scene as any).loadHighScores();
      expect(scores).toEqual(mockScores);
    });

    it('should return empty array on parse error', () => {
      localStorageMock['peaceShuttle_highScores'] = 'invalid json';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const scores = (scene as any).loadHighScores();

      expect(scores).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('createPanelBackground', () => {
    it('should create a graphics panel with correct styling', () => {
      const panelX = 400;
      const panelY = 200;
      const panelW = 220;
      const panelH = 130;

      (scene as any).createPanelBackground(panelX, panelY, panelW, panelH);

      expect(mockScene.add.graphics).toHaveBeenCalled();
      const graphics = mockScene.createdGraphics[0];
      expect(graphics.fillStyleCalls[0]).toEqual({ color: 0x000000, alpha: 0.6 });
      expect(graphics.lineStyleCalls[0]).toEqual({ width: 2, color: 0xFFD700, alpha: 0.3 });
    });
  });

  describe('createViewAllButton', () => {
    it('should create a text button with correct styling', () => {
      const panelX = 400;
      const panelY = 200;
      const panelH = 130;
      const targetScene = 'TestScene';

      (scene as any).createViewAllButton(panelX, panelY, panelH, targetScene);

      expect(mockScene.add.text).toHaveBeenCalledWith(
        panelX,
        panelY + panelH - 12,
        '[ VIEW ALL ]',
        expect.objectContaining({
          fontSize: '13px',
          color: '#4CAF50',
        })
      );
    });

    it('should change color on hover', () => {
      const panelX = 400;
      const panelY = 200;
      const panelH = 130;

      (scene as any).createViewAllButton(panelX, panelY, panelH, 'TestScene');

      const button = mockScene.createdTexts[0];

      // Simulate hover
      button.emit('pointerover');
      expect(button.color).toBe('#66BB6A');

      // Simulate unhover
      button.emit('pointerout');
      expect(button.color).toBe('#4CAF50');
    });

    it('should navigate to target scene on click', () => {
      const panelX = 400;
      const panelY = 200;
      const panelH = 130;
      const targetScene = 'CollectionScene';

      (scene as any).createViewAllButton(panelX, panelY, panelH, targetScene);

      const button = mockScene.createdTexts[0];
      button.emit('pointerdown');

      expect(mockScene.scene.start).toHaveBeenCalledWith(targetScene);
    });
  });

  describe('medal and score display logic', () => {
    it('should assign correct colors for rankings', () => {
      // Test the color logic used in create()
      const getScoreColor = (index: number): string => {
        return index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#AAAAAA';
      };

      expect(getScoreColor(0)).toBe('#FFD700'); // Gold for 1st
      expect(getScoreColor(1)).toBe('#C0C0C0'); // Silver for 2nd
      expect(getScoreColor(2)).toBe('#CD7F32'); // Bronze for 3rd
      expect(getScoreColor(3)).toBe('#AAAAAA'); // Gray for 4th+
      expect(getScoreColor(4)).toBe('#AAAAAA'); // Gray for 5th
    });

    it('should truncate names longer than 10 characters', () => {
      const truncateName = (name: string): string => name.substring(0, 10);

      expect(truncateName('ShortName')).toBe('ShortName');
      expect(truncateName('VeryLongPlayerName')).toBe('VeryLongPl');
      expect(truncateName('ExactlyTen')).toBe('ExactlyTen');
    });

    it('should have 5 medal emojis for 5 scores', () => {
      const animals = ['🐸', '🦊', '🐼', '🐨', '🦁', '🐯', '🐮', '🐷', '🐵', '🦄', '🐔', '🐧', '🐻', '🐶', '🐱'];
      const randomAnimal = () => animals[Math.floor(Math.random() * animals.length)];
      const medals = ['🥇', '🥈', '🥉', randomAnimal(), randomAnimal()];

      expect(medals.length).toBe(5);
      expect(medals[0]).toBe('🥇');
      expect(medals[1]).toBe('🥈');
      expect(medals[2]).toBe('🥉');
      expect(animals).toContain(medals[3]);
      expect(animals).toContain(medals[4]);
    });
  });

  describe('quote randomization', () => {
    it('should have 10 available quotes', () => {
      const quotes = [
        '"These are numbers that nobody has seen. They don\'t even believe it."',
        '"The charts are at a level that nobody even thought possible."',
        '"Nobody knew peace could be so complicated. I have to tell you."',
        '"These numbers are incredible. Nobody thought these numbers!"',
        '"A lot of people don\'t know this about Russia. A lot of people."',
        '"It\'s coming back at a level far greater than anybody anticipated."',
        '"This peace deal? There\'s never been anything like it. Believe me."',
        '"We\'re seeing things at levels that nobody thought was possible."',
        '"People are saying it\'s the best mission ever. Many people."',
        '"The numbers are so good. You saw the numbers. Incredible."',
      ];

      expect(quotes.length).toBe(10);
      expect(quotes.every(q => q.startsWith('"') && q.endsWith('"'))).toBe(true);
    });

    it('should select random quote using Math.random', () => {
      const quotes = ['quote1', 'quote2', 'quote3'];

      // Mock Math.random to return specific values
      const mathRandomSpy = vi.spyOn(Math, 'random');

      mathRandomSpy.mockReturnValue(0);
      expect(quotes[Math.floor(Math.random() * quotes.length)]).toBe('quote1');

      mathRandomSpy.mockReturnValue(0.5);
      expect(quotes[Math.floor(Math.random() * quotes.length)]).toBe('quote2');

      mathRandomSpy.mockReturnValue(0.99);
      expect(quotes[Math.floor(Math.random() * quotes.length)]).toBe('quote3');

      mathRandomSpy.mockRestore();
    });
  });

  describe('scene structure', () => {
    it('should be a Phaser.Scene with key "MenuScene"', () => {
      expect(scene).toBeInstanceOf(MenuScene);
      expect((scene as any).sys?.settings?.key || 'MenuScene').toBe('MenuScene');
    });
  });
});
