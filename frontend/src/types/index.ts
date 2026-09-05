export type AttentionLevel = "NORMAL" | "WORTH_WATCHING" | "SIGNIFICANT" | "HIGH_ATTENTION";
export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type FreshnessStatus = "FRESH" | "DELAYED" | "STALE" | "UNAVAILABLE";

export interface ChangeFactor {
  key: string;
  label: string;
  rawValue: number;
  weight: number;
  contribution: number;
}

export interface StockChangeResult {
  symbol: string;
  companyName: string;
  previousPrice: number;
  currentPrice: number;
  percentChange: number;
  score: number;
  attentionLevel: AttentionLevel;
  factors: ChangeFactor[];
  explanation: string;
  freshness: FreshnessStatus;
}

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
  items: BriefingItem[];
  marketStatus: { isOpen: boolean; label: string };
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

export interface UniverseStock {
  symbol: string;
  companyName: string;
  sector: string;
}

export type DemoScenario =
  | "NORMAL_DAY"
  | "SUDDEN_DROP"
  | "ABNORMAL_VOLUME_RISE"
  | "MARKET_WIDE_DECLINE"
  | "NO_CHANGE";
