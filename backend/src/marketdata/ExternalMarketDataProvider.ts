import type { MarketDataProvider } from "./MarketDataProvider.js";
import type { MarketEvent, MarketQuote } from "../common/types.js";
import { classifyFreshness } from "./freshness.js";

interface YahooChartResult {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketPreviousClose?: number;
        regularMarketVolume?: number;
        averageDailyVolume3Month?: number;
        regularMarketTime?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: unknown;
  };
}

interface StockInfo {
  companyName: string;
  sector: string;
}

interface UniverseStock extends StockInfo {
  symbol: string;
}
const UNIVERSE: UniverseStock[] = [
  { symbol: "TCS", companyName: "Tata Consultancy Services", sector: "IT" },
  { symbol: "INFY", companyName: "Infosys", sector: "IT" },
  { symbol: "RELIANCE", companyName: "Reliance Industries", sector: "Energy" },
  { symbol: "HDFCBANK", companyName: "HDFC Bank", sector: "Banking" },
  { symbol: "ICICIBANK", companyName: "ICICI Bank", sector: "Banking" },
  { symbol: "SBIN", companyName: "State Bank of India", sector: "Banking" },
  { symbol: "ITC", companyName: "ITC Limited", sector: "Consumer" },
  { symbol: "BHARTIARTL", companyName: "Bharti Airtel", sector: "Telecom" },
  { symbol: "LT", companyName: "Larsen & Toubro", sector: "Industrials" },
  { symbol: "WIPRO", companyName: "Wipro", sector: "IT" },
  { symbol: "HINDUNILVR", companyName: "Hindustan Unilever", sector: "Consumer" },
  { symbol: "MARUTI", companyName: "Maruti Suzuki India", sector: "Automobile" },
];

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class ExternalMarketDataProvider implements MarketDataProvider {
  private quoteCache = new Map<string, CacheEntry<MarketQuote>>();
  private statsCache = new Map<
    string,
    CacheEntry<{ avgMove: number; stdDev: number }>
  >();
  private marketCache: CacheEntry<number> | null = null;

  constructor(private readonly timeoutMs = 10000) {}

  private yahooSymbol(symbol: string): string {
    if (symbol.startsWith("^")) return symbol;
    return symbol.endsWith(".NS") ? symbol : `${symbol}.NS`;
  }

  private async fetchChart(
    symbol: string,
    range: string,
    interval: string
  ): Promise<{
  meta?: {
    symbol?: string;
    regularMarketPrice?: number;
    chartPreviousClose?: number;
    previousClose?: number;
    regularMarketPreviousClose?: number;
    regularMarketVolume?: number;
    averageDailyVolume3Month?: number;
    regularMarketTime?: number;
  };
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
}> {
    const yahooSymbol = this.yahooSymbol(symbol);

    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/` +
      `${encodeURIComponent(yahooSymbol)}` +
      `?range=${range}&interval=${interval}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "MarketPulse/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance returned HTTP ${response.status}`);
    }

    const body = (await response.json()) as YahooChartResult;
    const result = body.chart?.result?.[0];

    if (!result) {
      throw new Error(`No market data returned for ${yahooSymbol}`);
    }

    return result;
  }

  private getStockInfo(symbol: string): StockInfo {
    const clean = symbol.replace(".NS", "").toUpperCase();

    return (
      UNIVERSE.find((s) => s.symbol === clean) ?? {
        companyName: clean,
        sector: "Unknown",
      }
    );
  }

  private async getHistoricalStats(symbol: string) {
    const key = symbol.toUpperCase();
    const cached = this.statsCache.get(key);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    const result = await this.fetchChart(symbol, "1y", "1d");

    const closes =
      result.indicators?.quote?.[0]?.close?.filter(
        (v): v is number => typeof v === "number" && Number.isFinite(v)
      ) ?? [];

    if (closes.length < 10) {
      return { avgMove: 1, stdDev: 1 };
    }

    const returns: number[] = [];

    for (let i = 1; i < closes.length; i++) {
      if (closes[i - 1] > 0) {
        returns.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
      }
    }

    const avgMove =
      returns.reduce((sum, value) => sum + Math.abs(value), 0) /
      Math.max(returns.length, 1);

    const mean =
      returns.reduce((sum, value) => sum + value, 0) /
      Math.max(returns.length, 1);

    const variance =
      returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
      Math.max(returns.length, 1);

    const value = {
      avgMove: Math.max(avgMove, 0.1),
      stdDev: Math.max(Math.sqrt(variance), 0.1),
    };

    this.statsCache.set(key, {
      value,
      expiresAt: Date.now() + 6 * 60 * 60 * 1000,
    });

    return value;
  }

  private async getNiftyChange(): Promise<number> {
    if (this.marketCache && Date.now() < this.marketCache.expiresAt) {
      return this.marketCache.value;
    }

    try {
      const result = await this.fetchChart("^NSEI", "1d", "1d");
      const meta = result.meta;

      const current = meta?.regularMarketPrice ?? 0;
      const previous =
        meta?.chartPreviousClose ??
        meta?.previousClose ??
        meta?.regularMarketPreviousClose ??
        current;

      const change =
        previous > 0 ? ((current - previous) / previous) * 100 : 0;

      this.marketCache = {
        value: Number(change.toFixed(2)),
        expiresAt: Date.now() + 60_000,
      };

      return this.marketCache.value;
    } catch {
      return 0;
    }
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const cleanSymbol = symbol.replace(".NS", "").toUpperCase();

    const cached = this.quoteCache.get(cleanSymbol);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    const result = await this.fetchChart(cleanSymbol, "1d", "1m");
    const meta = result.meta;

    const price = meta?.regularMarketPrice;

    if (typeof price !== "number" || !Number.isFinite(price)) {
      return null;
    }

    const previousClose =
      meta?.chartPreviousClose ??
      meta?.previousClose ??
      meta?.regularMarketPreviousClose ??
      price;

    const volume = meta?.regularMarketVolume ?? 0;
    const averageVolume = meta?.averageDailyVolume3Month ?? volume;

    const dayChangePercent =
      previousClose > 0
        ? ((price - previousClose) / previousClose) * 100
        : 0;

    const timestamp = meta?.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString();

    const stats = await this.getHistoricalStats(cleanSymbol);
    const marketChangePercent = await this.getNiftyChange();

    const info = this.getStockInfo(cleanSymbol);

    const quote: MarketQuote = {
      symbol: cleanSymbol,
      companyName: info.companyName,
      price: Number(price.toFixed(2)),
      previousClose: Number(previousClose.toFixed(2)),
      dayChangePercent: Number(dayChangePercent.toFixed(2)),
      volume,
      averageVolume,
      sector: info.sector,

      // Relative sector data is not fabricated.
      // The engine still has real price + market benchmark data.
      sectorChangePercent: 0,

      marketChangePercent,
      trailingAvgMoveAbsPct: stats.avgMove,
      trailingStdDevPct: stats.stdDev,
      timestamp,
      source: "Yahoo Finance",
      freshness: classifyFreshness(timestamp),
    };

    this.quoteCache.set(cleanSymbol, {
      value: quote,
      expiresAt: Date.now() + 30_000,
    });

    return quote;
  }

  async getQuotes(symbols: string[]): Promise<Map<string, MarketQuote>> {
    const results = await Promise.allSettled(
      symbols.map((symbol) => this.getQuote(symbol))
    );

    const out = new Map<string, MarketQuote>();

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value) {
        out.set(symbols[index].toUpperCase(), result.value);
      }
    });

    return out;
  }

  async getEvents(
    _symbol: string,
    _sinceIso: string
  ): Promise<MarketEvent[]> {
    // We don't fabricate financial events.
    return [];
  }

  async getMarketStatus(): Promise<{
    isOpen: boolean;
    label: string;
  }> {
    const parts = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";

    const weekday = get("weekday");
    const hour = Number(get("hour"));
    const minute = Number(get("minute"));

    const minutes = hour * 60 + minute;

    const weekdayOpen = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);
    const isOpen =
      weekdayOpen && minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30;

    return {
      isOpen,
      label: isOpen ? "NSE market open" : "NSE market closed",
    };
  }

  listUniverse() {
    return UNIVERSE;
  }
}