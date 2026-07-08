import type { CorsOptions } from "cors";
import { env } from "./env";

/**
 * Reflect exactly one allowed Origin per request (never a comma-separated list).
 */
export function buildCorsOptions(): CorsOptions {
  // Credentials are required so the browser sends the admin session cookie on
  // cross-origin (same-site) requests to the API. `origin: true` reflects the
  // request origin, which is compatible with credentialed requests.
  if (env.corsOrigins === "*") {
    return { origin: true, credentials: true };
  }

  const allowed = new Set(env.corsOrigins);

  return {
    credentials: true,
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
