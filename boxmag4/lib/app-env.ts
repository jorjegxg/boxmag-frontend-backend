/** Resolved from `NEXT_PUBLIC_APP_ENV` (see next.config.ts). */
export function getAppEnv(): string {
  return process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase() ?? "";
}

/** True when `NEXT_PUBLIC_APP_ENV` is `development` or `dev`. */
export function isDevelopmentAppEnv(): boolean {
  const env = getAppEnv();
  return env === "development" || env === "dev";
}
