"use client";

import { memo, type ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

type AdminOrder = {
  id: number;
  orderNumber: string;
  customerName: string;
  companyName: string;
  boxTypeName: string;
  cardboardType: string;
  cardboardColour: string;
  boxPrint: string;
  size: string;
  transport: string;
  quantity: number;
  attachmentName: string | null;
  message: string;
  status: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  createdAt: string;
};
type AdminShippingMethod = {
  id: number;
  key: string;
  name: string;
  etaText: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
};
type OrderStatusValue = "new" | "in progress" | "completed" | "done";
const ORDER_STATUS_OPTIONS: OrderStatusValue[] = [
  "new",
  "in progress",
  "completed",
  "done",
];

export default function AdminPage() {
  const router = useRouter();
  const boxTypes = useAdminBoxTypesStore((state) => state.boxTypes);
  const isLoadingBoxTypes = useAdminBoxTypesStore(
    (state) => state.isLoadingBoxTypes,
  );
  const boxTypesError = useAdminBoxTypesStore((state) => state.boxTypesError);
  const saveError = useAdminBoxTypesStore((state) => state.saveError);
  const isSavingBoxType = useAdminBoxTypesStore(
    (state) => state.isSavingBoxType,
  );
  const setBackendBaseUrl = useAdminBoxTypesStore(
    (state) => state.setBackendBaseUrl,
  );
  const loadBoxTypes = useAdminBoxTypesStore((state) => state.loadBoxTypes);
  const createBoxType = useAdminBoxTypesStore((state) => state.createBoxType);
  const [boxTypeTitle, setBoxTypeTitle] = useState("");
  const [selectedBoxImageFiles, setSelectedBoxImageFiles] = useState<File[]>(
    [],
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [shippingMethods, setShippingMethods] = useState<AdminShippingMethod[]>(
    [],
  );
  const [isLoadingShippingMethods, setIsLoadingShippingMethods] =
    useState(true);
  const [shippingMethodsError, setShippingMethodsError] = useState<
    string | null
  >(null);
  const [updatingShippingMethodId, setUpdatingShippingMethodId] = useState<
    number | null
  >(null);
  const [newShippingKey, setNewShippingKey] = useState("");
  const [newShippingName, setNewShippingName] = useState("");
  const [newShippingEtaText, setNewShippingEtaText] = useState("");
  const [newShippingPrice, setNewShippingPrice] = useState("");
  const [newShippingSortOrder, setNewShippingSortOrder] = useState("0");
  const [newShippingIsActive, setNewShippingIsActive] = useState(true);

  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  const handleAddBoxType = async () => {
    const trimmedTitle = boxTypeTitle.trim();
    let uploadedImages: Array<{
      id: number;
      url: string;
      sortOrder: number;
      altText: string | null;
      isPrimary: boolean;
    }> = [];

    if (!trimmedTitle) {
      setFormError("Please fill in Title.");
      return;
    }

    setFormError(null);

    if (selectedBoxImageFiles.length > 0) {
      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        for (const file of selectedBoxImageFiles) {
          formData.append("images", file);
        }
        const uploadResponse = await fetch(
          `${backendBaseUrl}/api/box-types/upload-images`,
          {
            method: "POST",
            body: formData,
          },
        );
        const uploadBody = (await uploadResponse.json()) as {
          ok?: boolean;
          data?: { images?: Array<{ url?: string }> };
          message?: string;
        };

        if (
          !uploadResponse.ok ||
          uploadBody.ok !== true ||
          !Array.isArray(uploadBody.data?.images) ||
          uploadBody.data.images.length === 0
        ) {
          throw new Error(uploadBody.message ?? "Failed to upload image");
        }

        uploadedImages = uploadBody.data.images
          .map((image, index) => {
            const url = String(image.url ?? "").trim();
            if (!url) return null;
            return {
              id: index + 1,
              url,
              sortOrder: index,
              altText: null,
              isPrimary: index === 0,
            };
          })
          .filter((image): image is NonNullable<typeof image> => image != null);
      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : "Failed to upload image. Please try again.",
        );
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    if (uploadedImages.length === 0) {
      setFormError("Please choose a Box Image before adding.");
      return;
    }

    await createBoxType({
      title: trimmedTitle,
      images: uploadedImages,
      isActive: true,
    });

    const latestSaveError = useAdminBoxTypesStore.getState().saveError;
    if (!latestSaveError) {
      setBoxTypeTitle("");
      setSelectedBoxImageFiles([]);
    }
  };

  useEffect(() => {
    setBackendBaseUrl(backendBaseUrl);
    void loadBoxTypes();
  }, [backendBaseUrl, loadBoxTypes, setBackendBaseUrl]);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoadingOrders(true);
      setOrdersError(null);
      try {
        const response = await fetch(`${backendBaseUrl}/api/orders`);
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: AdminOrder[];
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
        setOrders(payload.data);
      } catch (error) {
        setOrdersError(
          error instanceof Error ? error.message : "Failed to load orders",
        );
      } finally {
        setIsLoadingOrders(false);
      }
    };

    void loadOrders();
  }, [backendBaseUrl]);

  const loadShippingMethods = async () => {
    setIsLoadingShippingMethods(true);
    setShippingMethodsError(null);
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/shipping-methods?includeInactive=true`,
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: AdminShippingMethod[];
        message?: string;
      };
      if (!response.ok || payload.ok !== true || !Array.isArray(payload.data)) {
        throw new Error(
          payload.message ?? `Failed with status ${response.status}`,
        );
      }
      setShippingMethods(
        payload.data.sort((a, b) =>
          a.sortOrder === b.sortOrder ? a.id - b.id : a.sortOrder - b.sortOrder,
        ),
      );
    } catch (error) {
      setShippingMethodsError(
        error instanceof Error
          ? error.message
          : "Failed to load shipping methods",
      );
    } finally {
      setIsLoadingShippingMethods(false);
    }
  };

  useEffect(() => {
    void loadShippingMethods();
  }, [backendBaseUrl]);

  const handleOrderStatusChange = async (
    orderId: number,
    nextStatus: OrderStatusValue,
  ) => {
    setUpdatingOrderId(orderId);
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || payload.ok !== true) {
        throw new Error(
          payload.message ?? `Failed with status ${response.status}`,
        );
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: nextStatus } : order,
        ),
      );
    } catch (error) {
      setOrdersError(
        error instanceof Error
          ? error.message
          : "Failed to update order status",
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleAddShippingMethod = async () => {
    const priceValue = Number(newShippingPrice);
    const sortOrderValue = Number(newShippingSortOrder);
    if (
      !newShippingKey.trim() ||
      !newShippingName.trim() ||
      !newShippingEtaText.trim() ||
      !Number.isFinite(priceValue) ||
      priceValue < 0 ||
      !Number.isFinite(sortOrderValue)
    ) {
      setShippingMethodsError(
        "Please fill all shipping method fields correctly.",
      );
      return;
    }

    try {
      const response = await fetch(`${backendBaseUrl}/api/shipping-methods`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: newShippingKey.trim().toLowerCase(),
          name: newShippingName.trim(),
          etaText: newShippingEtaText.trim(),
          price: priceValue,
          sortOrder: sortOrderValue,
          isActive: newShippingIsActive,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || payload.ok !== true) {
        throw new Error(
          payload.message ?? `Failed with status ${response.status}`,
        );
      }
      setNewShippingKey("");
      setNewShippingName("");
      setNewShippingEtaText("");
      setNewShippingPrice("");
      setNewShippingSortOrder("0");
      setNewShippingIsActive(true);
      await loadShippingMethods();
    } catch (error) {
      setShippingMethodsError(
        error instanceof Error
          ? error.message
          : "Failed to create shipping method",
      );
    }
  };

  const handleUpdateShippingMethod = async (method: AdminShippingMethod) => {
    setUpdatingShippingMethodId(method.id);
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/shipping-methods/${method.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: method.key,
            name: method.name,
            etaText: method.etaText,
            price: method.price,
            sortOrder: method.sortOrder,
            isActive: method.isActive,
          }),
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || payload.ok !== true) {
        throw new Error(
          payload.message ?? `Failed with status ${response.status}`,
        );
      }
      await loadShippingMethods();
    } catch (error) {
      setShippingMethodsError(
        error instanceof Error
          ? error.message
          : "Failed to update shipping method",
      );
    } finally {
      setUpdatingShippingMethodId(null);
    }
  };

  const handleDeleteShippingMethod = async (shippingMethodId: number) => {
    setUpdatingShippingMethodId(shippingMethodId);
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/shipping-methods/${shippingMethodId}`,
        {
          method: "DELETE",
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || payload.ok !== true) {
        throw new Error(
          payload.message ?? `Failed with status ${response.status}`,
        );
      }
      await loadShippingMethods();
    } catch (error) {
      setShippingMethodsError(
        error instanceof Error
          ? error.message
          : "Failed to delete shipping method",
      );
    } finally {
      setUpdatingShippingMethodId(null);
    }
  };

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
    if (
      typeof window === "undefined" ||
      typeof PerformanceObserver === "undefined"
    )
      return;

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
          <SectionTitle
            title="Orders"
            subtitle="Data loaded from orders + contacts"
          />

          <div className="p-6 lg:p-8 space-y-6">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-my-light-gray2 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Order ID
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Company
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Box Type
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingOrders ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={6}>
                          Loading orders...
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingOrders && ordersError ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-red-600" colSpan={6}>
                          Failed to load orders: {ordersError}
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingOrders && !ordersError && orders.length === 0 ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={6}>
                          No orders found.
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingOrders && !ordersError
                      ? orders.map((order) => (
                          <tr
                            key={order.id}
                            className="border-t border-gray-200 cursor-pointer transition-colors hover:bg-gray-50"
                            onClick={() =>
                              router.push(`/admin/orders/${order.id}`)
                            }
                          >
                            <td className="px-4 py-3 font-medium text-my-red">
                              {order.orderNumber}
                            </td>
                            <td className="px-4 py-3">{order.customerName}</td>
                            <td className="px-4 py-3">{order.companyName}</td>
                            <td className="px-4 py-3">{order.boxTypeName}</td>
                            <td className="px-4 py-3">{order.quantity}</td>
                            <td
                              className="px-4 py-3"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <OrderStatusControl
                                orderId={order.id}
                                status={order.status}
                                disabled={updatingOrderId === order.id}
                                onChange={handleOrderStatusChange}
                              />
                            </td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-white px-6 lg:px-20 pb-8">
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden mb-8">
          <SectionTitle
            title="Shipping Methods"
            subtitle="Checkout methods managed from admin"
          />
          <div className="p-6 lg:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Field
                label="Key"
                placeholder="standard"
                value={newShippingKey}
                onChange={setNewShippingKey}
              />
              <Field
                label="Name"
                placeholder="Standard Delivery"
                value={newShippingName}
                onChange={setNewShippingName}
              />
              <Field
                label="ETA Text"
                placeholder="Estimated 7-10 days"
                value={newShippingEtaText}
                onChange={setNewShippingEtaText}
              />
              <Field
                label="Price"
                placeholder="25"
                value={newShippingPrice}
                onChange={setNewShippingPrice}
              />
              <Field
                label="Sort Order"
                placeholder="1"
                value={newShippingSortOrder}
                onChange={setNewShippingSortOrder}
              />
              <label className="flex items-end gap-2">
                <input
                  type="checkbox"
                  checked={newShippingIsActive}
                  onChange={(event) =>
                    setNewShippingIsActive(event.target.checked)
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm font-semibold text-gray-800 pb-2">
                  Active
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleAddShippingMethod()}
                className="bg-my-yellow hover:bg-my-yellow-bright text-black font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                Add shipping method
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-my-light-gray2 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Key</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">ETA</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Sort
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Active
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingShippingMethods ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={7}>
                          Loading shipping methods...
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingShippingMethods &&
                    shippingMethods.length === 0 ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={7}>
                          No shipping methods found.
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingShippingMethods
                      ? shippingMethods.map((method) => (
                          <tr
                            key={method.id}
                            className="border-t border-gray-200"
                          >
                            <td className="px-4 py-3">
                              <input
                                value={method.key}
                                onChange={(event) =>
                                  setShippingMethods((prev) =>
                                    prev.map((item) =>
                                      item.id === method.id
                                        ? { ...item, key: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                                className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                value={method.name}
                                onChange={(event) =>
                                  setShippingMethods((prev) =>
                                    prev.map((item) =>
                                      item.id === method.id
                                        ? { ...item, name: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                                className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                value={method.etaText}
                                onChange={(event) =>
                                  setShippingMethods((prev) =>
                                    prev.map((item) =>
                                      item.id === method.id
                                        ? {
                                            ...item,
                                            etaText: event.target.value,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={String(method.price)}
                                onChange={(event) =>
                                  setShippingMethods((prev) =>
                                    prev.map((item) =>
                                      item.id === method.id
                                        ? {
                                            ...item,
                                            price:
                                              Number(event.target.value) || 0,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={String(method.sortOrder)}
                                onChange={(event) =>
                                  setShippingMethods((prev) =>
                                    prev.map((item) =>
                                      item.id === method.id
                                        ? {
                                            ...item,
                                            sortOrder:
                                              Number(event.target.value) || 0,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                className="h-9 w-20 rounded-md border border-gray-300 bg-white px-2 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={method.isActive}
                                onChange={(event) =>
                                  setShippingMethods((prev) =>
                                    prev.map((item) =>
                                      item.id === method.id
                                        ? {
                                            ...item,
                                            isActive: event.target.checked,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                className="h-4 w-4"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    updatingShippingMethodId === method.id
                                  }
                                  onClick={() =>
                                    void handleUpdateShippingMethod(method)
                                  }
                                  className="rounded-md bg-my-yellow px-3 py-1.5 text-xs font-semibold text-black hover:bg-my-yellow-bright disabled:opacity-60"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    updatingShippingMethodId === method.id
                                  }
                                  onClick={() =>
                                    void handleDeleteShippingMethod(method.id)
                                  }
                                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>
            </div>
            {shippingMethodsError ? (
              <p className="text-sm text-red-600">{shippingMethodsError}</p>
            ) : null}
          </div>
        </div>
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden">
          <SectionTitle title="Box Types Management" />

          <div className="p-6 lg:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field
                label="Title"
                placeholder="e.g. Boxfix Premium 500"
                value={boxTypeTitle}
                onChange={setBoxTypeTitle}
              />
              <ImagePickerField
                label="Box Images"
                selectedFiles={selectedBoxImageFiles}
                onFileChange={setSelectedBoxImageFiles}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleAddBoxType()}
                disabled={
                  isSavingBoxType ||
                  isUploadingImage ||
                  selectedBoxImageFiles.length === 0
                }
                className="bg-my-yellow hover:bg-my-yellow-bright text-black font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {isUploadingImage
                  ? "Uploading image..."
                  : isSavingBoxType
                    ? "Adding..."
                    : "Add Box Type"}
              </button>
            </div>
            {formError ? (
              <p className="text-sm text-red-600">{formError}</p>
            ) : null}

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-my-light-gray2 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">ID</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Photo
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Actions
                      </th>
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
                    {!isLoadingBoxTypes &&
                    !boxTypesError &&
                    boxTypes.length === 0 ? (
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
    </div>
  );
}

const BoxTypeRow = memo(function BoxTypeRow({
  boxType,
}: {
  boxType: AdminBoxType;
}) {
  const primaryImage =
    boxType.images.find((image) => image.isPrimary) ??
    boxType.images[0] ??
    null;

  return (
    <tr className="border-t border-gray-200">
      <td className="px-4 py-3">{boxType.id}</td>
      <td className="px-4 py-3">{boxType.title}</td>
      <td className="px-4 py-3">
        <img
          src={primaryImage?.url ?? "/placeholders/box4.png"}
          alt={boxType.title}
          className="h-12 w-12 rounded-md border border-gray-200 object-cover"
        />
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
            boxType.isActive
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
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

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-my-red w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 sm:pl-8 sm:pr-4 sm:py-4 text-my-white">
      <span className="font-bold text-base sm:text-lg">{title}</span>
      {subtitle ? (
        <span className="text-sm sm:text-base">{subtitle}</span>
      ) : null}
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
      />
    </label>
  );
}

function ImagePickerField({
  label,
  selectedFiles,
  onFileChange,
}: {
  label: string;
  selectedFiles: File[];
  onFileChange: (files: File[]) => void;
}) {
  const inputId = "box-image-upload";
  const previewUrl = useMemo(() => {
    if (selectedFiles.length === 0) return "";
    return URL.createObjectURL(selectedFiles[0]);
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      <FilePickerInput
        inputId={inputId}
        selectedFileName={selectedFiles.map((file) => file.name).join(", ")}
        onChange={(event) => onFileChange(Array.from(event.target.files ?? []))}
      />
      {selectedFiles.length > 0 ? (
        <span className="text-xs text-gray-600 truncate">
          {selectedFiles.length} file(s) selected
        </span>
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
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        onChange={onChange}
        className="hidden"
      />
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

function OrderStatusControl({
  orderId,
  status,
  disabled,
  onChange,
}: {
  orderId: number;
  status: string;
  disabled: boolean;
  onChange: (orderId: number, nextStatus: OrderStatusValue) => Promise<void>;
}) {
  const normalizedStatus = status.toLowerCase();
  const selectedStatus = ORDER_STATUS_OPTIONS.includes(
    normalizedStatus as OrderStatusValue,
  )
    ? (normalizedStatus as OrderStatusValue)
    : "new";

  return (
    <select
      value={selectedStatus}
      disabled={disabled}
      onChange={(event) =>
        void onChange(orderId, event.target.value as OrderStatusValue)
      }
      className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red disabled:bg-gray-100 disabled:text-gray-500"
    >
      {ORDER_STATUS_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
