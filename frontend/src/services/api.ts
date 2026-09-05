import type {
  Briefing,
  Priority,
  UniverseStock,
  Watchlist,
} from "../types";

const BASE =
  import.meta.env.VITE_API_BASE_URL || "/api";

async function req<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.error ?? `Request failed: ${res.status}`
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export const api = {
  // -------------------------
  // WATCHLISTS
  // -------------------------

  listWatchlists: () =>
    req<Watchlist[]>("/watchlists"),

  createWatchlist: (name: string) =>
    req<Watchlist>("/watchlists", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  getWatchlist: (id: string) =>
    req<Watchlist>(`/watchlists/${id}`),

  deleteWatchlist: (id: string) =>
    req<void>(`/watchlists/${id}`, {
      method: "DELETE",
    }),

  // -------------------------
  // MARKET DATA
  // -------------------------

  marketOverview: () =>
    req<{
      mode: "LIVE";
      source: string;

      nifty: {
        symbol: string;
        companyName: string;
        price: number;
        dayChangePercent: number;
      } | null;

      sensex: {
        symbol: string;
        companyName: string;
        price: number;
        dayChangePercent: number;
      } | null;

      stocks: {
        symbol: string;
        companyName: string;
        price: number;
        dayChangePercent: number;
      }[];

      market: {
        isOpen: boolean;
        label: string;
      };
    }>("/market-overview"),

  stockUniverse: () =>
    req<UniverseStock[]>("/stocks"),

  // -------------------------
  // WATCHLIST STOCKS
  // -------------------------

  addStock: (
    watchlistId: string,
    symbol: string,
    companyName: string,
    priority: Priority
  ) =>
    req<Watchlist>(
      `/watchlists/${watchlistId}/stocks`,
      {
        method: "POST",
        body: JSON.stringify({
          symbol,
          companyName,
          priority,
        }),
      }
    ),

  removeStock: (
    watchlistId: string,
    symbol: string
  ) =>
    req<Watchlist>(
      `/watchlists/${watchlistId}/stocks/${symbol}`,
      {
        method: "DELETE",
      }
    ),

  setPriority: (
    watchlistId: string,
    symbol: string,
    priority: Priority
  ) =>
    req<Watchlist>(
      `/watchlists/${watchlistId}/stocks/${symbol}/priority`,
      {
        method: "PUT",
        body: JSON.stringify({ priority }),
      }
    ),

  // -------------------------
  // BRIEFING
  // -------------------------

  visit: (watchlistId: string) =>
    req<Briefing>(
      `/watchlists/${watchlistId}/visit`,
      {
        method: "POST",
      }
    ),
};