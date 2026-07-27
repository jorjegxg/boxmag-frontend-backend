"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getBackendBaseUrl } from "../../components/admin-types";
import { formatAdminDate } from "../../admin-ro";

type AdminContactMessage = {
  id: number;
  customerName: string;
  companyName: string;
  vatNumber: string;
  email: string;
  phone: string;
  country: string;
  message: string;
  attachmentNames: string;
  status: string;
  replyMessage: string | null;
  repliedAt: string | null;
  repliedFrom: string | null;
  createdAt: string;
};

type ReplySenderOption = {
  key: "info" | "b2b" | "orders";
  email: string;
  label: string;
};

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value || "—"}</p>
    </div>
  );
}

export default function AdminMessageDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const messageId = Number(params.id ?? "");

  const [message, setMessage] = useState<AdminContactMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [senders, setSenders] = useState<ReplySenderOption[]>([]);
  const [selectedSenderKey, setSelectedSenderKey] = useState<
    ReplySenderOption["key"] | ""
  >("");
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  useEffect(() => {
    if (!Number.isInteger(messageId) || messageId <= 0) {
      setMessage(null);
      setLoadError("ID mesaj invalid.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadMessage = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(
          `${backendBaseUrl}/api/contact/${messageId}`,
          { credentials: "include", signal: controller.signal },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          data?: AdminContactMessage;
        };
        if (!response.ok || payload.ok !== true || !payload.data) {
          throw new Error(
            payload.message ?? "Nu s-a putut încărca mesajul",
          );
        }
        setMessage(payload.data);
        if (payload.data.replyMessage) {
          setReplyText(payload.data.replyMessage);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setMessage(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Nu s-a putut încărca mesajul",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadMessage();
    return () => controller.abort();
  }, [backendBaseUrl, messageId]);

  useEffect(() => {
    const controller = new AbortController();
    const loadSenders = async () => {
      try {
        const response = await fetch(
          `${backendBaseUrl}/api/contact/reply-senders`,
          { credentials: "include", signal: controller.signal },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: ReplySenderOption[];
          defaultKey?: ReplySenderOption["key"];
        };
        if (
          !response.ok ||
          payload.ok !== true ||
          !Array.isArray(payload.data)
        ) {
          return;
        }
        setSenders(payload.data);
        setSelectedSenderKey((current) => {
          if (current) return current;
          const defaultKey = payload.defaultKey;
          if (
            defaultKey &&
            payload.data?.some((sender) => sender.key === defaultKey)
          ) {
            return defaultKey;
          }
          return payload.data?.[0]?.key ?? "";
        });
      } catch {
        if (controller.signal.aborted) return;
        setSenders([]);
      }
    };

    void loadSenders();
    return () => controller.abort();
  }, [backendBaseUrl]);

  const handleSendReply = async () => {
    if (!message || !selectedSenderKey || !replyText.trim()) return;
    setIsSending(true);
    setReplyError(null);
    setReplySuccess(null);
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/contact/${message.id}/reply`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromKey: selectedSenderKey,
            message: replyText,
          }),
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        data?: {
          to?: string;
          repliedFrom?: string | null;
          repliedAt?: string | null;
        };
      };
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? "Nu s-a putut trimite răspunsul");
      }
      const repliedAt = payload.data?.repliedAt ?? new Date().toISOString();
      const repliedFrom = payload.data?.repliedFrom ?? null;
      setMessage((current) =>
        current
          ? {
              ...current,
              status: "replied",
              replyMessage: replyText,
              repliedAt,
              repliedFrom,
            }
          : current,
      );
      setReplySuccess(
        `Răspuns trimis către ${payload.data?.to ?? message.email}${
          repliedFrom ? ` de la ${repliedFrom}` : ""
        }.`,
      );
    } catch (error) {
      setReplyError(
        error instanceof Error
          ? error.message
          : "Nu s-a putut trimite răspunsul",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      <section className="w-full bg-white px-6 pt-6 lg:px-20">
        <div className="mx-auto max-w-7xl text-xs uppercase tracking-wide text-gray-500 lg:text-sm">
          <Link href="/" className="hover:underline">
            Acasă
          </Link>
          <span className="mx-2">→</span>
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>
          <span className="mx-2">→</span>
          <Link href="/admin/messages" className="hover:underline">
            Mesaje contact
          </Link>
          <span className="mx-2">→</span>
          <span className="font-semibold text-gray-700">
            {message ? message.customerName : `Mesaj #${messageId}`}
          </span>
        </div>
      </section>

      <section className="w-full bg-white px-6 py-8 lg:px-20">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-black/15 bg-white">
          <div className="border-b border-gray-200 px-6 py-5 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900">Detalii mesaj</h1>
            <p className="mt-1 text-sm text-gray-600">
              Mesaj primit din formularul de contact
            </p>
          </div>

          <div className="space-y-6 p-6 lg:p-8">
            {isLoading ? (
              <p className="text-sm text-gray-600">Se încarcă mesajul...</p>
            ) : loadError ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-red-700">{loadError}</p>
                <Link
                  href="/admin/messages"
                  className="text-sm font-semibold text-my-red hover:underline"
                >
                  Înapoi la lista de mesaje
                </Link>
              </div>
            ) : !message ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-red-700">
                  Mesajul nu a fost găsit.
                </p>
                <Link
                  href="/admin/messages"
                  className="text-sm font-semibold text-my-red hover:underline"
                >
                  Înapoi la lista de mesaje
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {message.customerName}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Primit pe {formatAdminDate(message.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/admin/messages")}
                    className="inline-flex h-9 items-center rounded-md border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Înapoi la lista de mesaje
                  </button>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    Expeditor
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField label="Nume" value={message.customerName} />
                    <DetailField label="Companie" value={message.companyName} />
                    <DetailField label="CUI / VAT" value={message.vatNumber} />
                    <DetailField label="Email" value={message.email} />
                    <DetailField label="Telefon" value={message.phone} />
                    <DetailField label="Țară" value={message.country} />
                    <DetailField
                      label="Atașamente"
                      value={message.attachmentNames}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    Mesaj
                  </h3>
                  <div className="mt-3 whitespace-pre-line text-sm text-gray-700">
                    {message.message}
                  </div>
                </div>

                {message.repliedAt ? (
                  <div
                    role="status"
                    className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
                  >
                    <p className="font-semibold">Răspuns deja trimis</p>
                    <p className="mt-1">
                      Trimis pe {formatAdminDate(message.repliedAt)}
                      {message.repliedFrom
                        ? ` de la ${message.repliedFrom}`
                        : ""}{" "}
                      către {message.email}.
                    </p>
                  </div>
                ) : null}

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    Trimite răspuns
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Răspunde direct clientului la{" "}
                    <span className="font-semibold text-gray-900">
                      {message.email || "—"}
                    </span>
                    .
                  </p>

                  {senders.length === 0 ? (
                    <p className="mt-4 text-sm text-amber-700">
                      Nu există adrese expeditor configurate. Setează SMTP și
                      variabilele de email în `.env`.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label
                          htmlFor="reply-sender"
                          className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                          Trimite de la
                        </label>
                        <select
                          id="reply-sender"
                          value={selectedSenderKey}
                          disabled={isSending}
                          onChange={(event) =>
                            setSelectedSenderKey(
                              event.target.value as ReplySenderOption["key"],
                            )
                          }
                          className="mt-2 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-my-red focus:outline-none focus:ring-2 focus:ring-my-red disabled:bg-gray-100"
                        >
                          {senders.map((sender) => (
                            <option key={sender.key} value={sender.key}>
                              {sender.label} ({sender.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="reply-message"
                          className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                          Mesaj
                        </label>
                        <textarea
                          id="reply-message"
                          rows={6}
                          value={replyText}
                          disabled={isSending}
                          onChange={(event) => setReplyText(event.target.value)}
                          placeholder="Scrie răspunsul tău aici..."
                          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-my-red focus:outline-none focus:ring-2 focus:ring-my-red disabled:bg-gray-100"
                        />
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          disabled={
                            isSending ||
                            !selectedSenderKey ||
                            !replyText.trim() ||
                            !message.email.trim()
                          }
                          onClick={() => void handleSendReply()}
                          className="inline-flex h-10 items-center justify-center rounded-md bg-my-red px-5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSending
                            ? "Se trimite..."
                            : message.repliedAt
                              ? "Retrimite răspuns"
                              : "Trimite răspuns"}
                        </button>
                        {replySuccess ? (
                          <p className="text-sm font-medium text-green-700">
                            {replySuccess}
                          </p>
                        ) : null}
                        {replyError ? (
                          <p className="text-sm font-medium text-red-700">
                            {replyError}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
