import { toPositiveInt } from "./numbers";

/** Shared helpers for admin list endpoints (search + opt-in pagination). */

export const MAX_LIST_PAGE_SIZE = 100;
const DEFAULT_LIST_PAGE_SIZE = 25;

export function readQueryString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Escape `\`, `%` and `_` so user input matches literally inside LIKE. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/** Lower-cased `%…%` LIKE pattern for a search term (capped at 100 chars). */
export function buildLikeSearch(value: unknown): string | null {
  const search = readQueryString(value).slice(0, 100).toLowerCase();
  return search ? `%${escapeLikePattern(search)}%` : null;
}

export type ListPagination = { page: number; pageSize: number; offset: number };

/** `page` / `pageSize` are opt-in so existing callers keep the full list. */
export function readPagination(query: Record<string, unknown>): ListPagination | null {
  const pageRaw = readQueryString(query.page);
  const pageSizeRaw = readQueryString(query.pageSize);
  if (!pageRaw && !pageSizeRaw) return null;
  const page = Math.max(1, toPositiveInt(pageRaw) ?? 1);
  const pageSize = Math.min(
    MAX_LIST_PAGE_SIZE,
    Math.max(1, toPositiveInt(pageSizeRaw) ?? DEFAULT_LIST_PAGE_SIZE),
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function buildWhereSql(clauses: string[]): string {
  return clauses.length > 0 ? `WHERE ${clauses.join("\n         AND ")}` : "";
}

export function buildListMeta(
  pagination: ListPagination | null,
  total: number,
): { total: number; page: number; pageSize: number } {
  return {
    total,
    page: pagination?.page ?? 1,
    pageSize: pagination?.pageSize ?? total,
  };
}
