# MarketPulse

**Know what changed while you were away.**

## 1. Product pitch (100 words)

MarketPulse replaces a price ticker with a briefing. Most watchlists show
every number; ours answers one question — what actually changed since you
last looked, and does it matter? A deterministic Change Intelligence Engine
scores each stock on price deviation (normalized against its own
volatility), volume anomaly, relative performance versus sector and market,
and detected events — never an opaque AI number. Every score ships with its
factor breakdown, so "why" is always answerable. Snapshots persist server-
side per visit, so leaving and returning is the core loop, not an
afterthought. Built as a modular monolith, deliberately, over premature
microservices.

## 2. The problem with a normal watchlist
A ticker gives you data. It doesn't tell you whether a 2% move matters for
*that* stock, or whether the whole sector just did the same thing. Users end
up doing the comparison work themselves, every time they open the app.
MarketPulse does that comparison for you and shows its work.

## 3. Product philosophy
See `docs/architecture.md` and `docs/product-decisions.md` for the full
reasoning. Short version: **explainability over magic, deterministic scoring
over an LLM deciding, graceful degradation over assuming every dependency is
up, and a modular monolith over microservices nobody needs yet.**

## 4. Features
- Create / rename / delete watchlists; add / remove stocks; set per-stock
  priority (HIGH/MEDIUM/LOW)
- **"Since you last checked"** — the primary screen. Ranked list of what
  meaningfully changed, each with a plain-English explanation
- **Explainable Attention Score (0–100)** with a visible factor breakdown
  (price anomaly / volume anomaly / volatility / relative performance /
  event impact) — never a black box
- Data freshness labeling (FRESH / DELAYED / STALE / UNAVAILABLE) — never
  pretends stale data is live
- Deterministic **demo mode** with 5 scenarios + a time-travel control, so
  the core feature is demonstrable without waiting on real market movement
- Graceful degradation: provider failure, missing quote, and first-visit
  states are all first-class UI states, not error screens

## 5. Architecture
Full detail in `docs/architecture.md`. Summary:

```
React (Vite/TS) → REST → Express API → Watchlist / Snapshot services
                                              │
                                    Change Intelligence Engine (pure fns)
                                              │
                                     MarketDataProvider (interface)
                                       ├── MockMarketDataProvider (default)
                                       └── ExternalMarketDataProvider (stub)
                                              │
                                            SQLite (dev) — swap-in point for Postgres
```
Modular monolith, not microservices — justified in `docs/architecture.md` §4.

## 6. Tech stack
- **Backend**: Node.js, TypeScript, Express, Zod validation, better-sqlite3,
  Vitest + Supertest
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, React Router
- **Deployment (documented, not required locally)**: Docker Compose,
  PostgreSQL, Redis

This is a deliberate deviation from the Java/Spring Boot line in the
original brief — see `docs/product-decisions.md` §1 for why.

## 7. Database design
See `backend/src/common/db.ts` for the live schema (SQLite for this
delivery; the same shape maps directly onto Postgres tables). Key points:
- `watchlist_stocks` has `UNIQUE(watchlist_id, symbol)` — no duplicate adds
- `snapshots` stores one row **per visit per symbol**, not just "current
  price" — this is what makes "since you were away" possible at all
- Indexes on `(watchlist_id, symbol, visited_at)` because every briefing
  query is "give me this symbol's latest snapshot before now"

## 8. Meaningful-change algorithm
Full derivation in `docs/scoring.md`. In short:
```
score = 30% priceDeviation (z-score vs the stock's own volatility)
      + 20% volumeAnomaly (vs 20-session average)
      + 15% volatilityChange (today's move vs typical daily move)
      + 20% relativePerformance (divergence from sector AND market — not raw magnitude)
      + 15% eventImpact
```
Classified into NORMAL / WORTH_WATCHING / SIGNIFICANT / HIGH_ATTENTION.
User priority is **excluded** from this formula on purpose — it only
re-orders the attention queue, so a HIGH-priority stock can never fake a
high score. Verified in `backend/tests/change.engine.test.ts` and
`rankAttention.test.ts`.

## 9. Data freshness strategy
`FRESH` < 2 min, `DELAYED` 2–15 min, `STALE` > 15 min, `UNAVAILABLE` if no
timestamp — or if the timestamp is in the future (never trusted). See
`backend/src/marketdata/freshness.ts`.

