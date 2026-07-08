import type { NextFunction, Request, Response } from "express";
import { isRequestAuthenticatedAsAdmin } from "./require-admin";
import { getRequestUserSession } from "./require-user";

function readEmailParam(req: Request): string {
  if (typeof req.query.email === "string") {
    return req.query.email.trim().toLowerCase();
  }
  return "";
}

/**
 * Admin-only when no email filter is present. When `?email=` is supplied, the
 * caller must either be an admin or an authenticated user with that email.
 */
export function requireAdminOrUserEmail(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const email = readEmailParam(req);
  if (!email) {
    if (isRequestAuthenticatedAsAdmin(req)) {
      next();
      return;
    }
    res.status(401).json({
      ok: false,
      message: "Admin authentication required.",
    });
    return;
  }

  if (isRequestAuthenticatedAsAdmin(req)) {
    next();
    return;
  }

  const session = getRequestUserSession(req);
  if (session?.email === email) {
    req.userSession = session;
    next();
    return;
  }

  res.status(401).json({
    ok: false,
    message: "Authentication required.",
  });
}
