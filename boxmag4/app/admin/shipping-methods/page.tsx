"use client";

import { useEffect, useMemo, useState } from "react";
import { useNotification } from "../../global/components/notification-center";
import {
  type AdminShippingMethod,
  getBackendBaseUrl,
} from "../components/admin-types";
import {
  AdminBreadcrumb,
  Field,
  SectionTitle,
} from "../components/admin-ui";

export default function AdminShippingMethodsPage() {
  const { notify } = useNotification();
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

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  const loadShippingMethods = async () => {
    setIsLoadingShippingMethods(true);
    setShippingMethodsError(null);
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/shipping-methods?includeInactive=true`,
        { credentials: "include" },
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
          : "Nu s-au putut încărca metodele de livrare",
      );
    } finally {
      setIsLoadingShippingMethods(false);
    }
  };

  useEffect(() => {
    void loadShippingMethods();
    // Initial load for this backend URL only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendBaseUrl]);
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
        "Completează corect toate câmpurile metodei de livrare.",
      );
      return;
    }

    try {
      const response = await fetch(`${backendBaseUrl}/api/shipping-methods`, {
        method: "POST",
        credentials: "include",
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
          : "Nu s-a putut crea metoda de livrare",
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
          credentials: "include",
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
      notify({
        type: "success",
        message: `Metoda de livrare „${method.name}” a fost salvată.`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nu s-a putut actualiza metoda de livrare";
      setShippingMethodsError(message);
      notify({ type: "error", message });
    } finally {
      setUpdatingShippingMethodId(null);
    }
  };

  const handleDeleteShippingMethod = async (
    shippingMethodId: number,
    shippingMethodName: string,
  ) => {
    const confirmed = window.confirm(
      `Ștergi metoda de livrare „${shippingMethodName}”? Această acțiune nu poate fi anulată.`,
    );
    if (!confirmed) return;

    setUpdatingShippingMethodId(shippingMethodId);
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/shipping-methods/${shippingMethodId}`,
        {
          method: "DELETE",
          credentials: "include",
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
      notify({
        type: "success",
        message: `Metoda de livrare „${shippingMethodName}” a fost ștearsă.`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nu s-a putut șterge metoda de livrare";
      setShippingMethodsError(message);
      notify({ type: "error", message });
    } finally {
      setUpdatingShippingMethodId(null);
    }
  };

  return (
    <div>
      <AdminBreadcrumb current="Metode de livrare" />

      <section className="w-full bg-white px-6 lg:px-20 py-8">
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden">
          <SectionTitle
            title="Metode de livrare"
            subtitle="Metode de checkout gestionate din admin"
          />
          <div className="p-6 lg:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Field
                label="Cheie"
                placeholder="standard"
                value={newShippingKey}
                onChange={setNewShippingKey}
              />
              <Field
                label="Nume"
                placeholder="Livrare standard"
                value={newShippingName}
                onChange={setNewShippingName}
              />
              <Field
                label="Text ETA"
                placeholder="Estimat 7-10 zile"
                value={newShippingEtaText}
                onChange={setNewShippingEtaText}
              />
              <Field
                label="Preț"
                placeholder="25"
                value={newShippingPrice}
                onChange={setNewShippingPrice}
              />
              <Field
                label="Ordine sortare"
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
                  Activă
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleAddShippingMethod()}
                className="bg-my-yellow hover:bg-my-yellow-bright text-black font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                Adaugă metodă de livrare
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-my-light-gray2 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Cheie
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Nume
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">ETA</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Preț
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Sortare
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Activă
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Acțiuni
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingShippingMethods ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={7}>
                          Se încarcă metodele de livrare...
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingShippingMethods &&
                    shippingMethods.length === 0 ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={7}>
                          Nu există metode de livrare.
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
                                        ? {
                                            ...item,
                                            name: event.target.value,
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
                                  Salvează
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    updatingShippingMethodId === method.id
                                  }
                                  onClick={() =>
                                    void handleDeleteShippingMethod(
                                      method.id,
                                      method.name,
                                    )
                                  }
                                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  Șterge
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
      </section>
    </div>
  );
}
