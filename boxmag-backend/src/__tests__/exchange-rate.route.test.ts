import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/exchange-rate.service", () => ({
  getEurRonRate: vi.fn(async () => ({
    rate: 5,
    source: "bnr",
    fetchedAt: "2026-01-01T00:00:00.000Z",
  })),
  convertEurToRon: vi.fn((amount: number, rate: number) =>
    +(amount * rate).toFixed(2),
  ),
  roundMoney: vi.fn((amount: number) => +amount.toFixed(2)),
}));

import { app } from "../app";

describe("exchange-rate routes", () => {
  it("returns EUR/RON exchange rate", async () => {
    const response = await request(app).get("/api/exchange-rate/eur-ron");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.rate).toBe(5);
    expect(response.body.data.source).toBe("bnr");
  });
});
