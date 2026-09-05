import { randomUUID } from "node:crypto";
import { db } from "../common/db.js";
import type { Priority, Watchlist, WatchlistStockRecord } from "../common/types.js";

export class WatchlistRepository {
  ensureUser(userId: string, name: string) {
    db.prepare(`INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)`).run(userId, name);
  }

  create(userId: string, name: string): Watchlist {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO watchlists (id, user_id, name, created_at) VALUES (?, ?, ?, ?)`
    ).run(id, userId, name, createdAt);
    return { id, userId, name, createdAt, stocks: [] };
  }

  rename(id: string, name: string): void {
    db.prepare(`UPDATE watchlists SET name = ? WHERE id = ?`).run(name, id);
  }

  delete(id: string): void {
    db.prepare(`DELETE FROM watchlists WHERE id = ?`).run(id);
  }

  listForUser(userId: string): Watchlist[] {
    const rows = db
      .prepare(`SELECT * FROM watchlists WHERE user_id = ? ORDER BY created_at`)
      .all(userId) as any[];
    return rows.map((r) => this.hydrate(r));
  }

  getById(id: string): Watchlist | null {
    const row = db.prepare(`SELECT * FROM watchlists WHERE id = ?`).get(id) as any;
    if (!row) return null;
    return this.hydrate(row);
  }

  addStock(watchlistId: string, symbol: string, companyName: string, priority: Priority = "MEDIUM") {
    const maxPos = (
      db.prepare(
        `SELECT COALESCE(MAX(position), -1) as maxPos FROM watchlist_stocks WHERE watchlist_id = ?`
      ).get(watchlistId) as any
    ).maxPos;
    db.prepare(
      `INSERT OR IGNORE INTO watchlist_stocks (watchlist_id, symbol, company_name, priority, position)
       VALUES (?, ?, ?, ?, ?)`
    ).run(watchlistId, symbol, companyName, priority, maxPos + 1);
  }

  removeStock(watchlistId: string, symbol: string) {
    db.prepare(
      `DELETE FROM watchlist_stocks WHERE watchlist_id = ? AND symbol = ?`
    ).run(watchlistId, symbol);
  }

  setPriority(watchlistId: string, symbol: string, priority: Priority) {
    db.prepare(
      `UPDATE watchlist_stocks SET priority = ? WHERE watchlist_id = ? AND symbol = ?`
    ).run(priority, watchlistId, symbol);
  }

  reorder(watchlistId: string, orderedSymbols: string[]) {
    const stmt = db.prepare(
      `UPDATE watchlist_stocks SET position = ? WHERE watchlist_id = ? AND symbol = ?`
    );
    const tx = db.transaction((symbols: string[]) => {
      symbols.forEach((symbol, idx) => stmt.run(idx, watchlistId, symbol));
    });
    tx(orderedSymbols);
  }

  private hydrate(row: any): Watchlist {
    const stocks = db
      .prepare(
        `SELECT symbol, company_name as companyName, priority, position
         FROM watchlist_stocks WHERE watchlist_id = ? ORDER BY position`
      )
      .all(row.id) as WatchlistStockRecord[];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      createdAt: row.created_at,
      stocks,
    };
  }
}
