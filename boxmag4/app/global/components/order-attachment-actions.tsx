"use client";

import { useMemo } from "react";
import { getBackendBaseUrl } from "../../../lib/backend-url";
import { useLanguage } from "../../i18n/language-context";

type OrderAttachmentActionsProps = {
  orderId: number;
  attachmentName: string | null;
  hasAttachment: boolean;
  ownerEmail?: string;
  label?: string;
  emptyText?: string;
  openText?: string;
  downloadText?: string;
};

function buildAttachmentUrl(
  orderId: number,
  ownerEmail: string | undefined,
  download: boolean,
): string {
  const backendBaseUrl = getBackendBaseUrl();
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
  label,
  emptyText,
  openText,
  downloadText,
}: OrderAttachmentActionsProps) {
  const { t } = useLanguage();
  const resolvedLabel = label ?? t("attachment.label");
  const resolvedEmptyText = emptyText ?? t("attachment.empty");
  const resolvedOpenText = openText ?? t("attachment.open");
  const resolvedDownloadText = downloadText ?? t("attachment.download");

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
          {resolvedLabel}
        </p>
        <p className="mt-1 text-sm font-medium text-gray-900">{resolvedEmptyText}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {resolvedLabel}
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
          {resolvedOpenText}
        </a>
        <a
          href={downloadUrl}
          className="text-sm font-semibold text-gray-700 hover:underline"
        >
          {resolvedDownloadText}
        </a>
      </div>
    </div>
  );
}