## 10. Failure handling
- Market provider throws → briefing shows `UNAVAILABLE` for that stock only;
  the rest of the watchlist still renders (`SnapshotService.visitAndBrief`)
- No previous visit → explicit first-visit state, not an error or a
  fabricated score
- Validation errors → `400` with field-level detail (Zod)
- Unknown routes/resources → `404`
- Everything else → `500` with a generic client message, full detail logged
  server-side only (`backend/src/common/logger.ts`) — no secrets ever logged

## 11. Scaling strategy (documented; MVP keeps it simple on purpose)
- Market data is already keyed by symbol, not by user, everywhere in the
  code — N users watching TCS share one fetch once the in-process cache is
  swapped for Redis
- Real deployment: a scheduler batch-refreshes symbols into Redis; requests
  never call the external provider directly
- DB indexes already in place for the hot query path (§7)
- Documented, not built at this scale, because there's no load to size
  against yet — see `docs/architecture.md` §8

## 12. Trade-offs — what was intentionally NOT built
- **No real auth** — single demo user, seeded on boot. Orthogonal to the
  differentiator; the brief explicitly says don't let it distract.
- **No LLM explanation layer wired to a live key** — the deterministic
  `factors[]` breakdown already satisfies explainability end-to-end; adding
  a real LLM call here would just be a rephrasing layer with a failure mode
  I'd rather not ship un-demoed.
- **No live external market API** — `ExternalMarketDataProvider` exists as
  a stub proving the abstraction holds; not wired to a real key (see
  `docs/product-decisions.md`).
- **No Postgres/Redis running for this delivery** — SQLite + in-process
  cache behind the same interfaces; `docker-compose.yml` documents the real
  path.
- **No pagination, no i18n, no full a11y audit** — out of scope for an MVP.

## 13. Setup
```bash
# Backend
cd backend
cp ../.env.example .env   # optional — sensible defaults work out of the box
npm install
npm run dev                # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173, proxies /api to :4000
```
No Docker, no Postgres, no API keys required to run the full app locally.

### Tests
```bash
cd backend
npm test                   # 25 tests: engine, freshness, ranking, provider, API integration
```

## 14. Docker
`docker-compose.yml` documents the Postgres+Redis production topology. To
actually run it, the backend's SQLite driver and in-process cache would need
to be swapped for Postgres/Redis clients first (both sit behind narrow
interfaces specifically so that's a contained change) — not done in this
delivery; see trade-offs above.

## 15. API
Full reference in `docs/api.md`. Core endpoint: `POST
/api/watchlists/:id/visit` — records the visit and returns the ranked
briefing in one call.

## 16. Known limitations
- Single demo user, no real authentication
- Mock market data only — 4-stock universe (TCS, INFY, RELIANCE, HDFCBANK)
- News/events are clearly-labeled synthetic demo events, not real news
- No pagination for very large watchlists
- Freshness/staleness is only meaningfully exercised via the demo
  scenario/time-travel controls, not against a real flaky API

## 17. Future improvements
- Wire `ExternalMarketDataProvider` to a real quote API with proper
  rate-limit handling and retries
- Real auth (JWT) once there's more than one user to isolate
- Swap SQLite → Postgres, in-process cache → Redis (interfaces are already
  in place for both)
- Background scheduler for batch market refresh instead of per-visit fetch
- Historical timeline view per stock (data model already supports it —
  `snapshots` stores full history, the UI just doesn't chart it yet)

## 18. Demo instructions
1. `npm run dev` in both `backend/` and `frontend/`, open `localhost:5173`
2. Create a watchlist, add a few stocks (TCS, RELIANCE, INFY, HDFCBANK)
3. Note the "first visit" state — nothing to compare yet
4. Scroll to **Demo mode**, click **"Abnormal volume rise (TCS)"** — this
   both changes the simulated market state *and* fast-forwards the mock
   clock 3 hours, then reloads
5. See TCS surface as 🔴 High Attention with a full factor breakdown —
   click "Why?" to expand it
6. Try **"No meaningful changes"** to see the empty state, and **"Sudden
   drop"** / **"Market-wide decline"** for the other scenarios
7. Click **Reset** to return to a neutral state
