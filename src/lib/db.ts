import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'masters-pool.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      odds TEXT,
      odds_value INTEGER,
      odds_rank INTEGER,
      group_number INTEGER,
      world_rank INTEGER
    );

    CREATE TABLE IF NOT EXISTS picks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      group_number INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (player_id) REFERENCES players(id),
      UNIQUE(user_id, group_number),
      UNIQUE(user_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS player_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL UNIQUE,
      total_score INTEGER,
      r1 INTEGER,
      r2 INTEGER,
      r3 INTEGER,
      r4 INTEGER,
      position TEXT,
      status TEXT DEFAULT 'active',
      last_updated TEXT,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS tournament_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      status TEXT DEFAULT 'pre',
      picks_locked INTEGER DEFAULT 0,
      espn_event_id TEXT DEFAULT '',
      current_round INTEGER DEFAULT 0
    );

    INSERT OR IGNORE INTO tournament_state (id, status, picks_locked, espn_event_id, current_round)
    VALUES (1, 'pre', 0, '', 0);
  `);
}
