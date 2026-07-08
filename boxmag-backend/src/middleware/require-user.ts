import type { NextFunction, Request, Response } from "express";
import {
  USER_COOKIE_NAME,
  verifyUserSessionToken,
  type VerifiedUserSession,
} from "../config/user-auth";

declare module "express-serve-static-core" {
  interface Request {
    userSession?: VerifiedUserSession;
  }
}

function readUserCookie(req: Request): string | undefined {
  const parsed = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (parsed && typeof parsed[USER_COOKIE_NAME] === "string") {
    return parsed[USER_COOKIE_NAME];
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 0) continue;
    const name = part.slice(0, separatorIndex).trim();
    if (name !== USER_COOKIE_NAME) continue;
    return decodeURIComponent(part.slice(separatorIndex + 1).trim());
  }
  return undefined;
}

export function getRequestUserSession(
  req: Request,
): VerifiedUserSession | null {
  return verifyUserSessionToken(readUserCookie(req));
}

/**
 * Requires a valid signed user session cookie issued by POST /api/auth/login.
 */
export function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const session = getRequestUserSession(req);
  if (!session) {
    res.status(401).json({
      ok: false,
      message: "Authentication required.",
    });
    return;
  }

  req.userSession = session;
  next();
}

/**
 * Ensures the authenticated user matches the provided email (case-insensitive).
 */
export function requireUserEmail(
  email: string | undefined,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const session = req.userSession ?? getRequestUserSession(req);
  if (!session) {
    res.status(401).json({
      ok: false,
      message: "Authentication required.",
    });
    return;
  }

  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  if (!normalizedEmail || session.email !== normalizedEmail) {
    res.status(403).json({
      ok: false,
      message: "You do not have access to this resource.",
    });
    return;
  }

  req.userSession = session;
  next();
}
