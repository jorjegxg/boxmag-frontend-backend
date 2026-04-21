"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { B2b } from "../../../../global/components/b2b";
import { useAdminBoxTypesStore } from "../../../use-admin-box-types-store";

type EditablePrice = {
  id?: number;
  name: string;
  withoutTax: number;
  withTax: number;
};

type EditableProduct = {
  id?: number;
  boxTypeId?: number;
  itemNo: string;
  productName: string;
  internalDimensionsMM: {
    l: number;
    w: number;
    h: number;
    h2: number | null;
  };
  qualityCardboard: string;
  palletDimensionsCM: {
    l: number;
    w: number;
    h: number;
  };
  weightPieceGr: number;
  weightPalletKg: number;
  amountQtyInPcs: number;
  palletPcs: number;
  prices: EditablePrice[];
};

export default function EditBoxTypePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const boxTypeId = Number(params.id);

  const boxTypes = useAdminBoxTypesStore((state) => state.boxTypes);
  const isLoadingBoxTypes = useAdminBoxTypesStore((state) => state.isLoadingBoxTypes);
  const boxTypesError = useAdminBoxTypesStore((state) => state.boxTypesError);
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

  const boxType = boxTypes.find((item) => item.id === boxTypeId);

  const [title, setTitle] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedImageFileName, setSelectedImageFileName] = useState<string | null>(null);
  const [previewImagePath, setPreviewImagePath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [products, setProducts] = useState<EditableProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  useEffect(() => {
    if (!boxType) return;
    setTitle(boxType.title);
    setImagePath(boxType.imagePath);
    setPreviewImagePath(boxType.imagePath);
    setIsActive(boxType.isActive);
  }, [boxType]);

  useEffect(() => {
    if (!Number.isInteger(boxTypeId) || boxTypeId <= 0) return;
    let isCancelled = false;
    async function loadProducts() {
      setIsLoadingProducts(true);
      setProductsError(null);
      try {
        const response = await fetch(`${backendBaseUrl}/api/box-types/${boxTypeId}/products`);
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          data?: unknown;
        };
        if (!response.ok || payload.ok !== true || !Array.isArray(payload.data)) {
          throw new Error(payload.message ?? `Failed with status ${response.status}`);
        }
        if (isCancelled) return;
        setProducts(payload.data as EditableProduct[]);
      } catch (error) {
        if (isCancelled) return;
        setProductsError(error instanceof Error ? error.message : "Failed to load box type products");
      } finally {
        if (!isCancelled) {
          setIsLoadingProducts(false);
        }
      }
    }
    void loadProducts();
    return () => {
      isCancelled = true;
    };
  }, [backendBaseUrl, boxTypeId]);

  useEffect(() => {
    return () => {
      if (previewImagePath?.startsWith("blob:")) {
        URL.revokeObjectURL(previewImagePath);
      }
    };
  }, [previewImagePath]);

  async function handleSave() {
    if (!boxType) return;

    const trimmedTitle = title.trim();
    const trimmedImagePath = imagePath.trim();

    if (!trimmedTitle || !trimmedImagePath) {
      setSaveError("Name and photo are required.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(`${backendBaseUrl}/api/box-types/${boxType.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          imagePath: trimmedImagePath,
          isActive,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? `Failed with status ${response.status}`);
      }

      const productsResponse = await fetch(`${backendBaseUrl}/api/box-types/${boxType.id}/products`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          products,
        }),
      });
      const productsPayload = (await productsResponse.json()) as { ok?: boolean; message?: string };
      if (!productsResponse.ok || productsPayload.ok !== true) {
        throw new Error(productsPayload.message ?? `Failed with status ${productsResponse.status}`);
      }

      await loadBoxTypes();
      router.push("/admin");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save box type");
    } finally {
      setIsSaving(false);
    }
  }

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedImageFileName(file?.name ?? null);

    if (previewImagePath?.startsWith("blob:")) {
      URL.revokeObjectURL(previewImagePath);
    }

    if (!file) {
      setPreviewImagePath(imagePath);
      return;
    }

    setPreviewImagePath(URL.createObjectURL(file));
  }

  function updateProduct(
    productIndex: number,
    updater: (current: EditableProduct) => EditableProduct
  ) {
    setProducts((current) => current.map((product, index) => (index === productIndex ? updater(product) : product)));
  }

  function updatePrice(
    productIndex: number,
    priceIndex: number,
    updater: (current: EditablePrice) => EditablePrice
  ) {
    updateProduct(productIndex, (product) => ({
      ...product,
      prices: product.prices.map((price, index) => (index === priceIndex ? updater(price) : price)),
    }));
  }

  function addProduct() {
    setProducts((current) => [...current, createEmptyProduct()]);
  }

  function removeProduct(productIndex: number) {
    setProducts((current) => current.filter((_, index) => index !== productIndex));
  }

  function addPrice(productIndex: number) {
    updateProduct(productIndex, (product) => ({
      ...product,
      prices: [...product.prices, createEmptyPrice()],
    }));
  }

  function removePrice(productIndex: number, priceIndex: number) {
    updateProduct(productIndex, (product) => ({
      ...product,
      prices: product.prices.filter((_, index) => index !== priceIndex),
    }));
  }

  const showNotFound = !isLoadingBoxTypes && !boxTypesError && Number.isInteger(boxTypeId) && !boxType;

  return (
    <div>
      <B2b />

      <section className="w-full bg-white px-6 lg:px-20 pt-6">
        <div className="max-w-7xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            Home
          </Link>{" "}
          <span className="mx-2">→</span>
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">Edit Box Type</span>
        </div>
      </section>

      <section className="w-full bg-white px-6 lg:px-20 py-8">
        <div className="max-w-4xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden">
          <div className="bg-my-red w-full px-6 py-4 text-my-white">
            <h1 className="text-lg font-bold">Edit Box Type</h1>
          </div>

          <div className="p-6 lg:p-8 space-y-6">
            {!Number.isInteger(boxTypeId) || boxTypeId <= 0 ? (
              <p className="text-red-600">Invalid box type id.</p>
            ) : null}
            {isLoadingBoxTypes ? <p className="text-gray-600">Loading box type...</p> : null}
            {boxTypesError ? <p className="text-red-600">Failed to load: {boxTypesError}</p> : null}
            {showNotFound ? <p className="text-red-600">Box type not found.</p> : null}

            {boxType ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">Name</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">Status</span>
                  <select
                    value={isActive ? "active" : "draft"}
                    onChange={(event) => setIsActive(event.target.value === "active")}
                    className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">Photo URL</span>
                  <input
                    type="text"
                    value={imagePath}
                    onChange={(event) => {
                      setImagePath(event.target.value);
                      if (!selectedImageFileName) {
                        setPreviewImagePath(event.target.value);
                      }
                    }}
                    className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">Photo Upload (Preview only)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-my-light-gray2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-800 hover:file:bg-gray-200"
                  />
                  <span className="text-xs text-gray-500">
                    {selectedImageFileName
                      ? `Selected: ${selectedImageFileName}`
                      : "Image upload is preview-only; save uses the Photo URL value."}
                  </span>
                </label>

                {previewImagePath ? (
                  <img
                    src={previewImagePath}
                    alt={title || "Box type preview"}
                    className="h-28 w-28 rounded-md border border-gray-200 object-cover"
                  />
                ) : null}

                <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <h2 className="text-sm font-semibold text-gray-900">Box Type Products and Prices</h2>
                  <p className="text-xs text-gray-500">Save updates all products and prices for this box type.</p>
                  {isLoadingProducts ? <p className="text-sm text-gray-600">Loading products...</p> : null}
                  {productsError ? <p className="text-sm text-red-600">{productsError}</p> : null}
                  {products.map((product, productIndex) => (
                    <div
                      key={`${product.id ?? "new"}-${productIndex}`}
                      className="rounded-xl border-2 border-gray-300 bg-gray-50/40 p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Product #{productIndex + 1}</h3>
                        <button
                          type="button"
                          onClick={() => removeProduct(productIndex)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove product
                        </button>
                      </div>

                      <div className="rounded-lg border border-blue-200 bg-white p-3 space-y-3">
                        <div className="border-b border-blue-100 pb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-blue-700">Product details</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          <input
                            type="text"
                            value={product.itemNo}
                            onChange={(event) =>
                              updateProduct(productIndex, (current) => ({ ...current, itemNo: event.target.value }))
                            }
                            placeholder="Item no"
                            className="h-10 rounded-md border border-gray-300 px-2 text-sm"
                          />
                          <input
                            type="text"
                            value={product.productName}
                            onChange={(event) =>
                              updateProduct(productIndex, (current) => ({ ...current, productName: event.target.value }))
                            }
                            placeholder="Product name"
                            className="h-10 rounded-md border border-gray-300 px-2 text-sm md:col-span-2"
                          />
                          <input
                            type="text"
                            value={product.qualityCardboard}
                            onChange={(event) =>
                              updateProduct(productIndex, (current) => ({ ...current, qualityCardboard: event.target.value }))
                            }
                            placeholder="Quality cardboard"
                            className="h-10 rounded-md border border-gray-300 px-2 text-sm md:col-span-3"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                          <div className="col-span-full -mb-1 mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Internal Dimensions (mm)
                          </div>
                          <NumberField
                            label="L"
                            value={product.internalDimensionsMM.l}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                internalDimensionsMM: { ...current.internalDimensionsMM, l: value },
                              }))
                            }
                          />
                          <NumberField
                            label="W"
                            value={product.internalDimensionsMM.w}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                internalDimensionsMM: { ...current.internalDimensionsMM, w: value },
                              }))
                            }
                          />
                          <NumberField
                            label="H"
                            value={product.internalDimensionsMM.h}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                internalDimensionsMM: { ...current.internalDimensionsMM, h: value },
                              }))
                            }
                          />
                          <NumberField
                            label="Weight gr"
                            value={product.weightPieceGr}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({ ...current, weightPieceGr: value }))
                            }
                          />
                          <NumberField
                            label="Weight kg"
                            value={product.weightPalletKg}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({ ...current, weightPalletKg: value }))
                            }
                          />
                          <div className="col-span-full -mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Pallet Sizes in cm
                          </div>
                          <NumberField
                            label="Pallet L"
                            value={product.palletDimensionsCM.l}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                palletDimensionsCM: { ...current.palletDimensionsCM, l: value },
                              }))
                            }
                          />
                          <NumberField
                            label="Pallet W"
                            value={product.palletDimensionsCM.w}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                palletDimensionsCM: { ...current.palletDimensionsCM, w: value },
                              }))
                            }
                          />
                          <NumberField
                            label="Pallet H"
                            value={product.palletDimensionsCM.h}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                palletDimensionsCM: { ...current.palletDimensionsCM, h: value },
                              }))
                            }
                          />
                          <NumberField
                            label="Pallet pcs"
                            value={product.palletPcs}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({ ...current, palletPcs: value }))
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-amber-200 bg-white overflow-hidden">
                        <div className="border-b border-amber-100 bg-amber-50 px-3 py-2">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-amber-700">Prices</h4>
                        </div>
                        <table className="min-w-full text-xs">
                          <thead className="bg-amber-50/60">
                            <tr>
                              <th className="px-2 py-1 text-left">Price name</th>
                              <th className="px-2 py-1 text-left">Without tax</th>
                              <th className="px-2 py-1 text-left">With tax</th>
                              <th className="px-2 py-1 text-left">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {product.prices.map((price, priceIndex) => (
                              <tr key={`${price.id ?? "new-price"}-${priceIndex}`} className="border-t border-gray-200">
                                <td className="px-2 py-1">
                                  <input
                                    type="text"
                                    value={price.name}
                                    onChange={(event) =>
                                      updatePrice(productIndex, priceIndex, (current) => ({
                                        ...current,
                                        name: event.target.value,
                                      }))
                                    }
                                    className="h-8 w-full rounded border border-gray-300 px-2"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={price.withoutTax}
                                    onChange={(event) =>
                                      updatePrice(productIndex, priceIndex, (current) => ({
                                        ...current,
                                        withoutTax: parseNumber(event.target.value),
                                      }))
                                    }
                                    className="h-8 w-full rounded border border-gray-300 px-2"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={price.withTax}
                                    onChange={(event) =>
                                      updatePrice(productIndex, priceIndex, (current) => ({
                                        ...current,
                                        withTax: parseNumber(event.target.value),
                                      }))
                                    }
                                    className="h-8 w-full rounded border border-gray-300 px-2"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <button
                                    type="button"
                                    onClick={() => removePrice(productIndex, priceIndex)}
                                    className="rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="p-2">
                          <button
                            type="button"
                            onClick={() => addPrice(productIndex)}
                            className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Add price
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addProduct}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Add product
                  </button>
                </div>

                {saveError ? <p className="text-red-600">{saveError}</p> : null}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <Link
                    href="/admin"
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function createEmptyProduct(): EditableProduct {
  return {
    itemNo: "",
    productName: "",
    internalDimensionsMM: { l: 0, w: 0, h: 0, h2: null },
    qualityCardboard: "",
    palletDimensionsCM: { l: 0, w: 0, h: 0 },
    weightPieceGr: 0,
    weightPalletKg: 0,
    amountQtyInPcs: 0,
    palletPcs: 0,
    prices: [createEmptyPrice()],
  };
}

function createEmptyPrice(): EditablePrice {
  return {
    name: "",
    withoutTax: 0,
    withTax: 0,
  };
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-gray-600">{label}</span>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(event) => onChange(parseNumber(event.target.value))}
        className="h-8 rounded border border-gray-300 px-2 text-xs"
      />
    </label>
  );
}
