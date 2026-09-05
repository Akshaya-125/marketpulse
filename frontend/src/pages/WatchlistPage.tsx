import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api";
import type {
  Briefing,
  UniverseStock,
  Watchlist,
  Priority,
} from "../types";
import { ChangeCard } from "../components/ChangeCard";

function timeAgo(iso: string | null): string {
  if (!iso) return "never";

  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.max(0, Math.round(ms / 60000));

  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;

  const hr = Math.round(min / 60);

  if (hr < 24) return `${hr}h ago`;

  return `${Math.round(hr / 24)}d ago`;
}

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function WatchlistPage() {
  const { id } = useParams<{ id: string }>();

  const [watchlist, setWatchlist] = useState<Watchlist | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [universe, setUniverse] = useState<UniverseStock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [addSymbol, setAddSymbol] = useState("");
  const [addPriority, setAddPriority] =
    useState<Priority>("MEDIUM");

  const load = useCallback(async () => {
    if (!id) return;

    setError(null);

    if (!watchlist) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [wl, u] = await Promise.all([
        api.getWatchlist(id),
        api.stockUniverse(),
      ]);

      setWatchlist(wl);
      setUniverse(u);

      const b = await api.visit(id);
      setBriefing(b);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load market data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, watchlist]);

  useEffect(() => {
    load();
  }, [id]);

  if (loading && !watchlist) {
    return (
      <main className="min-h-screen bg-[#050816] text-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="animate-pulse">
            <div className="h-4 w-28 rounded bg-slate-800" />
            <div className="mt-5 h-10 w-72 rounded bg-slate-800" />
            <div className="mt-3 h-5 w-96 rounded bg-slate-800" />
            <div className="mt-12 h-48 rounded-2xl bg-slate-900" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#050816] text-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Link
            to="/"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← All watchlists
          </Link>

          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
            <p className="font-semibold text-red-300">
              Market data unavailable
            </p>

            <p className="mt-2 text-sm text-slate-400">
              {error}
            </p>

            <button
              onClick={load}
              className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!watchlist || !briefing) return null;

  const meaningful = briefing.items.filter(
    (i) => i.result.attentionLevel !== "NORMAL"
  );

  const normal = briefing.items.filter(
    (i) => i.result.attentionLevel === "NORMAL"
  );

  const availableToAdd = universe.filter(
    (u) =>
      !watchlist.stocks.some(
        (s) => s.symbol === u.symbol
      )
  );

  const prices = briefing.items
    .map((i) => i.result.percentChange)
    .filter(Number.isFinite);

  const averageChange =
    prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : 0;

  const positive = averageChange >= 0;

  const liveItems = briefing.items.filter(
    (item) => item.result.freshness !== "UNAVAILABLE"
  );

  async function addStock(e: React.FormEvent) {
    e.preventDefault();

    if (!id || !addSymbol) return;

    const stock = universe.find(
      (s) => s.symbol === addSymbol
    );

    if (!stock) return;

    try {
      await api.addStock(
        id,
        stock.symbol,
        stock.companyName,
        addPriority
      );

      setAddSymbol("");
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to add stock."
      );
    }
  }

  async function removeStock(symbol: string) {
    if (!id) return;

    try {
      await api.removeStock(id, symbol);
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to remove stock."
      );
    }
  }

  async function changePriority(
    symbol: string,
    priority: Priority
  ) {
    if (!id) return;

    try {
      await api.setPriority(
        id,
        symbol,
        priority
      );

      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to update priority."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8 lg:py-10">

        {/* NAV */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            ← All watchlists
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              LIVE MARKET DATA
            </div>

            <button
              onClick={load}
              disabled={refreshing}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-sky-400/40 hover:bg-white/[0.06] disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "↻ Refresh"}
            </button>
          </div>
        </div>

        {/* HEADER */}
        <header className="mt-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  {watchlist.name}
                </h1>

                <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                  {watchlist.stocks.length} stocks
                </span>
              </div>

              <p className="mt-3 text-slate-400">
                {briefing.marketStatus.label}
                <span className="mx-2 text-slate-700">
                  •
                </span>
                Updated {timeAgo(briefing.generatedAt)}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Live NSE data · Yahoo Finance · Server-side market feed
              </p>
            </div>

            {/* MOVEMENT */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5">
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Watchlist movement
              </p>

              <p
                className={`mt-1 text-3xl font-bold tabular-nums ${
                  positive
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {positive ? "+" : ""}
                {averageChange.toFixed(2)}%
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Average daily movement
              </p>
            </div>
          </div>
        </header>

        {/* MARKET SUMMARY */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="dashboard-card">
            <p className="dashboard-label">
              Meaningful changes
            </p>

            <p className="dashboard-value">
              {briefing.meaningfulChangeCount}
            </p>

            <p className="dashboard-sub">
              Signals worth reviewing
            </p>
          </div>

          <div className="dashboard-card">
            <p className="dashboard-label">
              High attention
            </p>

            <p className="dashboard-value text-red-400">
              {briefing.highAttentionCount}
            </p>

            <p className="dashboard-sub">
              Highest-priority signals
            </p>
          </div>

          <div className="dashboard-card">
            <p className="dashboard-label">
              Market status
            </p>

            <p className="mt-2 text-xl font-bold">
              {briefing.marketStatus.isOpen
                ? "Open"
                : "Closed"}
            </p>

            <p className="dashboard-sub">
              NSE · India
            </p>
          </div>

          <div className="dashboard-card">
            <p className="dashboard-label">
              Live stocks
            </p>

            <p className="dashboard-value text-sky-400">
              {liveItems.length}
              <span className="text-lg text-slate-600">
                /{briefing.items.length}
              </span>
            </p>

            <p className="dashboard-sub">
              Successfully fetched
            </p>
          </div>

        </section>

        {/* INTELLIGENCE */}
        <section className="mt-12">

          <div className="flex items-end justify-between">
            <div>
              <p className="section-eyebrow">
                Intelligence
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                {briefing.isFirstVisit
                  ? "Your first market briefing"
                  : "What changed while you were away"}
              </h2>
            </div>

            {!briefing.isFirstVisit && (
              <span className="hidden text-sm text-slate-500 sm:block">
                Since your last visit · 
                {timeAgo(briefing.lastVisitAt)}
              </span>
            )}
          </div>

          {briefing.isFirstVisit ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-2xl text-sky-300">
                ✦
              </div>

              <h3 className="mt-4 text-lg font-semibold">
                Baseline created
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                MarketPulse will compare your next visit
                against this live market snapshot and
                surface meaningful changes.
              </p>

            </div>
          ) : meaningful.length === 0 ? (

            <div className="mt-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.03] p-10 text-center">

              <div className="text-3xl text-emerald-400">
                ✓
              </div>

              <h3 className="mt-3 text-lg font-semibold text-emerald-300">
                You're all caught up
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                No meaningful changes detected since
                your last visit.
              </p>

            </div>

          ) : (

            <>
              <p className="mt-2 text-sm text-slate-500">
                {meaningful.length} signal
                {meaningful.length === 1 ? "" : "s"}{" "}
                deserve
                {meaningful.length === 1
                  ? ""
                  : "s"} your attention.
              </p>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {meaningful.map((item) => (
                  <ChangeCard
                    key={item.result.symbol}
                    item={item}
                  />
                ))}
              </div>
            </>
          )}

        </section>

        {/* WATCHLIST */}
        <section className="mt-12">

          <div>
            <p className="section-eyebrow">
              Portfolio
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Your watchlist
            </h2>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">

            {watchlist.stocks.map(
              (stock, index) => {

                const item =
                  briefing.items.find(
                    (i) =>
                      i.result.symbol ===
                      stock.symbol
                  );

                const change =
                  item?.result.percentChange ?? 0;

                return (
                  <div
                    key={stock.symbol}
                    className="group flex flex-col gap-4 border-b border-white/5 px-5 py-5 transition hover:bg-white/[0.025] last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div className="flex items-center gap-4">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-slate-400">
                        {String(index + 1).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      <div>
                        <div className="font-bold">
                          {stock.symbol}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">
                          {stock.companyName}
                        </div>
                      </div>

                    </div>

                    <div className="flex flex-wrap items-center gap-5">

                      <div className="text-right">
                        <div className="font-semibold tabular-nums">
                          {item
                            ? money(
                                item.result
                                  .currentPrice
                              )
                            : "—"}
                        </div>

                        <div
                          className={`mt-1 text-xs font-semibold ${
                            change >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {change >= 0
                            ? "+"
                            : ""}
                          {change.toFixed(2)}%
                        </div>
                      </div>

                      <select
                        value={stock.priority}
                        onChange={(e) =>
                          changePriority(
                            stock.symbol,
                            e.target.value as Priority
                          )
                        }
                        className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-300 outline-none"
                      >
                        <option value="HIGH">
                          High
                        </option>

                        <option value="MEDIUM">
                          Medium
                        </option>

                        <option value="LOW">
                          Low
                        </option>
                      </select>

                      <button
                        onClick={() =>
                          removeStock(
                            stock.symbol
                          )
                        }
                        className="text-xs font-medium text-red-400 transition hover:text-red-300"
                      >
                        Remove
                      </button>

                    </div>
                  </div>
                );
              }
            )}

          </div>

          {/* ADD STOCK */}
          {availableToAdd.length > 0 && (
            <form
              onSubmit={addStock}
              className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row"
            >

              <select
                value={addSymbol}
                onChange={(e) =>
                  setAddSymbol(e.target.value)
                }
                className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200 outline-none"
              >
                <option value="">
                  Add a stock...
                </option>

                {availableToAdd.map((s) => (
                  <option
                    key={s.symbol}
                    value={s.symbol}
                  >
                    {s.symbol} —{" "}
                    {s.companyName}
                  </option>
                ))}
              </select>

              <select
                value={addPriority}
                onChange={(e) =>
                  setAddPriority(
                    e.target.value as Priority
                  )
                }
                className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200 outline-none"
              >
                <option value="HIGH">
                  High
                </option>

                <option value="MEDIUM">
                  Medium
                </option>

                <option value="LOW">
                  Low
                </option>
              </select>

              <button
                type="submit"
                disabled={!addSymbol}
                className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-sky-400 disabled:opacity-40"
              >
                + Add stock
              </button>

            </form>
          )}

        </section>

        {/* QUIET MARKET */}
        {normal.length > 0 &&
          !briefing.isFirstVisit && (
            <section className="mt-12">

              <p className="section-eyebrow">
                Quiet market
              </p>

              <h2 className="mt-1 text-xl font-bold">
                No significant movement
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                {normal.map((item) => (
                  <div
                    key={item.result.symbol}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:bg-white/[0.04]"
                  >

                    <div className="flex justify-between">
                      <span className="font-semibold">
                        {item.result.symbol}
                      </span>

                      <span className="text-xs text-emerald-400">
                        Normal
                      </span>
                    </div>

                    <div className="mt-3 flex justify-between text-sm">

                      <span className="text-slate-500">
                        {money(
                          item.result.currentPrice
                        )}
                      </span>

                      <span
                        className={
                          item.result.percentChange >=
                          0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {item.result.percentChange >=
                        0
                          ? "+"
                          : ""}
                        {item.result.percentChange.toFixed(
                          2
                        )}
                        %
                      </span>

                    </div>

                  </div>
                ))}

              </div>

            </section>
          )}

        {/* FOOTER */}
        <footer className="mt-16 border-t border-white/5 pt-6 text-center text-xs text-slate-600">
          MarketPulse · Live market intelligence ·
          Data provided by Yahoo Finance
        </footer>

      </div>
    </main>
  );
}