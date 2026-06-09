#!/usr/bin/env node
/**
 * Wrapper — rulează optimizarea din boxmag4 unde sharp este instalat.
 * Preferat: cd boxmag4 && npm run optimize:images
 */

import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const boxmag4Dir = path.resolve(__dirname, "../boxmag4");
const scriptPath = path.join(boxmag4Dir, "scripts/optimize-images.mjs");

const result = spawnSync(process.execPath, [scriptPath, ...process.argv.slice(2)], {
  cwd: boxmag4Dir,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
