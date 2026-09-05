# MarketPulse — Architecture

## 1. Target user
Someone who follows 5–30 stocks but doesn't check the market constantly.
They open the app after hours or days away and need one question answered:
**"What actually changed, and what deserves my attention right now?"**

## 2. Core problem
A price ticker gives data. It doesn't give *judgment*. Users end up scanning every
row themselves to decide what matters — that's the work the product should do
for them.

## 3. Product hypothesis
If we (a) persist a snapshot of the market state at the user's last visit, and
(b) score the *delta* between that snapshot and now using multiple signals
(price, volume, relative-to-sector, relative-to-market, historical deviation,
user priority) instead of a single price threshold, we can surface a short,
explainable, ranked list that's actually worth reading — and users will trust
it because every score shows its work.

## 4. Why a modular monolith, not microservices
Five modules (market data, snapshot, change/scoring, watchlist, API) with one
deployable. Justification: this is a single-team, single-database product at
MVP scale — network hops between "services" would add latency and failure
modes without adding anything. Boundaries are enforced at the module/interface
level in code, so splitting later (if `marketdata` needs independent scaling
for real load) is a refactor, not a rewrite.

## 5. High-level flow

```
React (Vite/TS)
      │ REST (JSON)
      ▼
Express API layer  ──────────────┐
      │                          │
      ▼                          │
Watchlist Service                │
      │                          │
      ▼                          │
Snapshot Service ──compares──►  Change Intelligence Engine
      │                          │        (pure functions,
      ▼                          │         no I/O, unit-testable
Market Data Service               │         in isolation)
      │                          ▼
      ▼                    Attention Ranking
MarketDataProvider (interface)
   ├── MockMarketDataProvider   (deterministic demo data, default)
   └── ExternalMarketDataProvider (pluggable, real API — stubbed)
      │
      ▼
SQLite (dev) / swappable for Postgres (documented, not wired up in MVP)
```

## 6. Why SQLite instead of Postgres for this deliverable
The spec calls for Postgres + Docker + Redis. I'm not standing those up here
because (a) this sandbox has no way to run a persistent Postgres/Redis
container for you to actually hit, and (b) for a reviewer running `npm
install && npm run dev` from a clean checkout, a zero-install embedded DB is
strictly better UX with identical schema/logic. The persistence layer sits
behind a repository interface for exactly this reason — swapping SQLite for
Postgres later is a driver change, not a rewrite of business logic. This is
documented as a trade-off in the README, not hidden.

## 7. Failure scenarios handled
- Market provider throws / times out → fall back to last cached snapshot,
  mark `STALE`, keep the app usable.
- No previous visit exists → show "first visit" state, not an error.
- No meaningful changes → show "you're all caught up", not a manufactured
  insight.
- Conflicting values from two sources → primary-source-wins policy, logged
  discrepancy (see `docs/product-decisions.md`).

## 8. Scaling strategy (documented, not built at MVP scale)
- Market data is fetched once per symbol per refresh cycle and shared across
  all users watching that symbol (`marketdata` service is keyed by symbol,
  not by user) — this is already true in the MVP code, it's just serving from
  an in-process cache instead of Redis.
- Real deployment: a scheduler job refreshes symbols in batch, writes to
  Redis, and per-user requests never hit the external provider directly.
- DB indexes: `(watchlist_id, symbol)`, `(stock_id, timestamp)` for snapshot
  history lookups — see `docs/schema.md` equivalent in the Prisma schema
  comments.
