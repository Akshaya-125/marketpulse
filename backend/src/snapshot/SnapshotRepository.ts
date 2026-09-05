import { randomUUID } from "node:crypto";
import { db } from "../common/db.js";
import type { MarketQuote } from "../common/types.js";

export interface StoredSnapshot {
  symbol: string;
  price: number;
  volume: number;
  sectorChangePct: number;
  marketChangePct: number;
  source: string;
  visitedAt: string;
}

export class SnapshotRepository {
  recordVisit(watchlistId: string, visitedAt: string): string {
    const id = randomUUID();
    db.prepare(`INSERT INTO visits (id, watchlist_id, visited_at) VALUES (?, ?, ?)`).run(
      id,
      watchlistId,
      visitedAt
    );
    return id;
  }

  saveSnapshot(watchlistId: string, visitId: string, visitedAt: string, quote: MarketQuote) {
    const id = randomUUID();
    db.prepare(
      `INSERT INTO snapshots
        (id, watchlist_id, visit_id, symbol, price, volume, sector_change_pct, market_change_pct, source, visited_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      watchlistId,
      visitId,
      quote.symbol,
      quote.price,
      quote.volume,
      quote.sectorChangePercent,
      quote.marketChangePercent,
      quote.source,
      visitedAt
    );
  }

  /** Most recent snapshot for this symbol STRICTLY BEFORE the given time. */
  getPreviousSnapshot(watchlistId: string, symbol: string, beforeIso: string): StoredSnapshot | null {
    const row = db
      .prepare(
        `SELECT symbol, price, volume, sector_change_pct as sectorChangePct,
                market_change_pct as marketChangePct, source, visited_at as visitedAt
         FROM snapshots
         WHERE watchlist_id = ? AND symbol = ? AND visited_at < ?
         ORDER BY visited_at DESC
         LIMIT 1`
      )
      .get(watchlistId, symbol, beforeIso) as StoredSnapshot | undefined;
    return row ?? null;
  }

  /**
   * Must be called BEFORE recordVisit() for the current visit — it returns
   * the most recent visit that already exists, which becomes "the previous
   * visit" once the caller records today's visit right after. See
   * SnapshotService.visitAndBrief for the required call order.
   */
  getLastVisitTime(watchlistId: string): string | null {
    const row = db
      .prepare(
        `SELECT visited_at as visitedAt FROM visits
         WHERE watchlist_id = ? ORDER BY visited_at DESC LIMIT 1`
      )
      .get(watchlistId) as any;
    return row?.visitedAt ?? null;
  }
}
