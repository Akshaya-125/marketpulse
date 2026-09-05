import type { MarketQuote, MarketEvent } from "../common/types.js";

/**
 * Abstraction the rest of the app codes against. Nothing outside this
 * folder should know whether data is mocked or coming from a real API —
 * that's the whole point of the interface (brief §8/§21).
 */
export interface MarketDataProvider {
  getQuote(symbol: string): Promise<MarketQuote | null>;
  getQuotes(symbols: string[]): Promise<Map<string, MarketQuote>>;
  getEvents(symbol: string, sinceIso: string): Promise<MarketEvent[]>;
  getMarketStatus(): Promise<{ isOpen: boolean; label: string }>;
}
