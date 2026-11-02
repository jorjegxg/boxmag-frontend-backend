"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminBreadcrumb, SectionTitle } from "../components/admin-ui";
import {
  AdminPagination,
  adminInputClass,
  adminSelectClass,
  useAdminList,
  useDebouncedValue,
} from "../components/admin-list";
import { formatAdminDate } from "../admin-ro";

type AdminContactMessage = {
  id: number;
  customerName: string;
  companyName: string;
  email: string;
  phone: string;
  country: string;
  message: string;
  status: string;
  repliedAt: string | null;
  createdAt: string;
};

const MESSAGES_PAGE_SIZE = 10;

const STATUS_LABELS: Record<string, string> = {
  new: "Nou",
  read: "Citit",
  replied: "Răspuns trimis",
};

function statusBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "replied") return "text-green-700 bg-green-50";
  if (normalized === "read") return "text-blue-700 bg-blue-50";
  return "text-yellow-700 bg-yellow-50";
}

function formatStatus(status: string): string {
  return STATUS_LABELS[status.trim().toLowerCase()] ?? status;
}

export default function AdminMessagesPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const search = useDebouncedValue(searchInput.trim());

  const {
    items: messages,
    total,
    page,
    setPage,
    isLoading,
    error: loadError,
  } = useAdminList<AdminContactMessage>(
    "/api/contact",
    { q: search, status: statusFilter },
    MESSAGES_PAGE_SIZE,
  );
  const hasFilters = Boolean(search || statusFilter);

  return (
    <div>
      <AdminBreadcrumb current="Mesaje contact" />

      <section className="w-full bg-white px-6 lg:px-20 py-8">
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden">
          <SectionTitle
            title="Mesaje contact"
            subtitle="Mesaje trimise din formularul de contact"
          />

          <div className="p-6 lg:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end gap-3">
              <label className="flex-1 text-sm text-gray-700">
                <span className="block mb-1 font-semibold">Caută</span>
                <input
                  id="messages-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Nume, companie, email sau text din mesaj"
                  className={adminInputClass}
                />
              </label>
              <label className="text-sm text-gray-700">
                <span className="block mb-1 font-semibold">Status</span>
                <select
                  id="messages-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={adminSelectClass}
                >
                  <option value="">Toate</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-my-light-gray2 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Data</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Client
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Companie
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">Email</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Mesaj
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={6}>
                          Se încarcă mesajele...
                        </td>
                      </tr>
                    ) : null}
                    {!isLoading && loadError ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-red-600" colSpan={6}>
                          Eroare la încărcarea mesajelor: {loadError}
                        </td>
                      </tr>
                    ) : null}
                    {!isLoading && !loadError && messages.length === 0 ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={6}>
                          {hasFilters
                            ? "Niciun mesaj nu corespunde filtrelor."
                            : "Nu există mesaje."}
                        </td>
                      </tr>
                    ) : null}
                    {!isLoading && !loadError
                      ? messages.map((msg) => (
                          <tr
                            key={msg.id}
                            className="border-t border-gray-200 cursor-pointer transition-colors hover:bg-gray-50"
                            onClick={() =>
                              router.push(`/admin/messages/${msg.id}`)
                            }
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                              {formatAdminDate(msg.createdAt)}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {msg.customerName}
                            </td>
                            <td className="px-4 py-3">{msg.companyName || "—"}</td>
                            <td className="px-4 py-3 text-my-red">{msg.email}</td>
                            <td className="px-4 py-3 max-w-xs truncate text-gray-700">
                              {msg.message}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClass(msg.status)}`}
                              >
                                {formatStatus(msg.status)}
                              </span>
                            </td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>
            </div>

            {!loadError ? (
              <AdminPagination
                page={page}
                total={total}
                pageSize={MESSAGES_PAGE_SIZE}
                isLoading={isLoading}
                itemLabel="mesaje"
                onPageChange={setPage}
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
