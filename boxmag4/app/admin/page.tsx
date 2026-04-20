"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { B2b } from "../global/components/b2b";

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

type AdminBoxType = {
  id: number;
  key: string;
  title: string;
  imagePath: string;
  isActive: boolean;
};

type EditableBoxType = Pick<AdminBoxType, "title" | "imagePath" | "isActive"> & {
  imageFile: File | null;
  previewImagePath: string;
};

export default function AdminPage() {
  const [boxTypes, setBoxTypes] = useState<AdminBoxType[]>([]);
  const [isLoadingBoxTypes, setIsLoadingBoxTypes] = useState(true);
  const [boxTypesError, setBoxTypesError] = useState<string | null>(null);
  const [editingBoxId, setEditingBoxId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<EditableBoxType | null>(null);
  const [isSavingBoxType, setIsSavingBoxType] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadBoxTypes() {
      setIsLoadingBoxTypes(true);
      setBoxTypesError(null);
      try {
        const response = await fetch(`${backendBaseUrl}/api/box-types`);
        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }
        const payload = (await response.json()) as {
          ok: boolean;
          data?: AdminBoxType[];
          message?: string;
        };
        if (!payload.ok || !Array.isArray(payload.data)) {
          throw new Error(payload.message ?? "Invalid response payload");
        }
        if (isMounted) {
          setBoxTypes(payload.data);
        }
      } catch (error) {
        if (isMounted) {
          setBoxTypesError(error instanceof Error ? error.message : "Failed to load box types");
        }
      } finally {
        if (isMounted) {
          setIsLoadingBoxTypes(false);
        }
      }
    }

    void loadBoxTypes();

    return () => {
      isMounted = false;
    };
  }, [backendBaseUrl]);

  function startEditing(boxType: AdminBoxType) {
    setEditingBoxId(boxType.id);
    setEditingData({
      title: boxType.title,
      imagePath: boxType.imagePath,
      isActive: boxType.isActive,
      imageFile: null,
      previewImagePath: boxType.imagePath,
    });
    setSaveError(null);
  }

  function cancelEditing() {
    if (editingData?.previewImagePath.startsWith("blob:")) {
      URL.revokeObjectURL(editingData.previewImagePath);
    }
    setEditingBoxId(null);
    setEditingData(null);
    setSaveError(null);
  }

  async function saveEditedBoxType() {
    if (editingBoxId == null || editingData == null) return;

    setIsSavingBoxType(true);
    setSaveError(null);
    try {
      const response = await fetch(`${backendBaseUrl}/api/box-types/${editingBoxId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingData),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? `Failed with status ${response.status}`);
      }

      setBoxTypes((current) =>
        current.map((boxType) =>
          boxType.id === editingBoxId
            ? {
                ...boxType,
                title: editingData.title,
                imagePath: editingData.imagePath,
                isActive: editingData.isActive,
              }
            : boxType
        )
      );
      cancelEditing();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to update box type");
    } finally {
      setIsSavingBoxType(false);
    }
  }

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
                          <tr key={boxType.id} className="border-t border-gray-200">
                            <td className="px-4 py-3">{boxType.id}</td>
                            <td className="px-4 py-3">
                              {editingBoxId === boxType.id && editingData ? (
                                <input
                                  type="text"
                                  value={editingData.title}
                                  onChange={(event) =>
                                    setEditingData((current) =>
                                      current
                                        ? {
                                            ...current,
                                            title: event.target.value,
                                          }
                                        : current
                                    )
                                  }
                                  className="h-10 w-full min-w-48 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                                />
                              ) : (
                                boxType.title
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {editingBoxId === boxType.id && editingData ? (
                                <div className="space-y-2">
                                  <img
                                    src={editingData.previewImagePath}
                                    alt={editingData.title}
                                    className="h-12 w-12 rounded-md border border-gray-200 object-cover"
                                  />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) =>
                                      setEditingData((current) => {
                                        if (!current) return current;

                                        if (current.previewImagePath.startsWith("blob:")) {
                                          URL.revokeObjectURL(current.previewImagePath);
                                        }

                                        const file = event.target.files?.[0] ?? null;
                                        if (!file) {
                                          return {
                                            ...current,
                                            imageFile: null,
                                            previewImagePath: current.imagePath,
                                          };
                                        }

                                        return {
                                          ...current,
                                          imageFile: file,
                                          previewImagePath: URL.createObjectURL(file),
                                        };
                                      })
                                    }
                                    className="h-10 w-full min-w-56 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-my-light-gray2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-800 hover:file:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                                  />
                                  <span className="text-xs text-gray-500">
                                    {editingData.imageFile
                                      ? `Selected: ${editingData.imageFile.name}`
                                      : "Current image will be kept unless upload handling is added."}
                                  </span>
                                </div>
                              ) : (
                                <img
                                  src={boxType.imagePath}
                                  alt={boxType.title}
                                  className="h-12 w-12 rounded-md border border-gray-200 object-cover"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {editingBoxId === boxType.id && editingData ? (
                                <select
                                  value={editingData.isActive ? "active" : "draft"}
                                  onChange={(event) =>
                                    setEditingData((current) =>
                                      current
                                        ? {
                                            ...current,
                                            isActive: event.target.value === "active",
                                          }
                                        : current
                                    )
                                  }
                                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                                >
                                  <option value="active">Active</option>
                                  <option value="draft">Draft</option>
                                </select>
                              ) : (
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                    boxType.isActive
                                      ? "bg-green-100 text-green-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {boxType.isActive ? "Active" : "Draft"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {editingBoxId === boxType.id ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void saveEditedBoxType()}
                                    disabled={isSavingBoxType}
                                    className="rounded-md bg-my-red px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isSavingBoxType ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditing}
                                    disabled={isSavingBoxType}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startEditing(boxType)}
                                  className="rounded-md bg-my-yellow px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-my-yellow-bright"
                                >
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
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
      <input
        type="file"
        accept="image/*"
        onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        className="h-11 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-my-light-gray2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-800 hover:file:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
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
