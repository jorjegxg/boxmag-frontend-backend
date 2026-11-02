import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import en from "../../app/i18n/locales/en.json";
import ro from "../../app/i18n/locales/ro.json";
import de from "../../app/i18n/locales/de.json";

const ROOT = path.resolve(__dirname, "../..");
const locales: Record<string, Record<string, string>> = { en, ro, de };

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" || entry.name === "node_modules"
        ? []
        : sourceFiles(fullPath);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

/** Every literal `t("key")` in app/ and lib/ must exist in en, ro and de. */
describe("i18n keys (INV-I18N-ERRORS)", () => {
  it("has no literal t() key missing from a locale", () => {
    const missing: string[] = [];
    for (const file of [...sourceFiles(path.join(ROOT, "app")), ...sourceFiles(path.join(ROOT, "lib"))]) {
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(/\bt\(\s*"([A-Za-z0-9_.-]+)"/g)) {
        const key = match[1]!;
        for (const [locale, messages] of Object.entries(locales)) {
          if (!(key in messages)) {
            missing.push(`${locale}: ${key} (${path.relative(ROOT, file)})`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
