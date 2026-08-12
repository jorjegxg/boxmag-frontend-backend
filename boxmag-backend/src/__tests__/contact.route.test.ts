import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminCookie, ensureTestAuthEnv } from "./test-helpers";

const {
  queryMock,
  executeMock,
  isEmailTransportConfiguredMock,
  sendContactReplyEmailMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  executeMock: vi.fn(),
  isEmailTransportConfiguredMock: vi.fn(() => true),
  sendContactReplyEmailMock: vi.fn(async () => undefined),
}));

vi.mock("../db/mysql", () => ({
  mysqlPool: {
    query: queryMock,
    execute: executeMock,
  },
}));

vi.mock("../services/email", () => ({
  isEmailTransportConfigured: isEmailTransportConfiguredMock,
  getOrderOfferSenderOptions: vi.fn(() => [
    { key: "info", email: "info@example.com", label: "Info" },
    { key: "orders", email: "orders@example.com", label: "Orders" },
  ]),
  resolveDefaultOrderOfferFromKey: vi.fn(() => "info"),
  sendContactReplyEmail: sendContactReplyEmailMock,
}));

import { app } from "../app";

const sampleRow = {
  id: 3,
  first_name: "Ana",
  surname: "Pop",
  company_name: "Acme SRL",
  vat_number: "RO123",
  email: "ana@example.com",
  phone: "+40700000000",
  country: "RO",
  message: "Need boxes",
  attachment_names: null,
  status: "new",
  reply_message: null,
  replied_at: null,
  replied_from: null,
  created_at: "2026-07-01T00:00:00.000Z",
};

describe("contact routes", () => {
  beforeEach(() => {
    queryMock.mockReset();
    executeMock.mockReset();
    isEmailTransportConfiguredMock.mockReset();
    isEmailTransportConfiguredMock.mockReturnValue(true);
    sendContactReplyEmailMock.mockReset();
    ensureTestAuthEnv();
  });

  it("returns 400 for invalid public contact payload", async () => {
    const response = await request(app).post("/api/contact").send({
      firstName: "Ana",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Invalid contact payload");
  });

  it("stores a public contact message", async () => {
    executeMock.mockResolvedValueOnce([{ insertId: 9 }]);

    const response = await request(app).post("/api/contact").send({
      firstName: "Ana",
      surname: "Pop",
      email: "ana@example.com",
      message: "Need boxes",
      companyName: "Acme SRL",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ ok: true, data: { id: 9 } });
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO contact_messages"),
      expect.any(Array),
    );
  });

  it("blocks listing contact messages without admin auth", async () => {
    const response = await request(app).get("/api/contact");
    expect(response.status).toBe(401);
  });

  it("lists contact messages for admin", async () => {
    queryMock.mockResolvedValueOnce([[sampleRow]]);

    const response = await request(app)
      .get("/api/contact")
      .set("Cookie", adminCookie());

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].email).toBe("ana@example.com");
  });

  it("returns reply senders for admin", async () => {
    const response = await request(app)
      .get("/api/contact/reply-senders")
      .set("Cookie", adminCookie());

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.defaultKey).toBe("info");
    expect(response.body.data[0].key).toBe("info");
  });

  it("loads a contact message and marks new as read", async () => {
    queryMock.mockResolvedValueOnce([[{ ...sampleRow }]]);
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .get("/api/contact/3")
      .set("Cookie", adminCookie());

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("read");
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'read'"),
      [3],
    );
  });

  it("returns 404 for missing contact message", async () => {
    queryMock.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .get("/api/contact/999")
      .set("Cookie", adminCookie());

    expect(response.status).toBe(404);
  });

  it("returns 503 when reply email transport is not configured", async () => {
    isEmailTransportConfiguredMock.mockReturnValue(false);

    const response = await request(app)
      .post("/api/contact/3/reply")
      .set("Cookie", adminCookie())
      .send({ fromKey: "info", message: "Thanks for writing" });

    expect(response.status).toBe(503);
    expect(sendContactReplyEmailMock).not.toHaveBeenCalled();
  });

  it("sends a contact reply and records metadata", async () => {
    queryMock
      .mockResolvedValueOnce([
        [
          {
            id: 3,
            first_name: "Ana",
            surname: "Pop",
            company_name: "Acme SRL",
            email: "ana@example.com",
            message: "Need boxes",
          },
        ],
      ])
      .mockResolvedValueOnce([
        [
          {
            replied_at: "2026-07-02T10:00:00.000Z",
            replied_from: "info@example.com",
          },
        ],
      ]);
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .post("/api/contact/3/reply")
      .set("Cookie", adminCookie())
      .send({ fromKey: "info", message: "Thanks for writing" });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.to).toBe("ana@example.com");
    expect(sendContactReplyEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fromKey: "info",
        to: "ana@example.com",
        replyMessage: "Thanks for writing",
      }),
    );
  });
});
