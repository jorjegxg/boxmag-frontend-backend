import nodemailer from "nodemailer";

type ContactPayload = {
  firstName: string;
  surname: string;
  companyName: string;
  vatNumber: string;
  email: string;
  phone: string;
  country: string;
  message: string;
  acceptTerms: boolean;
  fileName?: string;
};

const VAT_REGEX = /^[A-Z]{2}[A-Z0-9]{2,12}$/;

function isNonEmpty(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as ContactPayload;
    const requiredFields: Array<keyof ContactPayload> = [
      "firstName",
      "surname",
      "email",
      "phone",
      "country",
      "message",
    ];

    for (const key of requiredFields) {
      const value = body[key];
      if (typeof value !== "string" || !isNonEmpty(value)) {
        return Response.json(
          { message: `Missing required field: ${key}` },
          { status: 400 },
        );
      }
    }

    if (!body.acceptTerms) {
      return Response.json(
        { message: "Terms must be accepted." },
        { status: 400 },
      );
    }

    if (
      typeof body.vatNumber === "string" &&
      body.vatNumber.trim().length > 0 &&
      !VAT_REGEX.test(body.vatNumber.trim().toUpperCase())
    ) {
      return Response.json(
        {
          message:
            "Invalid VAT number format. Use country code plus 2-12 letters/digits (e.g. RO12345678).",
        },
        { status: 400 },
      );
    }

    const smtpHost = process.env.SMTP_HOST ?? "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT ?? 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const contactTo = process.env.CONTACT_TO ?? smtpUser;

    if (!smtpUser || !smtpPass || !contactTo) {
      return Response.json(
        { message: "SMTP is not configured. Set SMTP_USER, SMTP_PASS, CONTACT_TO." },
        { status: 500 },
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"Boxmag Contact Form" <${smtpUser}>`,
      to: contactTo,
      replyTo: body.email,
      subject: `New contact request from ${body.firstName} ${body.surname}`,
      text: [
        `First Name: ${body.firstName}`,
        `Surname: ${body.surname}`,
        `Company Name: ${body.companyName || "-"}`,
        `VAT Number: ${body.vatNumber || "-"}`,
        `Email: ${body.email}`,
        `Phone: ${body.phone}`,
        `Country: ${body.country}`,
        `Attachment Name: ${body.fileName || "-"}`,
        "",
        "Message:",
        body.message,
      ].join("\n"),
    });

    return Response.json({ message: "Message sent successfully." }, { status: 200 });
  } catch {
    return Response.json(
      { message: "Unable to send your message right now." },
      { status: 500 },
    );
  }
}
