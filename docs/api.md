# MarketPulse — API Reference

Base URL: `http://localhost:4000/api`. All bodies are JSON. All responses
use the DTOs in `backend/src/common/types.ts` — no JPA/ORM entities are
exposed directly.

## Watchlists

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/watchlists` | — | Lists the demo user's watchlists |
| POST | `/watchlists` | `{ name }` | 201 on success |
| GET | `/watchlists/:id` | — | 404 if not found |
| PUT | `/watchlists/:id` | `{ name }` | Rename |
| DELETE | `/watchlists/:id` | — | 204 on success |
| POST | `/watchlists/:id/stocks` | `{ symbol, companyName, priority? }` | Adds a stock; no-op if already present (UNIQUE constraint) |
| DELETE | `/watchlists/:id/stocks/:symbol` | — | |
| PUT | `/watchlists/:id/stocks/:symbol/priority` | `{ priority }` | HIGH / MEDIUM / LOW |
| PUT | `/watchlists/:id/stocks/reorder` | `{ symbols: string[] }` | Full ordering |

## The core feature

| Method | Path | Notes |
|---|---|---|
| POST | `/watchlists/:id/visit` | Records this visit, compares against the previous one, returns a full `Briefing` (see below). **This is what the frontend calls every time the page loads.** |

`Briefing` shape:
```json
{
  "watchlistId": "...",
  "generatedAt": "2026-09-04T06:29:06.283Z",
  "lastVisitAt": "2026-09-04T06:29:06.223Z",
  "isFirstVisit": false,
  "meaningfulChangeCount": 1,
  "highAttentionCount": 1,
  "items": [
    {
      "priority": "HIGH",
      "result": {
        "symbol": "TCS",
        "companyName": "Tata Consultancy Services",
        "previousPrice": 3641.72,
        "currentPrice": 3844.44,
        "percentChange": 5.57,
        "score": 93,
        "attentionLevel": "HIGH_ATTENTION",
        "factors": [ { "key": "priceDeviation", "label": "Price anomaly", "rawValue": 1, "weight": 0.3, "contribution": 30 }, "..." ],
        "explanation": "TCS is up 5.6% since your last visit. ...",
        "freshness": "FRESH"
      }
    }
  ],
  "marketStatus": { "isOpen": true, "label": "Market open" }
}
```

## Reference data

| Method | Path | Notes |
|---|---|---|
| GET | `/stocks` | The demo universe (symbol/company/sector), used to populate the "add stock" picker |
| GET | `/health` | Liveness check |

## Demo controls
Not part of the "production" surface — would be gated behind a feature flag
in a real deploy (brief §37: "do not expose dangerous simulation controls in
production mode").

| Method | Path | Body |
|---|---|---|
| POST | `/demo/scenario` | `{ scenario: "NORMAL_DAY" \| "SUDDEN_DROP" \| "ABNORMAL_VOLUME_RISE" \| "MARKET_WIDE_DECLINE" \| "NO_CHANGE" }` |
| POST | `/demo/time-travel` | `{ minutesForward: number }` — moves the mock provider's internal clock |
| POST | `/demo/reset` | — resets scenario and clock |

## Errors
Validation failures return `400` with a Zod `issues` array. Not-found
resources return `404`. Everything else returns `500` with a generic
message (details are logged server-side via the structured logger, never
leaked to the client — brief §33/§38).
