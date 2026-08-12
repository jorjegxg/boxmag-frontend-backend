import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMailMock = vi.fn(async () => undefined);

vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: sendMailMock,
    }),
  },
}));

vi.mock("../../../lib/backend-url", () => ({
  getBackendBaseUrl: () => "http://localhost:3005",
}));

/** INV-CONTACT-NEXT — contact lives in Next.js; validation before SMTP. */
describe("POST /api/contact (INV-CONTACT-NEXT)", () => {
  beforeEach(() => {
    sendMailMock.mockClear();
    process.env.SMTP_USER = "smtp@example.com";
    process.env.SMTP_PASS = "secret";
    process.env.CONTACT_TO = "orders@example.com";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ ok: true, data: { id: 1 } }, { status: 200 }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function postContact(body: Record<string, unknown>) {
    const { POST } = await import("../../app/api/contact/route");
    return POST(
      new Request("http://localhost/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  const validBody = {
    firstName: "Ana",
    surname: "Pop",
    companyName: "Firma SRL",
    vatNumber: "RO12345678",
    email: "ana@example.com",
    phone: "799111222",
    country: "RO",
    message: "Hello",
    acceptTerms: true,
  };

  it("rejects missing required fields", async () => {
    vi.resetModules();
    const response = await postContact({ ...validBody, email: "" });
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { message?: string };
    expect(payload.message).toContain("Missing required field");
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("rejects when terms are not accepted", async () => {
    vi.resetModules();
    const response = await postContact({ ...validBody, acceptTerms: false });
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { message?: string };
    expect(payload.message).toContain("Terms must be accepted");
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("rejects invalid VAT", async () => {
    vi.resetModules();
    const response = await postContact({ ...validBody, vatNumber: "INVALID" });
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { message?: string };
    expect(payload.message).toContain("Invalid VAT");
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("sends mail on valid payload", async () => {
    vi.resetModules();
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "smtp@example.com";
    process.env.SMTP_PASS = "secret";
    process.env.CONTACT_TO = "orders@example.com";
    process.env.EMAIL_FROM = "noreply@example.com";
    const response = await postContact({
      ...validBody,
      vatNumber: "RO2816464",
    });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { message?: string };
    expect(payload.message).toContain("Message sent successfully");
    expect(sendMailMock).toHaveBeenCalled();
  });
});
