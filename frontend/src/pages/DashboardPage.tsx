import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import type { Watchlist } from "../types";

interface MarketQuote {
  symbol: string;
  companyName: string;
  price: number;
  dayChangePercent: number;
}

interface MarketOverview {
  mode: "LIVE";
  source: string;
  nifty: MarketQuote | null;
  sensex: MarketQuote | null;
  stocks: MarketQuote[];
  market: {
    isOpen: boolean;
    label: string;
  };
}

export function DashboardPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[] | null>(null);
  const [market, setMarket] = useState<MarketOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setError(null);

      const [watchlistData, marketData] = await Promise.all([
        api.listWatchlists(),
        api.marketOverview(),
      ]);

      setWatchlists(watchlistData);
      setMarket(marketData);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load market data"
      );
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 60000);

    return () => clearInterval(timer);
  }, []);

  async function createWatchlist(e: React.FormEvent) {
    e.preventDefault();

    if (!newName.trim()) return;

    setCreating(true);

    try {
      await api.createWatchlist(newName.trim());
      setNewName("");
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to create watchlist"
      );
    } finally {
      setCreating(false);
    }
  }

  function money(value: number) {
    return `₹${value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function change(value: number) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[-200px] h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[140px]" />
        <div className="absolute right-[-100px] top-[20%] h-[450px] w-[450px] rounded-full bg-indigo-500/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">

        {/* NAVBAR */}
        <nav className="flex items-center justify-between border-b border-white/5 pb-5">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 font-black shadow-lg shadow-sky-500/20">
              M
            </div>

            <div>
              <div className="text-lg font-bold tracking-tight">
                MarketPulse
              </div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-slate-600">
                Intelligent market monitoring
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">

            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-semibold text-emerald-300 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              LIVE NSE DATA
            </div>

            <button
              onClick={load}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-sky-400/30 hover:bg-white/[0.06]"
            >
              ↻ Refresh
            </button>

          </div>
        </nav>

        {/* HERO */}
        <section className="grid gap-10 pb-14 pt-14 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">

          <div>

            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-400/10 bg-sky-400/5 px-3 py-1.5 text-xs font-medium text-sky-300">
              <span>✦</span>
              Market intelligence, not market noise
            </div>

           <h1 className="mt-8 max-w-4xl text-6xl font-black leading-[0.92] tracking-[-0.04em] sm:text-7xl lg:text-8xl">
  Know what
  <br />
  <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-500 bg-clip-text text-transparent">
    actually changed.
  </span>
</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
              MarketPulse monitors your watchlists, compares market
              movement and highlights the stocks that deserve your
              attention — so you don't have to scan everything.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">

              <form
                onSubmit={createWatchlist}
                className="flex max-w-xl flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-1.5 focus-within:border-sky-400/40"
              >
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Create a watchlist..."
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-slate-600"
                />

                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400 disabled:opacity-40"
                >
                  {creating ? "Creating..." : "+ Create"}
                </button>
              </form>

            </div>

            {error && (
              <div className="mt-4 max-w-xl rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

          </div>

          {/* NIFTY HERO CARD */}
          <div className="relative">

            <div className="absolute inset-0 rounded-3xl bg-sky-500/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl">

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    Market benchmark
                  </p>

                  <h2 className="mt-2 text-xl font-bold">
                    NIFTY 50
                  </h2>
                </div>

                <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  {market?.market.isOpen
                    ? "● OPEN"
                    : "● CLOSED"}
                </div>
              </div>

              {market?.nifty ? (
                <>
                  <div className="mt-8 text-4xl font-black tabular-nums">
                    {money(market.nifty.price)}
                  </div>

                  <div
                    className={`mt-2 text-sm font-bold ${
                      market.nifty.dayChangePercent >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {market.nifty.dayChangePercent >= 0
                      ? "↑"
                      : "↓"}{" "}
                    {change(market.nifty.dayChangePercent)}
                  </div>
                </>
              ) : (
                <div className="mt-8 text-3xl font-black text-slate-700">
                  —
                </div>
              )}

              <div className="mt-8 border-t border-white/5 pt-5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">
                    Data source
                  </span>
                  <span className="font-semibold text-slate-300">
                    Yahoo Finance
                  </span>
                </div>

                <div className="mt-3 flex justify-between text-xs">
                  <span className="text-slate-500">
                    Exchange
                  </span>
                  <span className="font-semibold text-slate-300">
                    NSE · India
                  </span>
                </div>
              </div>

            </div>
          </div>

        </section>

        {/* MARKET SNAPSHOT */}
        <section>

          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">
                Live market
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Market snapshot
              </h2>
            </div>

            <span className="text-xs text-slate-600">
              Auto-refreshes every 60 seconds
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* NIFTY */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-sky-400/20">
              <div className="flex justify-between">
                <span className="text-xs font-bold text-slate-500">
                  NIFTY 50
                </span>
                <span className="text-xs text-slate-600">
                  NSE
                </span>
              </div>

              <div className="mt-5 text-2xl font-bold">
                {market?.nifty
                  ? money(market.nifty.price)
                  : "—"}
              </div>

              {market?.nifty && (
                <div
                  className={`mt-2 text-sm font-semibold ${
                    market.nifty.dayChangePercent >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {change(market.nifty.dayChangePercent)}
                </div>
              )}
            </div>

            {/* SENSEX */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-sky-400/20">
              <div className="flex justify-between">
                <span className="text-xs font-bold text-slate-500">
                  SENSEX
                </span>
                <span className="text-xs text-slate-600">
                  BSE
                </span>
              </div>

              <div className="mt-5 text-2xl font-bold">
                {market?.sensex
                  ? money(market.sensex.price)
                  : "—"}
              </div>

              {market?.sensex && (
                <div
                  className={`mt-2 text-sm font-semibold ${
                    market.sensex.dayChangePercent >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {change(market.sensex.dayChangePercent)}
                </div>
              )}
            </div>

            {/* MARKET STATUS */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-sky-400/20">
              <div className="text-xs font-bold text-slate-500">
                MARKET STATUS
              </div>

              <div className="mt-5 flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    market?.market.isOpen
                      ? "animate-pulse bg-emerald-400"
                      : "bg-slate-600"
                  }`}
                />

                <span className="text-xl font-bold">
                  {market?.market.isOpen
                    ? "Open"
                    : "Closed"}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-600">
                {market?.market.label || "Loading market status..."}
              </p>
            </div>

            {/* DATA */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-sky-400/20">
              <div className="text-xs font-bold text-slate-500">
                DATA ENGINE
              </div>

              <div className="mt-5 text-xl font-bold text-emerald-300">
                Live
              </div>

              <p className="mt-2 text-xs text-slate-600">
                Real-time provider connected
              </p>
            </div>

          </div>
        </section>

        {/* WATCHLISTS */}
        <section className="mt-14">

          <div className="flex items-end justify-between">

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">
                Your intelligence
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Your watchlists
              </h2>
            </div>

            {watchlists && watchlists.length > 0 && (
              <span className="text-sm text-slate-500">
                {watchlists.length} list
                {watchlists.length === 1 ? "" : "s"}
              </span>
            )}

          </div>

          {watchlists === null ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-36 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]"
                />
              ))}
            </div>
          ) : watchlists.length === 0 ? (

            <div className="mt-5 overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 text-2xl">
                +
              </div>

              <h3 className="mt-5 text-xl font-bold">
                Start tracking the market
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Create your first watchlist and MarketPulse
                will monitor it for meaningful changes.
              </p>

            </div>

          ) : (

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {watchlists.map((wl) => (

                <Link
                  key={wl.id}
                  to={`/watchlists/${wl.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition duration-200 hover:-translate-y-1 hover:border-sky-400/30 hover:bg-white/[0.05]"
                >

                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-sky-500/5 blur-2xl transition group-hover:bg-sky-500/10" />

                  <div className="relative">

                    <div className="flex items-start justify-between">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 font-bold text-sky-300">
                        {wl.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <span className="text-xl text-slate-600 transition group-hover:translate-x-1 group-hover:text-sky-400">
                        →
                      </span>

                    </div>

                    <h3 className="mt-6 text-lg font-bold">
                      {wl.name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {wl.stocks.length} stock
                      {wl.stocks.length === 1 ? "" : "s"} tracked
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">

                      <span className="text-xs font-medium text-slate-600">
                        Open intelligence
                      </span>

                      <span className="text-xs font-bold text-sky-400">
                        View →
                      </span>

                    </div>

                  </div>

                </Link>

              ))}

            </div>
          )}
        </section>

        {/* WHY MARKETPULSE */}
        <section className="mt-16 border-t border-white/5 pt-14">

          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">
              Built for decisions
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Less scrolling.
              <br />
              More signal.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <div className="text-2xl">◉</div>
              <h3 className="mt-5 font-bold">
                Real market data
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Live NSE and BSE market information from an
                external financial data provider.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <div className="text-2xl">✦</div>
              <h3 className="mt-5 font-bold">
                Meaningful changes
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                MarketPulse focuses attention on movement that
                actually matters instead of showing endless data.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <div className="text-2xl">⚡</div>
              <h3 className="mt-5 font-bold">
                Built for speed
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Automatic refreshing keeps your dashboard
                current without constantly reloading the page.
              </p>
            </div>

          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-16 border-t border-white/5 py-8 text-center text-xs text-slate-700">
          MarketPulse · Intelligent market monitoring
        </footer>

      </div>
    </main>
  );
}