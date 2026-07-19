import type { NextFunction, Request, Response } from "express";
import {
  ADMIN_COOKIE_NAME,
  getAdminApiToken,
  getAdminPassword,
  isAdminSessionValid,
  safeEqualStrings,
} from "../config/admin-auth";

function extractProvidedToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token) return token;
  }
  const custom = req.headers["x-admin-token"];
  if (typeof custom === "string" && custom.trim()) {
    return custom.trim();
  }
  return undefined;
}

/**
 * Reads the admin session cookie without requiring cookie-parser to be present,
 * so the middleware keeps working even if the app bootstrap changes.
 */
function readAdminCookie(req: Request): string | undefined {
  const parsed = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (parsed && typeof parsed[ADMIN_COOKIE_NAME] === "string") {
    return parsed[ADMIN_COOKIE_NAME];
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 0) continue;
    const name = part.slice(0, separatorIndex).trim();
    if (name !== ADMIN_COOKIE_NAME) continue;
    return decodeURIComponent(part.slice(separatorIndex + 1).trim());
  }
  return undefined;
}

export function isRequestAuthenticatedAsAdmin(req: Request): boolean {
  const apiToken = getAdminApiToken();
  const providedToken = extractProvidedToken(req);
  if (apiToken && providedToken && safeEqualStrings(providedToken, apiToken)) {
    return true;
  }

  const password = getAdminPassword();
  const sessionCookie = readAdminCookie(req);
  return isAdminSessionValid(sessionCookie, password);
}

/**
 * Blocks the request unless it carries a valid admin session cookie or the
 * admin API token. Fails closed when no admin credential is configured.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!getAdminPassword() && !getAdminApiToken()) {
    res.status(503).json({
      ok: false,
      message: "Admin access is not configured on the server.",
    });
    return;
  }

  if (isRequestAuthenticatedAsAdmin(req)) {
    next();
    return;
  }

  res.status(401).json({
    ok: false,
    message: "Admin authentication required.",
  });
}
