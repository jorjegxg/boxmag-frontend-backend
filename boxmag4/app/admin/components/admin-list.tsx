"use client";

import { useEffect, useMemo, useState } from "react";
import { getBackendBaseUrl } from "./admin-types";

const SEARCH_DEBOUNCE_MS = 300;

export function useDebouncedValue<T>(value: T, delayMs = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Server-paginated admin list (`?page&pageSize` + filters, `meta.total`).
 * Empty filter values are left out of the query string. Changing a filter
 * jumps back to page 1.
 */
export function useAdminList<T>(
  path: string,
  filters: Record<string, string>,
  pageSize: number,
) {
  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);
  const filterKey = JSON.stringify(filters);
  const [page, setPage] = useState(1);
  const [pageFilterKey, setPageFilterKey] = useState(filterKey);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset to page 1 during render when filters change (no extra effect pass).
  if (pageFilterKey !== filterKey) {
    setPageFilterKey(filterKey);
    setPage(1);
  }
  const effectivePage = pageFilterKey === filterKey ? page : 1;

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(effectivePage),
          pageSize: String(pageSize),
        });
        for (const [key, value] of Object.entries(
          JSON.parse(filterKey) as Record<string, string>,
        )) {
          if (value) params.set(key, value);
        }
        const response = await fetch(`${backendBaseUrl}${path}?${params}`, {
          credentials: "include",
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: T[];
          meta?: { total?: number };
          message?: string;
        };
        if (!response.ok || payload.ok !== true || !Array.isArray(payload.data)) {
          throw new Error(payload.message ?? `Failed with status ${response.status}`);
        }
        setItems(payload.data);
        setTotal(payload.meta?.total ?? payload.data.length);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Eroare la încărcare");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [backendBaseUrl, path, filterKey, effectivePage, pageSize]);

  return { items, total, page: effectivePage, setPage, isLoading, error, backendBaseUrl };
}

export function AdminPagination({
  page,
  total,
  pageSize,
  isLoading,
  itemLabel,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  isLoading: boolean;
  itemLabel: string;
  onPageChange: (page: number) => void;
}) {
  if (total <= 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const buttonClass =
    "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <span className="text-sm text-gray-600">
        Afișare <span className="font-semibold">{(safePage - 1) * pageSize + 1}</span>
        {"–"}
        <span className="font-semibold">{Math.min(safePage * pageSize, total)}</span> din{" "}
        <span className="font-semibold">{total}</span> {itemLabel}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1 || isLoading}
          className={buttonClass}
        >
          Înapoi
        </button>
        <span className="text-sm text-gray-600">
          Pagina <span className="font-semibold">{safePage}</span> din{" "}
          <span className="font-semibold">{totalPages}</span>
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages || isLoading}
          className={buttonClass}
        >
          Înainte
        </button>
      </div>
    </div>
  );
}

export const adminInputClass =
  "h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red";
export const adminSelectClass = "h-9 rounded-md border border-gray-300 bg-white px-2 text-sm";
