import fs from "fs";
import path from "path";

/** Read a key from the monorepo root `.env` (one level above boxmag4). */
export function readRootEnvValue(key: string): string | undefined {
  const rootEnvPath = path.resolve(process.cwd(), "../.env");
  if (!fs.existsSync(rootEnvPath)) return undefined;
  const lines = fs.readFileSync(rootEnvPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) continue;
    const currentKey = trimmed.slice(0, separatorIndex).trim();
    if (currentKey !== key) continue;
    return trimmed.slice(separatorIndex + 1).trim();
  }
  return undefined;
}
