import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeMock, sendNewsletterWelcomeEmailMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
  sendNewsletterWelcomeEmailMock: vi.fn(async () => undefined),
}));

vi.mock("../db/mysql", () => ({
  mysqlPool: {
    execute: executeMock,
  },
}));

vi.mock("../services/email", () => ({
  sendNewsletterWelcomeEmail: sendNewsletterWelcomeEmailMock,
}));

import { app } from "../app";
import { createNewsletterUnsubscribeToken } from "../services/newsletter-token";
import { ensureTestAuthEnv } from "./test-helpers";

describe("newsletter routes", () => {
  beforeEach(() => {
    ensureTestAuthEnv();
    executeMock.mockReset();
    sendNewsletterWelcomeEmailMock.mockReset();
  });

  it("rejects missing email", async () => {
    const response = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ consent: true });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("rejects missing consent", async () => {
    const response = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email: "buyer@example.com" });

    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("rejects invalid email format", async () => {
    const response = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email: "not-an-email", consent: true });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid email address");
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("subscribes a valid email and normalizes it to lowercase", async () => {
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email: "Buyer@Example.com", consent: true, locale: "ro", source: "footer" });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.email).toBe("buyer@example.com");
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO newsletter_subscribers"),
      ["buyer@example.com", 1, "ro", "footer"],
    );
    expect(sendNewsletterWelcomeEmailMock).toHaveBeenCalledWith({
      to: "buyer@example.com",
      locale: "ro",
    });
  });

  it("still returns success when the welcome email fails to send", async () => {
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
    sendNewsletterWelcomeEmailMock.mockRejectedValueOnce(new Error("SMTP down"));

    const response = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email: "buyer@example.com", consent: true });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
  });

  it("returns 500 when the database insert fails", async () => {
    executeMock.mockRejectedValueOnce(new Error("connection lost"));

    const response = await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email: "buyer@example.com", consent: true });

    expect(response.status).toBe(500);
    expect(response.body.ok).toBe(false);
  });

  it("re-subscribing clears unsubscribed_at", async () => {
    executeMock.mockResolvedValueOnce([{ affectedRows: 2 }]);

    await request(app)
      .post("/api/newsletter/subscribe")
      .send({ email: "buyer@example.com", consent: true });

    expect(String(executeMock.mock.calls[0]?.[0])).toContain("unsubscribed_at = NULL");
  });

  it("unsubscribes with a valid signed token (JSON body)", async () => {
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const token = createNewsletterUnsubscribeToken("buyer@example.com");

    const response = await request(app)
      .post("/api/newsletter/unsubscribe")
      .send({ email: "Buyer@Example.com", token });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    const [sql, args] = executeMock.mock.calls[0] ?? [];
    expect(String(sql)).toContain("consent = 0");
    expect(args).toEqual(["buyer@example.com"]);
  });

  it("supports RFC 8058 one-click unsubscribe via query params", async () => {
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const token = createNewsletterUnsubscribeToken("buyer@example.com") ?? "";

    const response = await request(app)
      .post(
        `/api/newsletter/unsubscribe?email=buyer%40example.com&token=${token}`,
      )
      .type("form")
      .send("List-Unsubscribe=One-Click");

    expect(response.status).toBe(200);
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a token signed for another email", async () => {
    const token = createNewsletterUnsubscribeToken("other@example.com");

    const response = await request(app)
      .post("/api/newsletter/unsubscribe")
      .send({ email: "buyer@example.com", token });

    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("answers ok for an unknown email (no subscriber enumeration)", async () => {
    executeMock.mockResolvedValueOnce([{ affectedRows: 0 }]);
    const token = createNewsletterUnsubscribeToken("nobody@example.com");

    const response = await request(app)
      .post("/api/newsletter/unsubscribe")
      .send({ email: "nobody@example.com", token });

    expect(response.status).toBe(200);
  });
});
