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

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocks are set up
import {
  submitScore,
  fetchScores,
  syncPendingScores,
  hasPendingScores,
  getLocalScores,
  qualifiesForHighScore,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
} from '../../src/services/ScoreService';

describe('ScoreService', () => {
  beforeEach(() => {
    localStorageMock = {};
    mockFetch.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('CATEGORY_ORDER and CATEGORY_LABELS', () => {
    it('should have 4 categories in correct order', () => {
      expect(CATEGORY_ORDER).toEqual(['alltime', 'today', 'week', 'local']);
    });

    it('should have labels for all categories', () => {
      expect(CATEGORY_LABELS.alltime).toBe('All Time');
      expect(CATEGORY_LABELS.today).toBe('Today');
      expect(CATEGORY_LABELS.week).toBe('This Week');
      expect(CATEGORY_LABELS.local).toBe('Your Scores');
    });
  });

  describe('submitScore', () => {
    it('should submit score successfully and save locally', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await submitScore('TestPlayer', 1000);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'TestPlayer', score: 1000 }),
      });

      // Check that score was saved locally
      const localScores = getLocalScores();
      expect(localScores.length).toBe(1);
      expect(localScores[0].name).toBe('TestPlayer');
      expect(localScores[0].score).toBe(1000);
    });

    it('should handle network failure and save as pending', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await submitScore('OfflinePlayer', 500);

      expect(result).toBe(false);

      // Score should be saved locally
      const localScores = getLocalScores();
      expect(localScores.length).toBe(1);
      expect(localScores[0].name).toBe('OfflinePlayer');

      // Should have pending scores
      expect(hasPendingScores()).toBe(true);
    });

    it('should retry on 503 status', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

      const result = await submitScore('RetryPlayer', 750);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should fail after max retries on persistent 503', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 });

      const result = await submitScore('FailPlayer', 100);

      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(hasPendingScores()).toBe(true);
    }, 15000);
  });

  describe('fetchScores', () => {
    it('should fetch alltime scores successfully', async () => {
      const mockScores = [
        { name: 'Player1', score: 1000, date: '2024-01-01' },
        { name: 'Player2', score: 900, date: '2024-01-01' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scores: mockScores, category: 'alltime' }),
      });

      const scores = await fetchScores('alltime');

      expect(scores).toEqual(mockScores);
      expect(mockFetch).toHaveBeenCalledWith('/api/scores/alltime', {});
    });

    it('should fetch today scores', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scores: [], category: 'today' }),
      });

      const scores = await fetchScores('today');

      expect(scores).toEqual([]);
      expect(mockFetch).toHaveBeenCalledWith('/api/scores/today', {});
    });

    it('should fetch week scores', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scores: [], category: 'week' }),
      });

      const scores = await fetchScores('week');

      expect(scores).toEqual([]);
      expect(mockFetch).toHaveBeenCalledWith('/api/scores/week', {});
    });

    it('should fetch local scores', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scores: [], category: 'local' }),
      });

      const scores = await fetchScores('local');

      expect(scores).toEqual([]);
      expect(mockFetch).toHaveBeenCalledWith('/api/scores/local', {});
    });

    it('should fallback to local scores on network error for alltime', async () => {
      // First add some local scores
      localStorageMock['peaceShuttle_highScores'] = JSON.stringify([
        { name: 'LocalPlayer', score: 500, date: '2024-01-01' },
      ]);

      mockFetch.mockRejectedValue(new Error('Network error'));

      const scores = await fetchScores('alltime');

      expect(scores.length).toBe(1);
      expect(scores[0].name).toBe('LocalPlayer');
    }, 15000);

    it('should fallback to local scores on network error for local category', async () => {
      localStorageMock['peaceShuttle_highScores'] = JSON.stringify([
        { name: 'LocalPlayer', score: 300, date: '2024-01-01' },
      ]);

      mockFetch.mockRejectedValue(new Error('Network error'));

      const scores = await fetchScores('local');

      expect(scores.length).toBe(1);
      expect(scores[0].name).toBe('LocalPlayer');
    }, 15000);

    it('should return empty array on network error for today/week', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const scores = await fetchScores('today');

      expect(scores).toEqual([]);
    }, 15000);
  });

  describe('syncPendingScores', () => {
    it('should sync pending scores when online', async () => {
      // Add a pending score
      localStorageMock['peaceShuttle_pendingScores'] = JSON.stringify([
        { name: 'PendingPlayer', score: 600, date: '2024-01-01' },
      ]);

      mockFetch.mockResolvedValueOnce({ ok: true });

      await syncPendingScores();

      expect(mockFetch).toHaveBeenCalledWith('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'PendingPlayer', score: 600 }),
      });

      // Pending scores should be cleared
      expect(hasPendingScores()).toBe(false);
    });

    it('should keep pending scores on continued network failure', async () => {
      localStorageMock['peaceShuttle_pendingScores'] = JSON.stringify([
        { name: 'PendingPlayer', score: 600, date: '2024-01-01' },
      ]);

      mockFetch.mockRejectedValue(new Error('Still offline'));

      await syncPendingScores();

      // Pending scores should still exist
      expect(hasPendingScores()).toBe(true);
    }, 15000);

    it('should do nothing when no pending scores', async () => {
      await syncPendingScores();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('hasPendingScores', () => {
    it('should return false when no pending scores', () => {
      expect(hasPendingScores()).toBe(false);
    });

    it('should return true when pending scores exist', () => {
      localStorageMock['peaceShuttle_pendingScores'] = JSON.stringify([
        { name: 'Pending', score: 100, date: '2024-01-01' },
      ]);

      expect(hasPendingScores()).toBe(true);
    });

    it('should return false for empty pending array', () => {
      localStorageMock['peaceShuttle_pendingScores'] = JSON.stringify([]);

      expect(hasPendingScores()).toBe(false);
    });
  });

  describe('getLocalScores', () => {
    it('should return empty array when no scores stored', () => {
      const scores = getLocalScores();
      expect(scores).toEqual([]);
    });

    it('should return stored scores', () => {
      const storedScores = [
        { name: 'Player1', score: 1000, date: '2024-01-01' },
        { name: 'Player2', score: 500, date: '2024-01-02' },
      ];
      localStorageMock['peaceShuttle_highScores'] = JSON.stringify(storedScores);

      const scores = getLocalScores();

      expect(scores).toEqual(storedScores);
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorageMock['peaceShuttle_highScores'] = 'not valid json';

      const scores = getLocalScores();

      expect(scores).toEqual([]);
    });
  });

  describe('qualifiesForHighScore', () => {
    it('should return true when less than 10 scores', () => {
      localStorageMock['peaceShuttle_highScores'] = JSON.stringify([
        { name: 'Player1', score: 1000, date: '2024-01-01' },
      ]);

      expect(qualifiesForHighScore(500)).toBe(true);
      expect(qualifiesForHighScore(100)).toBe(true);
    });

    it('should return true when no scores exist', () => {
      expect(qualifiesForHighScore(1)).toBe(true);
    });

    it('should return true when score beats 10th place', () => {
      const scores = Array.from({ length: 10 }, (_, i) => ({
        name: `Player${i}`,
        score: 1000 - i * 100, // 1000, 900, 800, ..., 100
        date: '2024-01-01',
      }));
      localStorageMock['peaceShuttle_highScores'] = JSON.stringify(scores);

      // Score of 150 beats 10th place (100)
      expect(qualifiesForHighScore(150)).toBe(true);
    });

    it('should return false when score does not beat 10th place', () => {
      const scores = Array.from({ length: 10 }, (_, i) => ({
        name: `Player${i}`,
        score: 1000 - i * 100, // 1000, 900, 800, ..., 100
        date: '2024-01-01',
      }));
      localStorageMock['peaceShuttle_highScores'] = JSON.stringify(scores);

      // Score of 50 does not beat 10th place (100)
      expect(qualifiesForHighScore(50)).toBe(false);
    });

    it('should return false when score equals 10th place', () => {
      const scores = Array.from({ length: 10 }, (_, i) => ({
        name: `Player${i}`,
        score: 1000 - i * 100, // 1000, 900, 800, ..., 100
        date: '2024-01-01',
      }));
      localStorageMock['peaceShuttle_highScores'] = JSON.stringify(scores);

      // Score of 100 equals 10th place, does not beat it
      expect(qualifiesForHighScore(100)).toBe(false);
    });
  });

  describe('local score storage - sorting and limiting', () => {
    it('should keep scores sorted by score descending', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

      await submitScore('Player1', 500);
      await submitScore('Player2', 1000);
      await submitScore('Player3', 750);

      const scores = getLocalScores();

      expect(scores[0].score).toBe(1000);
      expect(scores[1].score).toBe(750);
      expect(scores[2].score).toBe(500);
    });

    it('should limit to top 10 scores', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

      // Submit 12 scores
      for (let i = 0; i < 12; i++) {
        await submitScore(`Player${i}`, i * 100);
      }

      const scores = getLocalScores();

      expect(scores.length).toBe(10);
      // Highest score should be 1100 (Player11)
      expect(scores[0].score).toBe(1100);
      // Lowest kept score should be 200 (Player2)
      expect(scores[9].score).toBe(200);
    });
  });
});
