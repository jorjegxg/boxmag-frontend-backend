/**
 * Verifică mailbox-ul orders@boxmag.eu prin IMAP (INBOX + Spam):
 * listează ultimele mesaje ca să vedem dacă emailul de test a ajuns.
 *
 * Usage: node scripts/check-orders-inbox.mjs
 */
import tls from "node:tls";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const dotenv = require(path.join(repoRoot, "boxmag-backend/node_modules/dotenv"));
dotenv.config({ path: path.join(repoRoot, ".env") });

const host = "mail.privateemail.com";
const port = 993;
const user = (process.argv[2] || process.env.EMAIL_ORDERS_SMTP_USER || "orders@boxmag.eu").trim();
const pass = (process.argv[3] || process.env.EMAIL_ORDERS_SMTP_PASS || "").trim();

if (!pass) {
  console.error("Lipsește EMAIL_ORDERS_SMTP_PASS în .env");
  process.exit(1);
}

const socket = tls.connect({ host, port, servername: host });
let buffer = "";
let tagCounter = 0;
let pending = null;

socket.setEncoding("utf8");
socket.on("data", (chunk) => {
  buffer += chunk;
  if (pending && new RegExp(`^${pending.tag} (OK|NO|BAD)`, "m").test(buffer)) {
    const out = buffer;
    buffer = "";
    const p = pending;
    pending = null;
    p.resolve(out);
  }
});
socket.on("error", (err) => {
  console.error("TLS error:", err.message);
  process.exit(1);
});

function cmd(command) {
  return new Promise((resolve) => {
    const tag = `A${++tagCounter}`;
    pending = { tag, resolve };
    socket.write(`${tag} ${command}\r\n`);
  });
}

await new Promise((r) => socket.once("secureConnect", r));
await new Promise((r) => setTimeout(r, 500)); // greeting

const loginRes = await cmd(`LOGIN "${user}" "${pass}"`);
if (!/OK/.test(loginRes.split("\r\n").filter(Boolean).pop() || "")) {
  console.error("Login IMAP eșuat:", loginRes.trim());
  process.exit(1);
}
console.log(`Login OK ca ${user}\n`);

const listRes = await cmd(`LIST "" "*"`);
const folders = [...listRes.matchAll(/\* LIST \([^)]*\) "[^"]*" "?([^"\r\n]+)"?/g)].map(
  (m) => m[1],
);
console.log("Foldere:", folders.join(", "), "\n");

for (const folder of folders) {
  const sel = await cmd(`EXAMINE "${folder}"`);
  const existsMatch = sel.match(/\* (\d+) EXISTS/);
  const count = existsMatch ? Number(existsMatch[1]) : 0;
  if (count === 0) {
    console.log(`${folder}: gol`);
    continue;
  }
  const fromSeq = Math.max(1, count - 4);
  const fetchRes = await cmd(
    `FETCH ${fromSeq}:${count} (BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE)])`,
  );
  console.log(`${folder}: ${count} mesaje — ultimele:`);
  const headers = fetchRes
    .split(/\* \d+ FETCH/)
    .slice(1)
    .map((h) =>
      h
        .split("\r\n")
        .filter((l) => /^(From|To|Subject|Date):/i.test(l))
        .join(" | "),
    );
  for (const h of headers) console.log("  -", h);
  console.log();
}

await cmd("LOGOUT");
socket.end();
