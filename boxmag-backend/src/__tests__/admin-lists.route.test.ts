import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminCookie, ensureTestAuthEnv, userCookie } from "./test-helpers";

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

/** Admin list endpoints: customers, newsletter subscribers, contact inbox. */
describe("admin list endpoints", () => {
  beforeEach(() => {
    ensureTestAuthEnv();
    queryMock.mockReset();
    queryMock.mockResolvedValue([[]]);
    executeMock.mockReset();
  });

  describe("GET /api/customers", () => {
    it("requires admin", async () => {
      const anonymous = await request(app).get("/api/customers");
      expect(anonymous.status).toBe(401);
      const customer = await request(app).get("/api/customers").set("Cookie", userCookie());
      expect(customer.status).toBe(401);
      expect(queryMock).not.toHaveBeenCalled();
    });

    it("lists customers without password or token columns", async () => {
      queryMock.mockResolvedValueOnce([
        [
          {
            id: 3,
            email: "ana@example.com",
            first_name: "Ana",
            last_name: "Pop",
            company_name: "Ana SRL",
            vat_number: "RO123",
            phone: "0700",
            is_active: 1,
            email_verified_at: new Date("2026-01-02T00:00:00Z"),
            last_login_at: null,
            created_at: new Date("2026-01-01T00:00:00Z"),
            orders_count: 4,
          },
        ],
      ]);

      const response = await request(app).get("/api/customers").set("Cookie", adminCookie());

      expect(response.status).toBe(200);
      expect(response.body.data[0]).toMatchObject({
        email: "ana@example.com",
        companyName: "Ana SRL",
        isActive: true,
        ordersCount: 4,
      });
      const sql = String(queryMock.mock.calls[0]?.[0]);
      expect(sql).not.toContain("password_hash");
      expect(sql).not.toContain("token_hash");
    });

    it("searches and paginates", async () => {
      queryMock.mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ total: 31 }]]);

      const response = await request(app)
        .get("/api/customers")
        .query({ q: "Ana", page: "2", pageSize: "10" })
        .set("Cookie", adminCookie());

      expect(response.body.meta).toEqual({ total: 31, page: 2, pageSize: 10 });
      expect(queryMock.mock.calls[0]?.[1]).toEqual(["%ana%", "%ana%", "%ana%", "%ana%", 10, 10]);
    });
  });

  describe("GET /api/newsletter/subscribers", () => {
    it("requires admin", async () => {
      const response = await request(app).get("/api/newsletter/subscribers");
      expect(response.status).toBe(401);
    });

    it("filters by status and search", async () => {
      await request(app)
        .get("/api/newsletter/subscribers")
        .query({ status: "unsubscribed", q: "gmail" })
        .set("Cookie", adminCookie());

      const [sql, params] = queryMock.mock.calls[0] ?? [];
      expect(String(sql)).toContain("consent = 0");
      expect(params).toEqual(["%gmail%"]);
    });

    it("exports CSV with escaped fields and formula injection defused", async () => {
      queryMock.mockResolvedValueOnce([
        [
          {
            id: 1,
            email: "a@example.com",
            consent: 1,
            locale: "ro",
            source: "=HYPERLINK(\"x\")",
            unsubscribed_at: null,
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      ]);

      const response = await request(app)
        .get("/api/newsletter/subscribers")
        .query({ format: "csv", page: "1" })
        .set("Cookie", adminCookie());

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/csv");
      expect(response.headers["content-disposition"]).toContain("attachment");
      expect(response.text).toContain("email,subscribed,locale,source,created_at,unsubscribed_at");
      expect(response.text).toContain(`a@example.com,yes,ro,"'=HYPERLINK(""x"")"`);
      // CSV exports everything: no LIMIT even when page is passed.
      expect(String(queryMock.mock.calls[0]?.[0])).not.toContain("LIMIT");
    });
  });

  describe("GET /api/contact (inbox)", () => {
    it("filters by status and search, with pagination meta", async () => {
      queryMock.mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ total: 3 }]]);

      const response = await request(app)
        .get("/api/contact")
        .query({ status: "new", q: "cutii", page: "1", pageSize: "20" })
        .set("Cookie", adminCookie());

      expect(response.status).toBe(200);
      expect(response.body.meta).toEqual({ total: 3, page: 1, pageSize: 20 });
      const [sql, params] = queryMock.mock.calls[0] ?? [];
      expect(String(sql)).toContain("status = ?");
      expect(params).toEqual(["new", "%cutii%", "%cutii%", "%cutii%", "%cutii%", 20, 0]);
    });

    it("ignores unknown status values", async () => {
      await request(app)
        .get("/api/contact")
        .query({ status: "spam" })
        .set("Cookie", adminCookie());

      expect(String(queryMock.mock.calls[0]?.[0])).not.toContain("status = ?");
    });
  });
});
