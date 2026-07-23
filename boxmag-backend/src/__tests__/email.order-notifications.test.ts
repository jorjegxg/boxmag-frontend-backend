import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMailMock = vi.fn(async () => ({ messageId: "test-message-id" }));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: sendMailMock,
    })),
  },
}));

vi.mock("../services/minio", () => ({
  getObjectBufferFromMinio: vi.fn(async () => Buffer.from("file")),
}));

describe("order notification email delivery", () => {
  beforeEach(() => {
    sendMailMock.mockClear();
    vi.resetModules();
    process.env.SMTP_HOST = "mail.privateemail.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "info@boxmag.eu";
    process.env.SMTP_PASS = "info-pass";
    process.env.EMAIL_FROM = "info@boxmag.eu";
    process.env.EMAIL_ORDERS_FROM = "orders@boxmag.eu";
    process.env.EMAIL_ORDERS_SMTP_USER = "orders@boxmag.eu";
    process.env.EMAIL_ORDERS_SMTP_PASS = "orders-pass";
    process.env.ORDERS_NOTIFICATION_TO = "orders@boxmag.eu";
  });

  it("sends the internal notification from the orders mailbox (same identity as the working offer)", async () => {
    const { sendNewOrderNotificationEmail } = await import("../services/email");

    await sendNewOrderNotificationEmail({
      orderId: 42,
      customerName: "Test User",
      customerEmail: "customer@example.com",
      companyName: "Test Co",
      vatNumber: "RO123",
      customerPhone: "+40700000000",
      customerAddress: "Str. Test 1",
      customerPostcode: "010101",
      customerCity: "Bucharest",
      customerCountry: "RO",
      createAccount: false,
      consentPhone: false,
      consentEmail: false,
      cardboardType: "B",
      cardboardColour: "Brown",
      boxPrint: "No print",
      lengthMm: 100,
      widthMm: 100,
      heightMm: 100,
      sizeType: "internal",
      transport: "Standard",
      quantity: 100,
      ftl: false,
      attachmentName: null,
      attachmentObjectName: null,
      attachmentUrl: null,
      boxTypeName: "Standard Box",
      message: "Test order",
      items: null,
      priceBreakdown: null,
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "orders@boxmag.eu",
        from: expect.stringContaining("orders@boxmag.eu"),
        replyTo: "orders@boxmag.eu",
      }),
    );
  });

  it("sends to every recipient in ORDERS_NOTIFICATION_TO from the orders mailbox", async () => {
    process.env.ORDERS_NOTIFICATION_TO = "info@boxmag.eu,orders@boxmag.eu";
    const { sendNewOrderNotificationEmail } = await import("../services/email");

    await sendNewOrderNotificationEmail({
      orderId: 43,
      customerName: "Test User",
      customerEmail: "customer@example.com",
      companyName: "Test Co",
      vatNumber: "RO123",
      customerPhone: "+40700000000",
      customerAddress: "Str. Test 1",
      customerPostcode: "010101",
      customerCity: "Bucharest",
      customerCountry: "RO",
      createAccount: false,
      consentPhone: false,
      consentEmail: false,
      cardboardType: "B",
      cardboardColour: "Brown",
      boxPrint: "No print",
      lengthMm: 100,
      widthMm: 100,
      heightMm: 100,
      sizeType: "internal",
      transport: "Standard",
      quantity: 100,
      ftl: false,
      attachmentName: null,
      attachmentObjectName: null,
      attachmentUrl: null,
      boxTypeName: "Standard Box",
      message: "Test order",
      items: null,
      priceBreakdown: null,
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "info@boxmag.eu, orders@boxmag.eu",
        from: expect.stringContaining("orders@boxmag.eu"),
        replyTo: "orders@boxmag.eu",
      }),
    );
  });

  it("omits the customer's uploaded attachment from the B2B confirmation email", async () => {
    process.env.ORDERS_NOTIFICATION_TO = "orders@boxmag.eu";
    const { sendBusinessOrderConfirmationEmailToCustomer } = await import(
      "../services/email"
    );

    await sendBusinessOrderConfirmationEmailToCustomer({
      orderId: 44,
      customerName: "Test User",
      customerEmail: "customer@example.com",
      companyName: "Test Co",
      vatNumber: "RO123",
      customerPhone: "+40700000000",
      customerAddress: "Str. Test 1",
      customerPostcode: "010101",
      customerCity: "Bucharest",
      customerCountry: "RO",
      createAccount: false,
      consentPhone: false,
      consentEmail: false,
      cardboardType: "B",
      cardboardColour: "Brown",
      boxPrint: "No print",
      lengthMm: 100,
      widthMm: 100,
      heightMm: 100,
      sizeType: "internal",
      transport: "Standard",
      quantity: 100,
      ftl: false,
      attachmentName: "design.pdf",
      attachmentObjectName: "orders/attachments/design.pdf",
      attachmentUrl: null,
      boxTypeName: "Standard Box",
      message: "Test order",
      items: null,
      priceBreakdown: null,
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mailArg = sendMailMock.mock.calls[0]?.[0] as
      | { attachments?: unknown }
      | undefined;
    expect(mailArg?.attachments).toBeUndefined();
  });
});
