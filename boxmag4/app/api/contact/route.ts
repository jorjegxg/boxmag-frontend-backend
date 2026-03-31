import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

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
const rootEnvPath = path.resolve(process.cwd(), "../.env");
const rootEnv =
  fs.existsSync(rootEnvPath)
    ? Object.fromEntries(
        fs
          .readFileSync(rootEnvPath, "utf8")
          .split(/\r?\n/)
          .filter((line) => line.trim() && !line.trim().startsWith("#"))
          .map((line) => {
            const separatorIndex = line.indexOf("=");
            if (separatorIndex < 0) return [line.trim(), ""];
            const key = line.slice(0, separatorIndex).trim();
            const value = line.slice(separatorIndex + 1).trim();
            return [key, value];
          }),
      )
    : {};

// #region agent log
console.log("[dbg-bd7f7f] module_loaded", {
  cwd: process.cwd(),
  rootEnvPath,
  rootEnvKeys: Object.keys(rootEnv).length,
});
fetch("http://127.0.0.1:7362/ingest/001632f5-f360-4660-a740-ac305c61ac19", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Debug-Session-Id": "bd7f7f",
  },
  body: JSON.stringify({
    sessionId: "bd7f7f",
    runId: "initial",
    hypothesisId: "H0",
    location: "app/api/contact/route.ts:module",
    message: "Module loaded for contact route",
    data: {
      cwd: process.cwd(),
      rootEnvPath,
      rootEnvKeys: Object.keys(rootEnv).length,
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

function envValue(key: string): string | undefined {
  return process.env[key] ?? rootEnv[key];
}

function isNonEmpty(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(req: Request): Promise<Response> {
  try {
    // #region agent log
    console.log("[dbg-bd7f7f] post_entered", {
      cwd: process.cwd(),
      rootEnvPath,
      rootEnvKeys: Object.keys(rootEnv).length,
      hasProcessSmtpUser: Boolean(process.env.SMTP_USER),
      hasProcessSmtpPass: Boolean(process.env.SMTP_PASS),
      hasProcessContactTo: Boolean(process.env.CONTACT_TO),
    });
    fetch("http://127.0.0.1:7362/ingest/001632f5-f360-4660-a740-ac305c61ac19", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "bd7f7f",
      },
      body: JSON.stringify({
        sessionId: "bd7f7f",
        runId: "initial",
        hypothesisId: "H1",
        location: "app/api/contact/route.ts:POST:start",
        message: "POST entered and env sources available",
        data: {
          cwd: process.cwd(),
          rootEnvPath,
          rootEnvKeys: Object.keys(rootEnv).length,
          hasProcessSmtpUser: Boolean(process.env.SMTP_USER),
          hasProcessSmtpPass: Boolean(process.env.SMTP_PASS),
          hasProcessContactTo: Boolean(process.env.CONTACT_TO),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

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

    const smtpHost = envValue("SMTP_HOST") ?? "smtp.gmail.com";
    const smtpPort = Number(envValue("SMTP_PORT") ?? 587);
    const smtpUser = envValue("SMTP_USER");
    const smtpPass = envValue("SMTP_PASS");
    const contactTo = envValue("CONTACT_TO") ?? smtpUser;

    // #region agent log
    console.log("[dbg-bd7f7f] smtp_resolution", {
      smtpHost,
      smtpPort,
      hasSmtpUser: Boolean(smtpUser),
      hasSmtpPass: Boolean(smtpPass),
      hasContactTo: Boolean(contactTo),
    });
    fetch("http://127.0.0.1:7362/ingest/001632f5-f360-4660-a740-ac305c61ac19", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "bd7f7f",
      },
      body: JSON.stringify({
        sessionId: "bd7f7f",
        runId: "initial",
        hypothesisId: "H2",
        location: "app/api/contact/route.ts:POST:smtp-resolution",
        message: "Resolved SMTP values presence",
        data: {
          smtpHost,
          smtpPort,
          hasSmtpUser: Boolean(smtpUser),
          hasSmtpPass: Boolean(smtpPass),
          hasContactTo: Boolean(contactTo),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (!smtpUser || !smtpPass || !contactTo) {
      // #region agent log
      console.log("[dbg-bd7f7f] smtp_missing_branch", {
        hasSmtpUser: Boolean(smtpUser),
        hasSmtpPass: Boolean(smtpPass),
        hasContactTo: Boolean(contactTo),
      });
      fetch("http://127.0.0.1:7362/ingest/001632f5-f360-4660-a740-ac305c61ac19", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "bd7f7f",
        },
        body: JSON.stringify({
          sessionId: "bd7f7f",
          runId: "initial",
          hypothesisId: "H3",
          location: "app/api/contact/route.ts:POST:smtp-missing-branch",
          message: "SMTP missing branch executed",
          data: {
            hasSmtpUser: Boolean(smtpUser),
            hasSmtpPass: Boolean(smtpPass),
            hasContactTo: Boolean(contactTo),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
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
