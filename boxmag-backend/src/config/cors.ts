import type { CorsOptions } from "cors";
import { env } from "./env";

/**
 * Reflect exactly one allowed Origin per request (never a comma-separated list).
 */
export function buildCorsOptions(): CorsOptions {
  if (env.corsOrigins === "*") {
    return { origin: true };
  }

  const allowed = new Set(env.corsOrigins);

  return {
    origin(origin, callback) {
      // Same-origin or non-browser clients (no Origin header)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowed.has(origin)) {
        callback(null, origin);
        return;
      }
      callback(null, false);
    },
  };
}
