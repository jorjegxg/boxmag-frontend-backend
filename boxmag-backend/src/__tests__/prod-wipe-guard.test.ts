import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../..");
const scriptPath = path.join(repoRoot, "scripts", "refuse-prod-wipe.sh");

/** Mirrors scripts/refuse-prod-wipe.sh refuse_prod_wipe() core rule. */
function refuseProdWipe(
  nodeEnv: string,
  allowProdWipe: string | undefined,
): { allowed: boolean; message?: string } {
  if (nodeEnv === "production" && allowProdWipe !== "1") {
    return {
      allowed: false,
      message: "Refusing wipe: NODE_ENV=production without ALLOW_PROD_WIPE=1.",
    };
  }
  return { allowed: true };
}

describe("refuse_prod_wipe (INV-NO-PROD-WIPE)", () => {
  it("script still encodes the production wipe refusal", () => {
    const source = fs.readFileSync(scriptPath, "utf8");
    expect(source).toContain("ALLOW_PROD_WIPE");
    expect(source).toContain("Refusing wipe");
    expect(source).toContain('NODE_ENV=production');
  });

  it("refuses wipe when NODE_ENV=production without ALLOW_PROD_WIPE", () => {
    const result = refuseProdWipe("production", "");
    expect(result.allowed).toBe(false);
    expect(result.message).toContain("Refusing wipe");
  });

  it("allows wipe when ALLOW_PROD_WIPE=1 in production", () => {
    expect(refuseProdWipe("production", "1").allowed).toBe(true);
  });

  it("allows wipe outside production", () => {
    expect(refuseProdWipe("development", "").allowed).toBe(true);
  });
});
