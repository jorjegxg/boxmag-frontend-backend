"use client";

import { memo, type ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { B2b } from "../global/components/b2b";
import {
  type AdminBoxType,
  useAdminBoxTypesStore,
} from "./use-admin-box-types-store";

function sendDebugLog({
  hypothesisId,
  location,
  message,
  data,
}: {
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
}) {
  // #region agent log
  fetch("http://127.0.0.1:7337/ingest/001632f5-f360-4660-a740-ac305c61ac19", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "52d9a7",
    },
    body: JSON.stringify({
      sessionId: "52d9a7",
      runId: "pre-fix",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

let lastEditClickAt = 0;

const mockOrders = [
  {
    id: "ORD-1024",
    customer: "Luminex Store",
    boxType: "E-commerce Boxes Fefco 703",
    quantity: 1200,
    totalPrice: "2,180.00 EUR",
    status: "Pending",
  },
  {
    id: "ORD-1025",
    customer: "Trendy Hub",
    boxType: "Shipping Box Fefco 427",
    quantity: 800,
    totalPrice: "1,240.00 EUR",
    status: "In Progress",
  },
  {
    id: "ORD-1026",
    customer: "Fresh Bites",
    boxType: "Pizza Box",
    quantity: 2000,
    totalPrice: "1,760.00 EUR",
    status: "Completed",
  },
];

export default function AdminPage() {
  const boxTypes = useAdminBoxTypesStore((state) => state.boxTypes);
  const isLoadingBoxTypes = useAdminBoxTypesStore((state) => state.isLoadingBoxTypes);
  const boxTypesError = useAdminBoxTypesStore((state) => state.boxTypesError);
  const saveError = useAdminBoxTypesStore((state) => state.saveError);
  const setBackendBaseUrl = useAdminBoxTypesStore((state) => state.setBackendBaseUrl);
  const loadBoxTypes = useAdminBoxTypesStore((state) => state.loadBoxTypes);

  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  useEffect(() => {
    setBackendBaseUrl(backendBaseUrl);
    void loadBoxTypes();
  }, [backendBaseUrl, loadBoxTypes, setBackendBaseUrl]);

  useEffect(() => {
    if (boxTypes.length > 0) {
      sendDebugLog({
        hypothesisId: "H4",
        location: "page.tsx:AdminPage:boxTypesLoaded",
        message: "box types loaded for table",
        data: {
          boxCount: boxTypes.length,
        },
      });
    }
  }, [boxTypes.length]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const timeSinceEditClick = performance.now() - lastEditClickAt;
        if (timeSinceEditClick < 0 || timeSinceEditClick > 1500) continue;

        sendDebugLog({
          hypothesisId: "H6",
          location: "page.tsx:AdminPage:longTaskAfterEdit",
          message: "long task detected after edit click",
          data: {
            durationMs: Number(entry.duration.toFixed(2)),
            startTimeMs: Number(entry.startTime.toFixed(2)),
            timeSinceEditClickMs: Number(timeSinceEditClick.toFixed(2)),
            entryType: entry.entryType,
          },
        });
      }
    });

    try {
      observer.observe({
        type: "longtask",
        buffered: true,
      });
    } catch {
      sendDebugLog({
        hypothesisId: "H6",
        location: "page.tsx:AdminPage:longTaskObserverUnsupported",
        message: "long task observer unsupported",
        data: {},
      });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div>
      <B2b />

      <section className="w-full bg-white px-6 lg:px-20 pt-6">
        <div className="max-w-7xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            Home
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">Admin</span>
        </div>
      </section>

      <section className="w-full bg-white px-6 lg:px-20 py-8">
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden">
          <SectionTitle title="Box Types Management" subtitle="Data loaded from database" />

          <div className="p-6 lg:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Box Type ID" placeholder="e.g. BF10" />
              <Field label="Title" placeholder="e.g. Boxfix Premium 500" />
              <ImagePickerField label="Box Image" />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="bg-my-yellow hover:bg-my-yellow-bright text-black font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                Add Box Type
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-my-light-gray2 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Title</th>
                      <th className="px-4 py-3 text-left font-semibold">Photo</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingBoxTypes ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={5}>
                          Loading box types...
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingBoxTypes && boxTypesError ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-red-600" colSpan={5}>
                          Failed to load box types: {boxTypesError}
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingBoxTypes && !boxTypesError && boxTypes.length === 0 ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={5}>
                          No box types found.
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingBoxTypes && !boxTypesError
                      ? boxTypes.map((boxType) => (
                          <BoxTypeRow key={boxType.id} boxType={boxType} />
                        ))
                      : null}
                    {saveError ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-red-600" colSpan={5}>
                          Failed to save box type: {saveError}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-white px-6 lg:px-20 pb-8">
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden">
          <SectionTitle title="Orders" subtitle="Recent orders overview" />

          <div className="p-6 lg:p-8">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-my-light-gray2 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Order ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left font-semibold">Box Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Quantity</th>
                      <th className="px-4 py-3 text-left font-semibold">Total</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockOrders.map((order) => (
                      <tr key={order.id} className="border-t border-gray-200">
                        <td className="px-4 py-3 font-medium">{order.id}</td>
                        <td className="px-4 py-3">{order.customer}</td>
                        <td className="px-4 py-3">{order.boxType}</td>
                        <td className="px-4 py-3">{order.quantity}</td>
                        <td className="px-4 py-3">{order.totalPrice}</td>
                        <td className="px-4 py-3">
                          <OrderStatusBadge status={order.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

const BoxTypeRow = memo(function BoxTypeRow({ boxType }: { boxType: AdminBoxType }) {
  return (
    <tr className="border-t border-gray-200">
      <td className="px-4 py-3">{boxType.id}</td>
      <td className="px-4 py-3">{boxType.title}</td>
      <td className="px-4 py-3">
        <img
          src={boxType.imagePath}
          alt={boxType.title}
          className="h-12 w-12 rounded-md border border-gray-200 object-cover"
        />
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
            boxType.isActive ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {boxType.isActive ? "Active" : "Draft"}
        </span>
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/admin/box-types/${boxType.id}/edit`}
          onClick={() => {
            lastEditClickAt = performance.now();
          }}
          className="inline-flex rounded-md bg-my-yellow px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-my-yellow-bright"
        >
          Edit
        </Link>
      </td>
    </tr>
  );
});

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="bg-my-red w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 sm:pl-8 sm:pr-4 sm:py-4 text-my-white">
      <span className="font-bold text-base sm:text-lg">{title}</span>
      {subtitle ? <span className="text-sm sm:text-base">{subtitle}</span> : null}
    </div>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      <input
        type="text"
        placeholder={placeholder}
        className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
      />
    </label>
  );
}

function ImagePickerField({ label }: { label: string }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputId = "box-image-upload";

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      <FilePickerInput
        inputId={inputId}
        selectedFileName={selectedFile?.name ?? null}
        onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
      />
      {selectedFile ? (
        <span className="text-xs text-gray-600 truncate">{selectedFile.name}</span>
      ) : (
        <span className="text-xs text-gray-400">No image selected</span>
      )}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Selected box preview"
          className="h-16 w-16 rounded-md border border-gray-200 object-cover"
        />
      ) : null}
    </label>
  );
}

function FilePickerInput({
  inputId,
  selectedFileName,
  onChange,
  wrapperClassName = "h-11",
}: {
  inputId: string;
  selectedFileName: string | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  wrapperClassName?: string;
}) {
  return (
    <div
      className={`flex items-center rounded-lg border border-gray-300 bg-white px-2 ${wrapperClassName}`}
    >
      <input id={inputId} type="file" accept="image/*" onChange={onChange} className="hidden" />
      <label
        htmlFor={inputId}
        className="inline-flex h-8 cursor-pointer items-center rounded-md bg-my-light-gray2 px-3 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200"
      >
        Choose File
      </label>
      <span className="ml-3 truncate text-sm text-gray-700">
        {selectedFileName ? selectedFileName : "No file chosen"}
      </span>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  if (status === "Completed") {
    return (
      <span className="inline-flex rounded-full bg-green-100 text-green-700 px-2.5 py-1 text-xs font-medium">
        {status}
      </span>
    );
  }

  if (status === "In Progress") {
    return (
      <span className="inline-flex rounded-full bg-blue-100 text-blue-700 px-2.5 py-1 text-xs font-medium">
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-yellow-100 text-yellow-700 px-2.5 py-1 text-xs font-medium">
      {status}
    </span>
  );
}
