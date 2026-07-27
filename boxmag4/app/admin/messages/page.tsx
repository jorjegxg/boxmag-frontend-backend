"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getBackendBaseUrl } from "../components/admin-types";
import { AdminBreadcrumb, SectionTitle } from "../components/admin-ui";
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

function statusBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "replied") return "text-green-700 bg-green-50";
  if (normalized === "read") return "text-blue-700 bg-blue-50";
  return "text-yellow-700 bg-yellow-50";
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    new: "Nou",
    read: "Citit",
    replied: "Răspuns trimis",
  };
  return labels[status.trim().toLowerCase()] ?? status;
}

export default function AdminMessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<AdminContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  useEffect(() => {
    const controller = new AbortController();
    const loadMessages = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`${backendBaseUrl}/api/contact`, {
          credentials: "include",
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: AdminContactMessage[];
          message?: string;
        };
        if (
          !response.ok ||
          payload.ok !== true ||
          !Array.isArray(payload.data)
        ) {
          throw new Error(
            payload.message ?? `Failed with status ${response.status}`,
          );
        }
        setMessages(payload.data);
        setPage(1);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Nu s-au putut încărca mesajele",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadMessages();
    return () => controller.abort();
  }, [backendBaseUrl]);

  const totalPages = Math.max(1, Math.ceil(messages.length / MESSAGES_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = messages.slice(
    (safePage - 1) * MESSAGES_PAGE_SIZE,
    safePage * MESSAGES_PAGE_SIZE,
  );

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
                          Nu există mesaje.
                        </td>
                      </tr>
                    ) : null}
                    {!isLoading && !loadError
                      ? paginated.map((msg) => (
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

            {!isLoading && !loadError && messages.length > 0 ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-sm text-gray-600">
                  Afișare{" "}
                  <span className="font-semibold">
                    {(safePage - 1) * MESSAGES_PAGE_SIZE + 1}
                  </span>
                  {"–"}
                  <span className="font-semibold">
                    {Math.min(safePage * MESSAGES_PAGE_SIZE, messages.length)}
                  </span>{" "}
                  din <span className="font-semibold">{messages.length}</span>{" "}
                  mesaje
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={safePage <= 1}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Înapoi
                  </button>
                  <span className="text-sm text-gray-600">
                    Pagina <span className="font-semibold">{safePage}</span> din{" "}
                    <span className="font-semibold">{totalPages}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={safePage >= totalPages}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Înainte
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
