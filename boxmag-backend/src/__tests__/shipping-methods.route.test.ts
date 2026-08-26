import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE_NAME, createAdminSessionToken } from "../config/admin-auth";

const { queryMock, executeMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  executeMock: vi.fn(),
}));

vi.mock("../db/mysql", () => ({
  mysqlPool: {
    query: queryMock,
    execute: executeMock,
  },
}));

import { app } from "../app";

const ADMIN_PASSWORD = "test-admin-password";

function adminCookie(): string {
  return `${ADMIN_COOKIE_NAME}=${createAdminSessionToken(ADMIN_PASSWORD)}`;
}

describe("shipping methods routes", () => {
  beforeEach(() => {
    queryMock.mockReset();
    executeMock.mockReset();
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  });

  it("lists active shipping methods without auth", async () => {
    queryMock.mockResolvedValueOnce([
      [
        {
          id: 1,
          method_key: "standard",
          name: "Standard",
          eta_text: "3-5 days",
          price: "19.99",
          is_active: 1,
          sort_order: 0,
        },
      ],
    ]);

    const response = await request(app).get("/api/shipping-methods");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual([
      {
        id: 1,
        key: "standard",
        name: "Standard",
        etaText: "3-5 days",
        price: 19.99,
        isActive: true,
        sortOrder: 0,
      },
    ]);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("WHERE is_active = 1"));
  });

  it("blocks includeInactive query without admin auth", async () => {
    const response = await request(app).get("/api/shipping-methods?includeInactive=true");

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });

  it("allows includeInactive query with admin auth", async () => {
    queryMock.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .get("/api/shipping-methods?includeInactive=true")
      .set("Cookie", adminCookie());

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(queryMock).toHaveBeenCalledWith(expect.not.stringContaining("WHERE is_active = 1"));
  });

  it("blocks creating a shipping method without admin auth", async () => {
    const response = await request(app).post("/api/shipping-methods").send({
      key: "express",
      name: "Express",
      etaText: "1-2 days",
      price: 29.99,
    });

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });

  it("returns 400 when create payload is invalid", async () => {
    const response = await request(app)
      .post("/api/shipping-methods")
      .set("Cookie", adminCookie())
      .send({ key: "express", name: "Express" });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Invalid shipping method payload");
  });

  it("returns 400 when create price is negative", async () => {
    const response = await request(app)
      .post("/api/shipping-methods")
      .set("Cookie", adminCookie())
      .send({ key: "express", name: "Express", etaText: "1-2 days", price: -29.99 });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Invalid shipping method payload");
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns 400 when create sortOrder is negative", async () => {
    const response = await request(app)
      .post("/api/shipping-methods")
      .set("Cookie", adminCookie())
      .send({
        key: "express",
        name: "Express",
        etaText: "1-2 days",
        price: 29.99,
        sortOrder: -1,
      });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns 400 when update price or sortOrder is negative", async () => {
    const negativeUpdates = [{ price: -1 }, { sortOrder: -1 }];

    for (const override of negativeUpdates) {
      const response = await request(app)
        .put("/api/shipping-methods/5")
        .set("Cookie", adminCookie())
        .send({
          key: "express",
          name: "Express",
          etaText: "1-2 days",
          price: 29.99,
          ...override,
        });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.message).toContain("Invalid update shipping method payload");
    }

    expect(executeMock).not.toHaveBeenCalled();
  });

  it("creates a shipping method with admin auth", async () => {
    executeMock.mockResolvedValueOnce([{ insertId: 5, affectedRows: 1 }]);

    const response = await request(app)
      .post("/api/shipping-methods")
      .set("Cookie", adminCookie())
      .send({
        key: "express",
        name: "Express",
        etaText: "1-2 days",
        price: 29.99,
        isActive: true,
        sortOrder: 1,
      });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual({ id: 5 });
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO shipping_methods"),
      ["express", "Express", "1-2 days", 29.99, 1, 1],
    );
  });

  it("returns 404 when updating a missing shipping method", async () => {
    executeMock.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const response = await request(app)
      .put("/api/shipping-methods/99")
      .set("Cookie", adminCookie())
      .send({ key: "express", name: "Express", etaText: "1-2 days", price: 29.99 });

    expect(response.status).toBe(404);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Shipping method not found");
  });

  it("updates a shipping method with admin auth", async () => {
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .put("/api/shipping-methods/5")
      .set("Cookie", adminCookie())
      .send({
        key: "express",
        name: "Express Updated",
        etaText: "1 day",
        price: 39.99,
        isActive: false,
        sortOrder: 2,
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual({ id: 5 });
  });

  it("blocks deleting a shipping method without admin auth", async () => {
    const response = await request(app).delete("/api/shipping-methods/5");

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });

  it("returns 400 for an invalid shipping method id on delete", async () => {
    const response = await request(app)
      .delete("/api/shipping-methods/not-a-number")
      .set("Cookie", adminCookie());

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Invalid shipping method id");
  });

  it("deletes a shipping method with admin auth", async () => {
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .delete("/api/shipping-methods/5")
      .set("Cookie", adminCookie());

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual({ id: 5 });
  });
});
