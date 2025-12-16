// Score categories for the leaderboard
export type ScoreCategory = 'alltime' | 'today' | 'week' | 'local';

export interface HighScoreEntry {
  name: string;
  score: number;
  date: string;
}

export interface ScoresResponse {
  scores: HighScoreEntry[];
  category: ScoreCategory;
}

// Local storage keys
const LOCAL_SCORES_KEY = 'peaceShuttle_highScores';
const PENDING_SCORES_KEY = 'peaceShuttle_pendingScores';

// API base URL - relative for same-origin requests
const API_BASE = '/api/scores';

// Category labels for UI
export const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  alltime: 'All Time',
  today: 'Today',
  week: 'This Week',
  local: 'Your Scores',
};

// Category order for cycling
export const CATEGORY_ORDER: ScoreCategory[] = ['alltime', 'today', 'week', 'local'];

/**
 * Fetch with retry logic for handling busy database
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      // If DB busy (503), wait and retry
      if (response.status === 503) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }

      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      // Exponential backoff
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Submit a score to the server
 */
export async function submitScore(name: string, score: number): Promise<boolean> {
  try {
    const response = await fetchWithRetry(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Also save locally for offline access
    saveScoreLocally(name, score);

    // Clear any pending scores that match
    clearPendingScore(name, score);

    return true;
  } catch (error) {
    console.error('Failed to submit score to server:', error);

    // Save as pending for later sync
    savePendingScore(name, score);

    // Still save locally
    saveScoreLocally(name, score);

    return false;
  }
}

/**
 * Fetch scores from the server for a given category
 */
export async function fetchScores(category: ScoreCategory): Promise<HighScoreEntry[]> {
  try {
    const response = await fetchWithRetry(`${API_BASE}/${category}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: ScoresResponse = await response.json();
    return data.scores;
  } catch (error) {
    console.error(`Failed to fetch ${category} scores:`, error);

    // Fallback to local scores
    if (category === 'local' || category === 'alltime') {
      return getLocalScores();
    }

    return [];
  }
}

/**
 * Check if online and try to sync pending scores
 */
export async function syncPendingScores(): Promise<void> {
  const pending = getPendingScores();

  for (const entry of pending) {
    try {
      const response = await fetchWithRetry(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: entry.name, score: entry.score }),
      });

      if (response.ok) {
        clearPendingScore(entry.name, entry.score);
      }
    } catch (error) {
      // Still offline, will try again later
      console.log('Still offline, keeping pending scores');
      break;
    }
  }
}

/**
 * Check if there are pending scores to sync
 */
export function hasPendingScores(): boolean {
  return getPendingScores().length > 0;
}

// ============ Local Storage Helpers ============

function saveScoreLocally(name: string, score: number): void {
  try {
    const scores = getLocalScores();
    scores.push({
      name,
      score,
      date: new Date().toLocaleDateString(),
    });

    // Sort by score and keep top 10
    scores.sort((a, b) => b.score - a.score);
    const top10 = scores.slice(0, 10);

    localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(top10));
  } catch (e) {
    console.error('Failed to save score locally:', e);
  }
}

export function getLocalScores(): HighScoreEntry[] {
  try {
    const stored = localStorage.getItem(LOCAL_SCORES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load local scores:', e);
  }
  return [];
}

function getPendingScores(): HighScoreEntry[] {
  try {
    const stored = localStorage.getItem(PENDING_SCORES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load pending scores:', e);
  }
  return [];
}

function savePendingScore(name: string, score: number): void {
  try {
    const pending = getPendingScores();
    pending.push({
      name,
      score,
      date: new Date().toLocaleDateString(),
    });
    localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(pending));
  } catch (e) {
    console.error('Failed to save pending score:', e);
  }
}

function clearPendingScore(name: string, score: number): void {
  try {
    const pending = getPendingScores();
    const filtered = pending.filter(
      p => !(p.name === name && p.score === score)
    );
    localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to clear pending score:', e);
  }
}

/**
 * Check if the score qualifies for the top 10 locally
 */
export function qualifiesForHighScore(score: number): boolean {
  const scores = getLocalScores();
  if (scores.length < 10) return true;
  return score > scores[scores.length - 1].score;
}
