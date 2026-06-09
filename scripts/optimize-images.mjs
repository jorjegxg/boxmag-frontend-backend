#!/usr/bin/env node
/**
 * Resize and compress raster images used by the Boxmag frontend/backend.
 *
 * Usage:
 *   node scripts/optimize-images.mjs          # optimize in place
 *   node scripts/optimize-images.mjs --dry-run
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

const RASTER_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/** @type {Array<{ label: string, match: (relPath: string) => boolean, maxWidth?: number, maxHeight?: number, maxDimension?: number }>} */
const RULES = [
  {
    label: "hero",
    match: (p) => p.endsWith("b2b/boxes/ecommerce.png"),
    maxWidth: 1200,
  },
  {
    label: "product",
    match: (p) =>
      p.includes("public/ecommerce/") ||
      p.includes("public/b2b/boxes/") ||
      p.includes("public/placeholders/"),
    maxDimension: 860,
  },
  {
    label: "photo",
    match: (p) => p.endsWith("pictures/factory.jpg"),
    maxWidth: 1600,
  },
  {
    label: "banner",
    match: (p) => p.endsWith("pictures/thank-you-banner.png"),
    maxWidth: 1920,
  },
  {
    label: "logo",
    match: (p) => p.includes("public/logos/"),
    maxWidth: 400,
  },
  {
    label: "upload",
    match: (p) => p.includes("uploads/boxes/"),
    maxDimension: 1600,
  },
];

const SCAN_ROOTS = [
  path.join(repoRoot, "boxmag4", "public"),
  path.join(repoRoot, "boxmag-backend", "uploads"),
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function findRule(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  return RULES.find((rule) => rule.match(normalized)) ?? null;
}

function collectRasterFiles(rootDir) {
  /** @type {string[]} */
  const files = [];

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (RASTER_EXTENSIONS.has(ext)) {
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return files;
}

function buildPipeline(inputPath, rule) {
  let pipeline = sharp(inputPath, { failOn: "none" });

  if (rule.maxWidth && rule.maxHeight) {
    pipeline = pipeline.resize({
      width: rule.maxWidth,
      height: rule.maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    });
  } else if (rule.maxWidth) {
    pipeline = pipeline.resize({
      width: rule.maxWidth,
      withoutEnlargement: true,
    });
  } else if (rule.maxDimension) {
    pipeline = pipeline.resize({
      width: rule.maxDimension,
      height: rule.maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  return pipeline;
}

async function encodeByExtension(pipeline, ext) {
  if (ext === ".png") {
    return pipeline.png({ compressionLevel: 9, effort: 10 }).toBuffer();
  }
  if (ext === ".jpg" || ext === ".jpeg") {
    return pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  }
  if (ext === ".webp") {
    return pipeline.webp({ quality: 82 }).toBuffer();
  }
  throw new Error(`Unsupported extension: ${ext}`);
}

async function optimizeFile(filePath) {
  const relPath = path.relative(repoRoot, filePath).replace(/\\/g, "/");
  const rule = findRule(relPath);
  if (!rule) {
    return { relPath, status: "skipped", reason: "no matching rule" };
  }

  const ext = path.extname(filePath).toLowerCase();
  const beforeSize = fs.statSync(filePath).size;
  const beforeMeta = await sharp(filePath, { failOn: "none" }).metadata();

  const pipeline = buildPipeline(filePath, rule);
  const outputBuffer = await encodeByExtension(pipeline, ext);
  const afterMeta = await sharp(outputBuffer).metadata();
  const afterSize = outputBuffer.length;

  const dimensionsChanged =
    (afterMeta.width ?? 0) < (beforeMeta.width ?? 0) ||
    (afterMeta.height ?? 0) < (beforeMeta.height ?? 0);
  const sizeImproved = afterSize < beforeSize;

  if (!dimensionsChanged && !sizeImproved) {
    return {
      relPath,
      status: "unchanged",
      rule: rule.label,
      beforeSize,
      afterSize,
      width: afterMeta.width,
      height: afterMeta.height,
    };
  }

  if (!dryRun) {
    const tempPath = `${filePath}.optimize.tmp`;
    fs.writeFileSync(tempPath, outputBuffer);
    fs.renameSync(tempPath, filePath);
  }

  return {
    relPath,
    status: dryRun ? "would-optimize" : "optimized",
    rule: rule.label,
    beforeSize,
    afterSize,
    width: afterMeta.width,
    height: afterMeta.height,
    beforeWidth: beforeMeta.width,
    beforeHeight: beforeMeta.height,
  };
}

async function main() {
  const files = SCAN_ROOTS.flatMap((root) => collectRasterFiles(root));
  const results = [];

  for (const filePath of files.sort()) {
    try {
      results.push(await optimizeFile(filePath));
    } catch (error) {
      results.push({
        relPath: path.relative(repoRoot, filePath).replace(/\\/g, "/"),
        status: "error",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const optimized = results.filter((r) => r.status === "optimized" || r.status === "would-optimize");
  const unchanged = results.filter((r) => r.status === "unchanged");
  const skipped = results.filter((r) => r.status === "skipped");
  const errors = results.filter((r) => r.status === "error");

  const savedBytes = optimized.reduce(
    (sum, row) => sum + ((row.beforeSize ?? 0) - (row.afterSize ?? 0)),
    0,
  );

  console.log(dryRun ? "DRY RUN — no files modified\n" : "Image optimization complete\n");
  console.log(`Processed: ${files.length}`);
  console.log(`Optimized: ${optimized.length}`);
  console.log(`Unchanged: ${unchanged.length}`);
  console.log(`Skipped:   ${skipped.length}`);
  console.log(`Errors:    ${errors.length}`);
  console.log(`Saved:     ${formatBytes(savedBytes)}\n`);

  for (const row of optimized) {
    const dim =
      row.beforeWidth && row.beforeHeight
        ? `${row.beforeWidth}x${row.beforeHeight} -> ${row.width}x${row.height}`
        : `${row.width}x${row.height}`;
    console.log(
      `[${row.rule}] ${row.relPath}\n  ${dim} | ${formatBytes(row.beforeSize)} -> ${formatBytes(row.afterSize)}`,
    );
  }

  if (errors.length > 0) {
    console.log("\nErrors:");
    for (const row of errors) {
      console.log(`  ${row.relPath}: ${row.reason}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
