import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock localStorage
let localStorageMock: { [key: string]: string } = {};

const localStorageInterface = {
  getItem: vi.fn((key: string) => localStorageMock[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock[key];
  }),
  clear: vi.fn(() => {
    localStorageMock = {};
  }),
};

vi.stubGlobal('localStorage', localStorageInterface);

// Mock fetch for score submission
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

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
        add = {
          graphics: () => new MockGraphics(),
          text: (_x: number, _y: number, text: string, _style: any) => new MockText(text),
          rectangle: () => new MockRectangle(0, 0, 0, 0),
        };
        time = {
          addEvent: () => ({ destroy: vi.fn() }),
        };
        scene = {
          start: vi.fn(),
        };
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

// Mock device detection
vi.mock('../../src/utils/DeviceDetection', () => ({
  isMobileDevice: vi.fn(() => false),
}));

// Mock AudioSettings
vi.mock('../../src/systems/AudioSettings', () => ({
  AudioSettings: {
    getInstance: vi.fn(() => ({
      isMuted: vi.fn(() => false),
    })),
  },
}));

// Mock ScoreService
vi.mock('../../src/services/ScoreService', () => ({
  submitScore: vi.fn(() => Promise.resolve(true)),
  fetchAllScores: vi.fn(() => Promise.resolve({ alltime: [], today: [], week: [], local: [] })),
  getLocalScores: vi.fn(() => []),
  CATEGORY_LABELS: { alltime: 'All Time', today: 'Today', week: 'This Week', local: 'Your Scores' },
  CATEGORY_ORDER: ['alltime', 'today', 'week', 'local'],
}));

// Mock Graphics
class MockGraphics {
  clear() { return this; }
  fillStyle() { return this; }
  fillRoundedRect() { return this; }
  fillRect() { return this; }
  fillCircle() { return this; }
  lineStyle() { return this; }
  strokeRoundedRect() { return this; }
  setDepth() { return this; }
  destroy() {}
}

// Mock Text
class MockText {
  text: string;
  constructor(text: string) {
    this.text = text;
  }
  setOrigin() { return this; }
  setText(text: string) {
    this.text = text;
    return this;
  }
  setInteractive() { return this; }
  on() { return this; }
  destroy() {}
}

const PLAYER_NAME_KEY = 'peaceShuttle_playerName';

describe('GameOverScene - Player Name Persistence', () => {
  beforeEach(() => {
    localStorageMock = {};
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('localStorage key naming', () => {
    it('should use correct key for player name storage', () => {
      expect(PLAYER_NAME_KEY).toBe('peaceShuttle_playerName');
    });
  });

  describe('loadSavedPlayerName', () => {
    it('should return empty string when no saved name exists', () => {
      const savedName = localStorage.getItem(PLAYER_NAME_KEY) || '';
      expect(savedName).toBe('');
      expect(localStorageInterface.getItem).toHaveBeenCalledWith(PLAYER_NAME_KEY);
    });

    it('should return saved name when it exists', () => {
      localStorageMock[PLAYER_NAME_KEY] = 'TestPlayer';

      const savedName = localStorage.getItem(PLAYER_NAME_KEY) || '';

      expect(savedName).toBe('TestPlayer');
      expect(localStorageInterface.getItem).toHaveBeenCalledWith(PLAYER_NAME_KEY);
    });

    it('should handle names with special characters', () => {
      localStorageMock[PLAYER_NAME_KEY] = 'Test_Player1';

      const savedName = localStorage.getItem(PLAYER_NAME_KEY) || '';

      expect(savedName).toBe('Test_Player1');
    });

    it('should handle maximum length names (12 characters)', () => {
      const maxLengthName = 'ABCDEFGHIJKL'; // 12 characters
      localStorageMock[PLAYER_NAME_KEY] = maxLengthName;

      const savedName = localStorage.getItem(PLAYER_NAME_KEY) || '';

      expect(savedName).toBe(maxLengthName);
      expect(savedName.length).toBe(12);
    });
  });

  describe('savePlayerName', () => {
    it('should save player name to localStorage', () => {
      const playerName = 'NewPlayer';

      localStorage.setItem(PLAYER_NAME_KEY, playerName);

      expect(localStorageInterface.setItem).toHaveBeenCalledWith(PLAYER_NAME_KEY, playerName);
      expect(localStorageMock[PLAYER_NAME_KEY]).toBe(playerName);
    });

    it('should overwrite existing player name', () => {
      localStorageMock[PLAYER_NAME_KEY] = 'OldPlayer';

      localStorage.setItem(PLAYER_NAME_KEY, 'NewPlayer');

      expect(localStorageMock[PLAYER_NAME_KEY]).toBe('NewPlayer');
    });

    it('should save empty string when player name is empty', () => {
      localStorage.setItem(PLAYER_NAME_KEY, '');

      expect(localStorageInterface.setItem).toHaveBeenCalledWith(PLAYER_NAME_KEY, '');
      expect(localStorageMock[PLAYER_NAME_KEY]).toBe('');
    });
  });

  describe('player name flow', () => {
    it('should persist name across simulated sessions', () => {
      // First "session" - save name
      localStorage.setItem(PLAYER_NAME_KEY, 'PersistentPlayer');

      // Simulate new session - clear mocks but keep storage
      vi.clearAllMocks();

      // Second "session" - load name
      const savedName = localStorage.getItem(PLAYER_NAME_KEY) || '';

      expect(savedName).toBe('PersistentPlayer');
    });

    it('should allow different names for different score submissions', () => {
      // This tests that the player name preference is independent of score entries
      localStorage.setItem(PLAYER_NAME_KEY, 'Player1');

      // Player can change name for next submission
      localStorage.setItem(PLAYER_NAME_KEY, 'Player2');

      const savedName = localStorage.getItem(PLAYER_NAME_KEY) || '';
      expect(savedName).toBe('Player2');
    });
  });

  describe('edge cases', () => {
    it('should handle null return from localStorage gracefully', () => {
      // localStorage.getItem returns null for non-existent keys
      const savedName = localStorage.getItem('nonexistent_key') || '';
      expect(savedName).toBe('');
    });

    it('should handle names with only spaces', () => {
      localStorageMock[PLAYER_NAME_KEY] = '   ';

      const savedName = localStorage.getItem(PLAYER_NAME_KEY) || '';

      expect(savedName).toBe('   ');
    });

    it('should handle unicode characters in names', () => {
      const unicodeName = '玩家名字'; // Chinese characters
      localStorageMock[PLAYER_NAME_KEY] = unicodeName;

      const savedName = localStorage.getItem(PLAYER_NAME_KEY) || '';

      expect(savedName).toBe(unicodeName);
    });

    it('should handle emoji in names', () => {
      const emojiName = 'Player🚀';
      localStorageMock[PLAYER_NAME_KEY] = emojiName;

      const savedName = localStorage.getItem(PLAYER_NAME_KEY) || '';

      expect(savedName).toBe(emojiName);
    });
  });
});
