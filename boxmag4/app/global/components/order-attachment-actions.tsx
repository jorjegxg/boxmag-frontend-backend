"use client";

import { useMemo } from "react";

type OrderAttachmentActionsProps = {
  orderId: number;
  attachmentName: string | null;
  hasAttachment: boolean;
  ownerEmail?: string;
  label?: string;
};

function resolveBackendBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (!value) return "http://localhost:3005";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildAttachmentUrl(
  orderId: number,
  ownerEmail: string | undefined,
  download: boolean,
): string {
  const backendBaseUrl = resolveBackendBaseUrl();
  const params = new URLSearchParams();
  if (ownerEmail?.trim()) {
    params.set("email", ownerEmail.trim());
  }
  if (download) {
    params.set("download", "1");
  }
  const query = params.toString();
  return `${backendBaseUrl}/api/orders/${orderId}/attachment${query ? `?${query}` : ""}`;
}

export function OrderAttachmentActions({
  orderId,
  attachmentName,
  hasAttachment,
  ownerEmail,
  label = "Attachment",
}: OrderAttachmentActionsProps) {
  const viewUrl = useMemo(
    () => buildAttachmentUrl(orderId, ownerEmail, false),
    [orderId, ownerEmail],
  );
  const downloadUrl = useMemo(
    () => buildAttachmentUrl(orderId, ownerEmail, true),
    [orderId, ownerEmail],
  );

  if (!hasAttachment || !attachmentName) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="mt-1 text-sm font-medium text-gray-900">No</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-medium text-gray-900">
        {attachmentName}
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-my-red hover:underline"
        >
          Open attachment
        </a>
        <a
          href={downloadUrl}
          className="text-sm font-semibold text-gray-700 hover:underline"
        >
          Download
        </a>
      </div>
    </div>
  );
}
