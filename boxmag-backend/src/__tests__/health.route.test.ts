import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../app";

describe("health route", () => {
  it("returns ok status without leaking database configuration", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(typeof response.body.environment).toBe("string");
    expect(typeof response.body.timestamp).toBe("string");
    expect(response.body.database).toBeUndefined();
  });
});
