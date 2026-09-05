import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH ?? path.join(DATA_DIR, "marketpulse.db");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/**
 * Schema notes (brief §26):
 * - watchlist_stocks has a UNIQUE(watchlist_id, symbol) so a stock can't
 *   be added twice to the same watchlist.
 * - snapshots is indexed on (watchlist_id, symbol, visited_at) because the
 *   "since you were away" query always asks "give me this symbol's most
 *   recent snapshot before now, for this watchlist."
 * - We store one snapshot row per (visit, symbol) rather than only the
 *   latest price, because the brief explicitly requires enough history to
 *   explain *what* changed, not just current state (§26).
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS watchlists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS watchlist_stocks (
    watchlist_id TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    company_name TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (watchlist_id, symbol)
  );

  CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY,
    watchlist_id TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    visited_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_visits_watchlist ON visits(watchlist_id, visited_at);

  CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY,
    watchlist_id TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    price REAL NOT NULL,
    volume INTEGER NOT NULL,
    sector_change_pct REAL NOT NULL,
    market_change_pct REAL NOT NULL,
    source TEXT NOT NULL,
    visited_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_snapshots_lookup
    ON snapshots(watchlist_id, symbol, visited_at);
`);
