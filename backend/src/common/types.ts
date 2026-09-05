// Shared domain types. Kept dependency-free so the change engine can be
// unit tested with zero I/O.

export type FreshnessStatus = "FRESH" | "DELAYED" | "STALE" | "UNAVAILABLE";

export type Priority = "HIGH" | "MEDIUM" | "LOW";

export type AttentionLevel =
  | "NORMAL"
  | "WORTH_WATCHING"
  | "SIGNIFICANT"
  | "HIGH_ATTENTION";

/** Normalized market observation for one symbol at one point in time. */
export interface MarketQuote {
  symbol: string;
  companyName: string;
  price: number;
  previousClose: number;
  dayChangePercent: number;
  volume: number;
  averageVolume: number; // trailing 20-session average
  sector: string;
  sectorChangePercent: number;
  marketChangePercent: number; // benchmark index, e.g. NIFTY
  trailingAvgMoveAbsPct: number; // avg |daily % move| over trailing window
  trailingStdDevPct: number; // std dev of daily % moves over trailing window
  timestamp: string; // ISO 8601, server-assigned — never trust client time
  source: string;
  freshness: FreshnessStatus;
}

export interface MarketEvent {
  symbol: string;
  type: "EARNINGS" | "DIVIDEND" | "SPLIT" | "FILING" | "RATING_CHANGE";
  description: string;
  timestamp: string;
  simulated: true; // always labeled — see product-decisions.md
}

export interface ChangeFactor {
  key:
    | "priceDeviation"
    | "volumeAnomaly"
    | "volatilityChange"
    | "relativePerformance"
    | "eventImpact";
  label: string;
  rawValue: number; // normalized 0..1 input
  weight: number;
  contribution: number; // rawValue * weight * 100, i.e. points out of 100
}

export interface StockChangeResult {
  symbol: string;
  companyName: string;
  previousPrice: number;
  currentPrice: number;
  percentChange: number;
  score: number; // 0..100
  attentionLevel: AttentionLevel;
  factors: ChangeFactor[];
  explanation: string; // deterministic, template-generated (see explanation.ts)
  freshness: FreshnessStatus;
}

export interface WatchlistStockRecord {
  symbol: string;
  companyName: string;
  priority: Priority;
  position: number;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  stocks: WatchlistStockRecord[];
}
