/**
 * Trimite un email de test: info@boxmag.eu → yotrevorgxg@gmail.com + orders@boxmag.eu
 *
 * Usage (din root-ul repo):
 *   node scripts/send-test-email.mjs
 *   node scripts/send-test-email.mjs "Subiect custom" "Corp custom"
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const dotenv = require(path.join(repoRoot, "boxmag-backend/node_modules/dotenv"));
const nodemailer = require(
  path.join(repoRoot, "boxmag-backend/node_modules/nodemailer"),
);

dotenv.config({ path: path.join(repoRoot, ".env") });

const host = process.env.SMTP_HOST || "smtp.privateemail.com";
const port = Number(process.env.SMTP_PORT || 465);
const user = (process.env.SMTP_USER || "").trim();
const pass = (process.env.SMTP_PASS || "").trim();
const from = (process.env.EMAIL_FROM || user || "info@boxmag.eu").trim();
const to = ["yotrevorgxg@gmail.com", "orders@boxmag.eu"].join(", ");

const subject = process.argv[2] || "Test email Boxmag (info → orders)";
const text =
  process.argv[3] ||
  `Email de test trimis la ${new Date().toISOString()}\nFrom: ${from}\nTo: ${to}\n`;

if (!user || !pass) {
  console.error("Lipsesc SMTP_USER / SMTP_PASS în .env");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
});

console.log(`SMTP ${host}:${port}`);
console.log(`From: ${from}`);
console.log(`To:   ${to}`);
console.log(`Subiect: ${subject}`);

try {
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });
  console.log("OK — messageId:", info.messageId);
} catch (err) {
  console.error("FAIL:", err.message || err);
  process.exit(1);
}
