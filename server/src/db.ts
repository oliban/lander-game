import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';

// Use /data for Fly.io volume, fallback to local for dev
const dbPath = process.env.NODE_ENV === 'production'
  ? '/data/scores.db'
  : path.join(process.cwd(), 'scores.db');

const db: DatabaseType = new Database(dbPath, {
  timeout: 5000, // Wait up to 5 seconds if DB is busy
});

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS highscores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_score ON highscores(score DESC);
  CREATE INDEX IF NOT EXISTS idx_created_at ON highscores(created_at);
  CREATE INDEX IF NOT EXISTS idx_ip ON highscores(ip_address);
`);

export interface HighScoreEntry {
  id?: number;
  name: string;
  score: number;
  ip_address?: string;
  created_at?: string;
}

export interface HighScoreResponse {
  name: string;
  score: number;
  date: string;
}

// Insert a new score
export function insertScore(name: string, score: number, ipAddress: string): HighScoreEntry {
  const stmt = db.prepare(`
    INSERT INTO highscores (name, score, ip_address)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(name, score, ipAddress);
  return {
    id: result.lastInsertRowid as number,
    name,
    score,
    ip_address: ipAddress,
  };
}

// Get top scores - all time
export function getTopScoresAllTime(limit = 10): HighScoreResponse[] {
  const stmt = db.prepare(`
    SELECT name, score, DATE(created_at) as date
    FROM highscores
    ORDER BY score DESC
    LIMIT ?
  `);
  return stmt.all(limit) as HighScoreResponse[];
}

// Get top scores - today
export function getTopScoresToday(limit = 10): HighScoreResponse[] {
  const stmt = db.prepare(`
    SELECT name, score, DATE(created_at) as date
    FROM highscores
    WHERE DATE(created_at) = DATE('now')
    ORDER BY score DESC
    LIMIT ?
  `);
  return stmt.all(limit) as HighScoreResponse[];
}

// Get top scores - this week (Monday to Sunday)
export function getTopScoresThisWeek(limit = 10): HighScoreResponse[] {
  const stmt = db.prepare(`
    SELECT name, score, DATE(created_at) as date
    FROM highscores
    WHERE created_at >= DATE('now', 'weekday 0', '-7 days')
      AND created_at < DATE('now', 'weekday 0')
    ORDER BY score DESC
    LIMIT ?
  `);
  // Fallback for current week if the above doesn't work well
  const fallbackStmt = db.prepare(`
    SELECT name, score, DATE(created_at) as date
    FROM highscores
    WHERE created_at >= DATE('now', '-7 days')
    ORDER BY score DESC
    LIMIT ?
  `);
  const results = stmt.all(limit) as HighScoreResponse[];
  return results.length > 0 ? results : fallbackStmt.all(limit) as HighScoreResponse[];
}

// Get top scores - by IP (local)
export function getTopScoresByIp(ipAddress: string, limit = 10): HighScoreResponse[] {
  const stmt = db.prepare(`
    SELECT name, score, DATE(created_at) as date
    FROM highscores
    WHERE ip_address = ?
    ORDER BY score DESC
    LIMIT ?
  `);
  return stmt.all(ipAddress, limit) as HighScoreResponse[];
}

export default db;
