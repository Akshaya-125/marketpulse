import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import { z } from "zod";

import { WatchlistRepository } from "../watchlist/WatchlistRepository.js";
import { SnapshotService } from "../snapshot/SnapshotService.js";
import { ExternalMarketDataProvider } from "../marketdata/ExternalMarketDataProvider.js";
import { logger } from "../common/logger.js";

const DEMO_USER_ID = "demo-user";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const watchlistRepo = new WatchlistRepository();

  // Temporary single-user setup for the competition/demo.
  // This is NOT market-data demo mode.
  watchlistRepo.ensureUser(DEMO_USER_ID, "MarketPulse User");

  const provider = new ExternalMarketDataProvider();
  const snapshotService = new SnapshotService(
    provider,
    watchlistRepo
  );

  const asyncHandler =
    (
      fn: (
        req: Request,
        res: Response
      ) => Promise<void>
    ) =>
    (
      req: Request,
      res: Response,
      next: NextFunction
    ) =>
      fn(req, res).catch(next);

  // ============================================================
  // WATCHLISTS
  // ============================================================

  app.get(
    "/api/watchlists",
    asyncHandler(async (_req, res) => {
      res.json(
        watchlistRepo.listForUser(DEMO_USER_ID)
      );
    })
  );

  const createWatchlistSchema = z.object({
    name: z.string().min(1).max(80),
  });

  app.post(
    "/api/watchlists",
    asyncHandler(async (req, res) => {
      const { name } =
        createWatchlistSchema.parse(req.body);

      res.status(201).json(
        watchlistRepo.create(
          DEMO_USER_ID,
          name
        )
      );
    })
  );

  app.get(
    "/api/watchlists/:id",
    asyncHandler(async (req, res) => {
      const wl = watchlistRepo.getById(
        req.params.id
      );

      if (!wl) {
        res.status(404).json({
          error: "Watchlist not found",
        });
        return;
      }

      res.json(wl);
    })
  );

  const renameSchema = z.object({
    name: z.string().min(1).max(80),
  });

  app.put(
    "/api/watchlists/:id",
    asyncHandler(async (req, res) => {
      const { name } =
        renameSchema.parse(req.body);

      watchlistRepo.rename(
        req.params.id,
        name
      );

      res.json(
        watchlistRepo.getById(
          req.params.id
        )
      );
    })
  );

  app.delete(
    "/api/watchlists/:id",
    asyncHandler(async (req, res) => {
      watchlistRepo.delete(
        req.params.id
      );

      res.status(204).end();
    })
  );

  // ============================================================
  // WATCHLIST STOCKS
  // ============================================================

  const addStockSchema = z.object({
    symbol: z.string().min(1).max(20),
    companyName: z.string().min(1).max(120),
    priority: z
      .enum(["HIGH", "MEDIUM", "LOW"])
      .optional(),
  });

  app.post(
    "/api/watchlists/:id/stocks",
    asyncHandler(async (req, res) => {
      const body =
        addStockSchema.parse(req.body);

      watchlistRepo.addStock(
        req.params.id,
        body.symbol.toUpperCase(),
        body.companyName,
        body.priority ?? "MEDIUM"
      );

      res.status(201).json(
        watchlistRepo.getById(
          req.params.id
        )
      );
    })
  );

  app.delete(
    "/api/watchlists/:id/stocks/:symbol",
    asyncHandler(async (req, res) => {
      watchlistRepo.removeStock(
        req.params.id,
        req.params.symbol.toUpperCase()
      );

      res.json(
        watchlistRepo.getById(
          req.params.id
        )
      );
    })
  );

  const prioritySchema = z.object({
    priority: z.enum([
      "HIGH",
      "MEDIUM",
      "LOW",
    ]),
  });

  app.put(
    "/api/watchlists/:id/stocks/:symbol/priority",
    asyncHandler(async (req, res) => {
      const { priority } =
        prioritySchema.parse(req.body);

      watchlistRepo.setPriority(
        req.params.id,
        req.params.symbol.toUpperCase(),
        priority
      );

      res.json(
        watchlistRepo.getById(
          req.params.id
        )
      );
    })
  );

  const reorderSchema = z.object({
    symbols: z.array(z.string()).min(1),
  });

  app.put(
    "/api/watchlists/:id/stocks/reorder",
    asyncHandler(async (req, res) => {
      const { symbols } =
        reorderSchema.parse(req.body);

      watchlistRepo.reorder(
        req.params.id,
        symbols.map((s) =>
          s.toUpperCase()
        )
      );

      res.json(
        watchlistRepo.getById(
          req.params.id
        )
      );
    })
  );

  // ============================================================
  // MARKET INTELLIGENCE
  // ============================================================

  app.post(
    "/api/watchlists/:id/visit",
    asyncHandler(async (req, res) => {
      const briefing =
        await snapshotService.visitAndBrief(
          req.params.id
        );

      res.json(briefing);
    })
  );

  // ============================================================
  // LIVE STOCK UNIVERSE
  // ============================================================

  app.get(
    "/api/stocks",
    asyncHandler(async (_req, res) => {
      res.json(
        provider.listUniverse()
      );
    })
  );

  // ============================================================
  // MARKET INFO
  // ============================================================

  app.get(
    "/api/market-info",
    (_req, res) => {
      res.json({
        mode: "LIVE",
        source: "Yahoo Finance",
      });
    }
  );

  // ============================================================
  // LIVE MARKET OVERVIEW
  // ============================================================

  app.get(
    "/api/market-overview",
    asyncHandler(async (_req, res) => {
      const symbols = [
        "^NSEI",
        "^BSESN",
        "TCS",
        "INFY",
        "RELIANCE",
        "HDFCBANK",
      ];

      const quotes =
        await provider.getQuotes(
          symbols
        );

      const nifty =
        quotes.get("^NSEI") ?? null;

      const sensex =
        quotes.get("^BSESN") ?? null;

      const stocks = [
        "TCS",
        "INFY",
        "RELIANCE",
        "HDFCBANK",
      ]
        .map((symbol) =>
          quotes.get(symbol)
        )
        .filter(
          (
            quote
          ): quote is NonNullable<
            typeof quote
          > => Boolean(quote)
        );

      const market =
        await provider.getMarketStatus();

      res.json({
        mode: "LIVE",
        source: "Yahoo Finance",
        nifty,
        sensex,
        stocks,
        market,
      });
    })
  );

  // ============================================================
  // HEALTH CHECK
  // ============================================================

  app.get(
    "/api/health",
    (_req, res) => {
      res.json({
        ok: true,
        mode: "LIVE",
      });
    }
  );

  // ============================================================
  // ERROR HANDLING
  // ============================================================

  app.use(
    (
      err: unknown,
      _req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          error: "Validation failed",
          details: err.issues,
        });
        return;
      }

      logger.error("api_error", {
        error:
          err instanceof Error
            ? err.message
            : String(err),
      });

      const message =
        err instanceof Error
          ? err.message
          : "Internal server error";

      const status =
        message === "Watchlist not found"
          ? 404
          : 500;

      res.status(status).json({
        error: message,
      });
    }
  );

  return app;
}