import { describe, it, expect } from "vitest";
import request from "supertest";
import path from "node:path";

// Use a unique DB file for this test process.
// This avoids Windows SQLite file-lock issues.
process.env.DB_PATH = path.join(
  process.cwd(),
  "data",
  `test-${process.pid}.db`
);

const { createApp } = await import("../src/api/app.js");
const app = createApp();

describe("MarketPulse API — since-you-were-away flow", () => {
  it("creates a watchlist, adds stocks, and returns a first-visit briefing", async () => {
    const createRes = await request(app)
      .post("/api/watchlists")
      .send({ name: "My Watchlist" });

    expect(createRes.status).toBe(201);

    const watchlistId = createRes.body.id;

    await request(app)
      .post(`/api/watchlists/${watchlistId}/stocks`)
      .send({
        symbol: "TCS",
        companyName: "Tata Consultancy Services",
        priority: "HIGH",
      })
      .expect(201);

    const firstVisit = await request(app).post(
      `/api/watchlists/${watchlistId}/visit`
    );

    expect(firstVisit.status).toBe(200);
    expect(firstVisit.body.isFirstVisit).toBe(true);
    expect(firstVisit.body.items[0].result.score).toBe(0);
  });

  it("returns a second-visit briefing for an existing watchlist", async () => {
    const createRes = await request(app)
      .post("/api/watchlists")
      .send({ name: "Second List" });

    expect(createRes.status).toBe(201);

    const watchlistId = createRes.body.id;

    await request(app)
      .post(`/api/watchlists/${watchlistId}/stocks`)
      .send({
        symbol: "TCS",
        companyName: "Tata Consultancy Services",
        priority: "MEDIUM",
      })
      .expect(201);

    const firstVisit = await request(app).post(
      `/api/watchlists/${watchlistId}/visit`
    );

    expect(firstVisit.status).toBe(200);
    expect(firstVisit.body.isFirstVisit).toBe(true);

    const secondVisit = await request(app).post(
      `/api/watchlists/${watchlistId}/visit`
    );

    expect(secondVisit.status).toBe(200);
    expect(secondVisit.body.isFirstVisit).toBe(false);
    expect(secondVisit.body.lastVisitAt).toBeTruthy();
  });

  it("rejects an empty watchlist name with a 400", async () => {
    const res = await request(app)
      .post("/api/watchlists")
      .send({ name: "" });

    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent watchlist", async () => {
    const res = await request(app).get(
      "/api/watchlists/does-not-exist"
    );

    expect(res.status).toBe(404);
  });
});