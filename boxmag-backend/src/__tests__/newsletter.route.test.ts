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

describe("newsletter routes", () => {
  beforeEach(() => {
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
});
