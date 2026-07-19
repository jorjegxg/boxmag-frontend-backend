import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { USER_COOKIE_NAME, createUserSessionToken } from "../config/user-auth";

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

const USER_EMAIL = "customer@example.com";

function userCookie(userId = 7): string {
  const token = createUserSessionToken(userId, USER_EMAIL);
  if (!token) throw new Error("Failed to create user session token");
  return `${USER_COOKIE_NAME}=${token}`;
}

const validAddressPayload = {
  firstName: "Ion",
  lastName: "Popescu",
  addressLine1: "Str. Test 1",
  postcode: "010101",
  city: "Bucharest",
  country: "RO",
};

describe("addresses routes", () => {
  beforeEach(() => {
    queryMock.mockReset();
    executeMock.mockReset();
    process.env.USER_SESSION_SECRET = "test-user-session-secret";
  });

  it("blocks listing addresses without a user session", async () => {
    const response = await request(app).get("/api/addresses");

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });

  it("lists addresses for the authenticated user", async () => {
    executeMock
      .mockResolvedValueOnce([[{ id: 7 }]])
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            label: "Home",
            company_name: null,
            first_name: "Ion",
            last_name: "Popescu",
            phone: null,
            address_line_1: "Str. Test 1",
            address_line_2: null,
            postcode: "010101",
            city: "Bucharest",
            country: "RO",
            is_default_billing: 1,
            is_default_shipping: 1,
          },
        ],
      ]);

    const response = await request(app).get("/api/addresses").set("Cookie", userCookie());

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: 1,
      firstName: "Ion",
      isDefaultBilling: true,
      isDefaultShipping: true,
    });
  });

  it("returns 404 when the session user no longer exists", async () => {
    executeMock.mockResolvedValueOnce([[]]);

    const response = await request(app).get("/api/addresses").set("Cookie", userCookie());

    expect(response.status).toBe(404);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("User not found");
  });

  it("blocks creating an address without a user session", async () => {
    const response = await request(app).post("/api/addresses").send(validAddressPayload);

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });

  it("returns 400 when create payload is missing required fields", async () => {
    const response = await request(app)
      .post("/api/addresses")
      .set("Cookie", userCookie())
      .send({ firstName: "Ion" });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Invalid address payload");
  });

  it("creates an address for the authenticated user", async () => {
    executeMock
      .mockResolvedValueOnce([[{ id: 7 }]])
      .mockResolvedValueOnce([{ insertId: 3, affectedRows: 1 }]);

    const response = await request(app)
      .post("/api/addresses")
      .set("Cookie", userCookie())
      .send(validAddressPayload);

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual({ id: 3 });
  });

  it("returns 404 when updating an address that does not belong to the user", async () => {
    executeMock
      .mockResolvedValueOnce([[{ id: 7 }]])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);

    const response = await request(app)
      .put("/api/addresses/99")
      .set("Cookie", userCookie())
      .send(validAddressPayload);

    expect(response.status).toBe(404);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Address not found");
  });

  it("updates an address for the authenticated user", async () => {
    executeMock
      .mockResolvedValueOnce([[{ id: 7 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .put("/api/addresses/3")
      .set("Cookie", userCookie())
      .send(validAddressPayload);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual({ id: 3 });

    const updateArgs = executeMock.mock.calls[1]?.[1] as unknown[];
    expect(updateArgs?.[updateArgs.length - 2]).toBe(3);
    expect(updateArgs?.[updateArgs.length - 1]).toBe(7);
  });

  it("blocks deleting an address without a user session", async () => {
    const response = await request(app).delete("/api/addresses/3");

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });

  it("deletes an address scoped to the authenticated user", async () => {
    executeMock
      .mockResolvedValueOnce([[{ id: 7 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .delete("/api/addresses/3")
      .set("Cookie", userCookie());

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual({ id: 3 });
    expect(executeMock).toHaveBeenLastCalledWith(
      expect.stringContaining("DELETE FROM addresses WHERE id = ? AND user_id = ?"),
      [3, 7],
    );
  });
});
