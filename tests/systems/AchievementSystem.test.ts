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

// Mock analytics service
vi.mock('../../src/services/AnalyticsService', () => ({
  trackAchievementUnlock: vi.fn(),
}));

// Import after mocks are set up
import { AchievementSystem } from '../../src/systems/AchievementSystem';
import { ACHIEVEMENTS } from '../../src/data/achievements';

const STORAGE_KEY = 'peaceShuttle_achievements';

describe('AchievementSystem', () => {
  let achievementSystem: AchievementSystem;

  beforeEach(() => {
    localStorageMock = {};
    vi.clearAllMocks();
    achievementSystem = new AchievementSystem();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty unlocked achievements', () => {
      expect(achievementSystem.getUnlockedCount()).toBe(0);
    });

    it('should load existing achievements from localStorage', () => {
      const savedData = {
        unlockedAchievements: {
          'first_contact': { unlockedAt: '2024-01-01T00:00:00.000Z' },
        },
        stats: { totalDeaths: 0, totalCasinoChipValue: 0 },
      };
      localStorageMock[STORAGE_KEY] = JSON.stringify(savedData);

      const system = new AchievementSystem();
      expect(system.isUnlocked('first_contact')).toBe(true);
      expect(system.getUnlockedCount()).toBe(1);
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorageMock[STORAGE_KEY] = 'invalid json';

      const system = new AchievementSystem();
      expect(system.getUnlockedCount()).toBe(0);
    });
  });

  describe('unlock', () => {
    it('should unlock a valid achievement', () => {
      const result = achievementSystem.unlock('first_contact');
      expect(result).toBe(true);
      expect(achievementSystem.isUnlocked('first_contact')).toBe(true);
    });

    it('should save to localStorage when unlocking', () => {
      achievementSystem.unlock('first_contact');
      expect(localStorageInterface.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('first_contact')
      );
    });

    it('should return false when achievement already unlocked', () => {
      achievementSystem.unlock('first_contact');
      const result = achievementSystem.unlock('first_contact');
      expect(result).toBe(false);
    });

    it('should return false for unknown achievement ID', () => {
      const result = achievementSystem.unlock('nonexistent_achievement');
      expect(result).toBe(false);
    });

    it('should notify listeners when achievement is unlocked', () => {
      const listener = vi.fn();
      achievementSystem.onUnlock(listener);

      achievementSystem.unlock('first_contact');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'first_contact' })
      );
    });

    it('should not notify listeners for duplicate unlock', () => {
      const listener = vi.fn();
      achievementSystem.onUnlock(listener);

      achievementSystem.unlock('first_contact');
      achievementSystem.unlock('first_contact'); // duplicate

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('isUnlocked', () => {
    it('should return false for unlocked achievement', () => {
      expect(achievementSystem.isUnlocked('first_contact')).toBe(false);
    });

    it('should return true after unlocking', () => {
      achievementSystem.unlock('first_contact');
      expect(achievementSystem.isUnlocked('first_contact')).toBe(true);
    });
  });

  describe('onPalaceReachedInRainWithHeadwind', () => {
    it('should unlock against_all_odds achievement', () => {
      achievementSystem.onPalaceReachedInRainWithHeadwind();
      expect(achievementSystem.isUnlocked('against_all_odds')).toBe(true);
    });

    it('should save to localStorage', () => {
      achievementSystem.onPalaceReachedInRainWithHeadwind();
      expect(localStorageInterface.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('against_all_odds')
      );
    });

    it('should handle duplicate calls safely', () => {
      achievementSystem.onPalaceReachedInRainWithHeadwind();
      achievementSystem.onPalaceReachedInRainWithHeadwind();

      expect(achievementSystem.isUnlocked('against_all_odds')).toBe(true);
      // Should only save twice (one for unlock, one for listener check)
    });

    it('should notify listeners on first unlock only', () => {
      const listener = vi.fn();
      achievementSystem.onUnlock(listener);

      achievementSystem.onPalaceReachedInRainWithHeadwind();
      achievementSystem.onPalaceReachedInRainWithHeadwind();

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('achievement definition - against_all_odds', () => {
    it('should have against_all_odds in ACHIEVEMENTS list', () => {
      const achievement = ACHIEVEMENTS.find(a => a.id === 'against_all_odds');
      expect(achievement).toBeDefined();
    });

    it('should have correct properties', () => {
      const achievement = ACHIEVEMENTS.find(a => a.id === 'against_all_odds');
      expect(achievement?.name).toBe('Against All Odds');
      expect(achievement?.tier).toBe('gold');
      expect(achievement?.description).toContain('rain');
      expect(achievement?.description).toContain('headwind');
    });

    it('should have unique ID among all achievements', () => {
      const ids = ACHIEVEMENTS.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe('getUnlockedCount and getTotalCount', () => {
    it('should return correct unlocked count', () => {
      expect(achievementSystem.getUnlockedCount()).toBe(0);
      achievementSystem.unlock('first_contact');
      expect(achievementSystem.getUnlockedCount()).toBe(1);
      achievementSystem.unlock('smooth_operator');
      expect(achievementSystem.getUnlockedCount()).toBe(2);
    });

    it('should return total achievement count', () => {
      expect(achievementSystem.getTotalCount()).toBe(ACHIEVEMENTS.length);
    });
  });

  describe('getAll', () => {
    it('should return all achievements', () => {
      const all = achievementSystem.getAll();
      expect(all).toBe(ACHIEVEMENTS);
      expect(all.length).toBeGreaterThan(0);
    });
  });

  describe('listener management', () => {
    it('should add listeners via onUnlock', () => {
      const listener = vi.fn();
      achievementSystem.onUnlock(listener);

      achievementSystem.unlock('first_contact');
      expect(listener).toHaveBeenCalled();
    });

    it('should remove listeners via removeListener', () => {
      const listener = vi.fn();
      achievementSystem.onUnlock(listener);
      achievementSystem.removeListener(listener);

      achievementSystem.unlock('first_contact');
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
