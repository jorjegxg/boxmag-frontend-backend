"use client";

import { useState } from "react";
import { AdminBreadcrumb, SectionTitle } from "../components/admin-ui";
import {
  AdminPagination,
  adminInputClass,
  adminSelectClass,
  useAdminList,
  useDebouncedValue,
} from "../components/admin-list";
import { formatAdminDate } from "../admin-ro";

type AdminSubscriber = {
  id: number;
  email: string;
  subscribed: boolean;
  locale: string | null;
  source: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
};

const SUBSCRIBERS_PAGE_SIZE = 20;

export default function AdminNewsletterPage() {
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("subscribed");
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const search = useDebouncedValue(searchInput.trim());

  const { items, total, page, setPage, isLoading, error, backendBaseUrl } =
    useAdminList<AdminSubscriber>(
      "/api/newsletter/subscribers",
      { q: search, status: statusFilter },
      SUBSCRIBERS_PAGE_SIZE,
    );

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const params = new URLSearchParams({ format: "csv" });
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      const response = await fetch(
        `${backendBaseUrl}/api/newsletter/subscribers?${params}`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error(`Export eșuat (status ${response.status})`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "newsletter-abonati.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportFailure) {
      setExportError(
        exportFailure instanceof Error ? exportFailure.message : "Export eșuat",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <AdminBreadcrumb current="Newsletter" />

      <section className="w-full bg-white px-6 lg:px-20 py-8">
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden">
          <SectionTitle title="Newsletter" subtitle="Abonați din formularul de newsletter" />

          <div className="p-6 lg:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end gap-3">
              <label className="flex-1 text-sm text-gray-700">
                <span className="block mb-1 font-semibold">Caută</span>
                <input
                  id="newsletter-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Email"
                  className={adminInputClass}
                />
              </label>
              <label className="text-sm text-gray-700">
                <span className="block mb-1 font-semibold">Stare</span>
                <select
                  id="newsletter-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={adminSelectClass}
                >
                  <option value="subscribed">Abonați</option>
                  <option value="unsubscribed">Dezabonați</option>
                  <option value="">Toți</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={isExporting}
                className="h-9 rounded-md bg-my-red px-4 text-sm font-semibold text-white hover:bg-my-red/90 transition-colors disabled:opacity-60"
              >
                {isExporting ? "Se exportă..." : "Export CSV"}
              </button>
            </div>
            {exportError ? <p className="text-sm text-red-600">{exportError}</p> : null}

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-my-light-gray2 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Email</th>
                      <th className="px-4 py-3 text-left font-semibold">Stare</th>
                      <th className="px-4 py-3 text-left font-semibold">Limbă</th>
                      <th className="px-4 py-3 text-left font-semibold">Sursă</th>
                      <th className="px-4 py-3 text-left font-semibold">Abonat la</th>
                      <th className="px-4 py-3 text-left font-semibold">Dezabonat la</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={6}>
                          Se încarcă abonații...
                        </td>
                      </tr>
                    ) : null}
                    {!isLoading && error ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-red-600" colSpan={6}>
                          Eroare la încărcarea abonaților: {error}
                        </td>
                      </tr>
                    ) : null}
                    {!isLoading && !error && items.length === 0 ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={6}>
                          Nu există abonați pentru filtrele alese.
                        </td>
                      </tr>
                    ) : null}
                    {!isLoading && !error
                      ? items.map((subscriber) => (
                          <tr key={subscriber.id} className="border-t border-gray-200">
                            <td className="px-4 py-3 text-my-red">{subscriber.email}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
                                  subscriber.subscribed
                                    ? "text-green-700 bg-green-50"
                                    : "text-gray-600 bg-gray-100"
                                }`}
                              >
                                {subscriber.subscribed ? "Abonat" : "Dezabonat"}
                              </span>
                            </td>
                            <td className="px-4 py-3 uppercase">{subscriber.locale || "—"}</td>
                            <td className="px-4 py-3">{subscriber.source || "—"}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                              {formatAdminDate(subscriber.createdAt)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                              {subscriber.unsubscribedAt
                                ? formatAdminDate(subscriber.unsubscribedAt)
                                : "—"}
                            </td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>
            </div>

            {!error ? (
              <AdminPagination
                page={page}
                total={total}
                pageSize={SUBSCRIBERS_PAGE_SIZE}
                isLoading={isLoading}
                itemLabel="abonați"
                onPageChange={setPage}
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
