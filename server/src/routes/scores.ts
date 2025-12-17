import { Router, Request, Response } from 'express';
import {
  insertScore,
  getTopScoresAllTime,
  getTopScoresToday,
  getTopScoresThisWeek,
  getTopScoresByIp,
} from '../db.js';

const router = Router();

// Validation helpers
function validateName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 12) return null;
  // Allow alphanumeric, spaces, basic punctuation, and common international characters (Swedish, German, etc.)
  if (!/^[\p{L}\p{N}\s._-]+$/u.test(trimmed)) return null;
  return trimmed;
}

function validateScore(score: unknown): number | null {
  if (typeof score !== 'number') return null;
  if (!Number.isInteger(score)) return null;
  if (score < 0 || score > 1000000) return null; // Max 1 million
  return score;
}

function getClientIp(req: Request): string {
  // Fly.io sets X-Forwarded-For
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return req.ip || 'unknown';
}

// POST /scores - Submit a new score
router.post('/', (req: Request, res: Response) => {
  try {
    const name = validateName(req.body.name);
    const score = validateScore(req.body.score);

    if (!name) {
      return res.status(400).json({
        error: 'Invalid name. Must be 1-12 characters, alphanumeric only.',
      });
    }

    if (score === null) {
      return res.status(400).json({
        error: 'Invalid score. Must be an integer between 0 and 1,000,000.',
      });
    }

    const ipAddress = getClientIp(req);
    const entry = insertScore(name, score, ipAddress);

    res.status(201).json({
      success: true,
      entry: {
        name: entry.name,
        score: entry.score,
        date: new Date().toISOString().split('T')[0],
      },
    });
  } catch (error: any) {
    console.error('Error inserting score:', error);
    if (error.code === 'SQLITE_BUSY') {
      return res.status(503).json({ error: 'Database busy, please retry' });
    }
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// GET /scores/all - All score categories in one request
router.get('/all', (req: Request, res: Response) => {
  try {
    const ipAddress = getClientIp(req);
    res.json({
      alltime: getTopScoresAllTime(10),
      today: getTopScoresToday(10),
      week: getTopScoresThisWeek(10),
      local: getTopScoresByIp(ipAddress, 10),
    });
  } catch (error: any) {
    console.error('Error fetching all scores:', error);
    if (error.code === 'SQLITE_BUSY') {
      return res.status(503).json({ error: 'Database busy, please retry' });
    }
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// GET /scores/alltime - Top scores of all time
router.get('/alltime', (req: Request, res: Response) => {
  try {
    const scores = getTopScoresAllTime(10);
    res.json({ scores, category: 'alltime' });
  } catch (error: any) {
    console.error('Error fetching alltime scores:', error);
    if (error.code === 'SQLITE_BUSY') {
      return res.status(503).json({ error: 'Database busy, please retry' });
    }
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// GET /scores/today - Top scores today
router.get('/today', (req: Request, res: Response) => {
  try {
    const scores = getTopScoresToday(10);
    res.json({ scores, category: 'today' });
  } catch (error: any) {
    console.error('Error fetching today scores:', error);
    if (error.code === 'SQLITE_BUSY') {
      return res.status(503).json({ error: 'Database busy, please retry' });
    }
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// GET /scores/week - Top scores this week
router.get('/week', (req: Request, res: Response) => {
  try {
    const scores = getTopScoresThisWeek(10);
    res.json({ scores, category: 'week' });
  } catch (error: any) {
    console.error('Error fetching week scores:', error);
    if (error.code === 'SQLITE_BUSY') {
      return res.status(503).json({ error: 'Database busy, please retry' });
    }
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// GET /scores/local - Top scores from same IP
router.get('/local', (req: Request, res: Response) => {
  try {
    const ipAddress = getClientIp(req);
    const scores = getTopScoresByIp(ipAddress, 10);
    res.json({ scores, category: 'local' });
  } catch (error: any) {
    console.error('Error fetching local scores:', error);
    if (error.code === 'SQLITE_BUSY') {
      return res.status(503).json({ error: 'Database busy, please retry' });
    }
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

export default router;
