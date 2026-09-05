import type { MarketDataProvider } from "../marketdata/MarketDataProvider.js";
import type { WatchlistRepository } from "../watchlist/WatchlistRepository.js";
import { SnapshotRepository } from "./SnapshotRepository.js";
import { computeStockChange } from "../change/ChangeIntelligenceEngine.js";
import { rankAttentionQueue } from "../change/rankAttention.js";
import type { StockChangeResult, Priority } from "../common/types.js";
import { logger } from "../common/logger.js";

export interface BriefingItem {
  result: StockChangeResult;
  priority: Priority;
}

export interface Briefing {
  watchlistId: string;
  generatedAt: string;
  lastVisitAt: string | null;
  isFirstVisit: boolean;
  meaningfulChangeCount: number;
  highAttentionCount: number;
  items: BriefingItem[]; // ranked, includes NORMAL items too (frontend filters display)
  marketStatus: { isOpen: boolean; label: string };
}

export class SnapshotService {
  private snapshotRepo = new SnapshotRepository();

  constructor(
    private provider: MarketDataProvider,
    private watchlistRepo: WatchlistRepository
  ) {}

  /**
   * Records this visit and returns the "since you were away" briefing.
   * This is the single most important method in the app (brief §11).
   */
  async visitAndBrief(watchlistId: string): Promise<Briefing> {
    const watchlist = this.watchlistRepo.getById(watchlistId);
    if (!watchlist) throw new Error("Watchlist not found");

    const nowIso = new Date().toISOString(); // server clock only — never trust client (§23)
    const previousVisitAt = this.snapshotRepo.getLastVisitTime(watchlistId);
    const visitId = this.snapshotRepo.recordVisit(watchlistId, nowIso);

    const marketStatus = await this.provider.getMarketStatus();
    const items: BriefingItem[] = [];

    for (const stock of watchlist.stocks) {
      let quote;
      try {
        quote = await this.provider.getQuote(stock.symbol);
      } catch (err) {
        logger.warn("market_provider_failure", { symbol: stock.symbol, error: String(err) });
        quote = null;
      }

      if (!quote) {
        // Provider failed and no live quote — degrade gracefully rather
        // than erroring the whole briefing (brief §23).
        items.push({
          priority: stock.priority,
          result: {
            symbol: stock.symbol,
            companyName: stock.companyName,
            previousPrice: 0,
            currentPrice: 0,
            percentChange: 0,
            score: 0,
            attentionLevel: "NORMAL",
            factors: [],
            explanation: "Market data unavailable for this stock right now.",
            freshness: "UNAVAILABLE",
          },
        });
        continue;
      }

      const previousSnapshot = this.snapshotRepo.getPreviousSnapshot(
        watchlistId,
        stock.symbol,
        nowIso
      );

      let hasRecentEvent = false;
      try {
        const events = await this.provider.getEvents(
          stock.symbol,
          previousVisitAt ?? nowIso
        );
        hasRecentEvent = events.length > 0;
      } catch (err) {
        logger.warn("events_fetch_failure", { symbol: stock.symbol, error: String(err) });
      }

      const result = computeStockChange({
        previousPrice: previousSnapshot ? previousSnapshot.price : null,
        currentQuote: quote,
        hasRecentEvent,
      });

      items.push({ priority: stock.priority, result });

      // Persist this visit's snapshot so the *next* visit has something to
      // compare against.
      this.snapshotRepo.saveSnapshot(watchlistId, visitId, nowIso, quote);
    }

    const ranked = rankAttentionQueue(items.map((i) => ({ result: i.result, priority: i.priority })));

    const meaningfulChangeCount = ranked.filter(
      (r) => r.result.attentionLevel !== "NORMAL"
    ).length;
    const highAttentionCount = ranked.filter(
      (r) => r.result.attentionLevel === "HIGH_ATTENTION"
    ).length;

    return {
      watchlistId,
      generatedAt: nowIso,
      lastVisitAt: previousVisitAt,
      isFirstVisit: previousVisitAt === null,
      meaningfulChangeCount,
      highAttentionCount,
      items: ranked.map((r) => ({ result: r.result, priority: r.priority })),
      marketStatus,
    };
  }
}
