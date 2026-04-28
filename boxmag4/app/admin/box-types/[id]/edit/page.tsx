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
};

const FIXED_PRICE_NAMES = ["<100", "<300", "<500", "Pallet"] as const;

type EditableProduct = {
  id?: number;
  boxTypeId?: number;
  itemNo: string;
  productName: string;
  internalDimensionsMM: {
    l: number;
    w: number;
    h: number;
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
  const isLoadingBoxTypes = useAdminBoxTypesStore(
    (state) => state.isLoadingBoxTypes,
  );
  const boxTypesError = useAdminBoxTypesStore((state) => state.boxTypesError);
  const setBackendBaseUrl = useAdminBoxTypesStore(
    (state) => state.setBackendBaseUrl,
  );
  const loadBoxTypes = useAdminBoxTypesStore((state) => state.loadBoxTypes);

  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  const taxPercent = useMemo(() => {
    const value = Number(process.env.NEXT_PUBLIC_TAX_PERCENT ?? "21");
    return Number.isFinite(value) ? value : 21;
  }, []);

  useEffect(() => {
    setBackendBaseUrl(backendBaseUrl);
    void loadBoxTypes();
  }, [backendBaseUrl, loadBoxTypes, setBackendBaseUrl]);

  const boxType = boxTypes.find((item) => item.id === boxTypeId);

  const [title, setTitle] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageFileName, setSelectedImageFileName] = useState<
    string | null
  >(null);
  const [previewImagePath, setPreviewImagePath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [products, setProducts] = useState<EditableProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [isRemoveProductConfirmOpen, setIsRemoveProductConfirmOpen] =
    useState(false);
  const [pendingRemoveProductIndex, setPendingRemoveProductIndex] = useState<
    number | null
  >(null);
  const [hideRemoveProductConfirm, setHideRemoveProductConfirm] =
    useState(false);
  const [
    dontShowRemoveProductConfirmAgain,
    setDontShowRemoveProductConfirmAgain,
  ] = useState(false);

  useEffect(() => {
    if (!boxType) return;
    setTitle(boxType.title);
    setImagePath(boxType.imagePath);
    setPreviewImagePath(boxType.imagePath);
    setIsActive(boxType.isActive);
    setSelectedImageFile(null);
    setSelectedImageFileName(null);
  }, [boxType]);

  useEffect(() => {
    if (!Number.isInteger(boxTypeId) || boxTypeId <= 0) return;
    let isCancelled = false;
    async function loadProducts() {
      setIsLoadingProducts(true);
      setProductsError(null);
      try {
        const response = await fetch(
          `${backendBaseUrl}/api/box-types/${boxTypeId}/products`,
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          data?: unknown;
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
        if (isCancelled) return;
        setProducts(
          (payload.data as EditableProduct[]).map((product) => ({
            ...product,
            prices: normalizePrices(product.prices),
          })),
        );
      } catch (error) {
        if (isCancelled) return;
        setProductsError(
          error instanceof Error
            ? error.message
            : "Failed to load box type products",
        );
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

  useEffect(() => {
    const storedPreference = window.localStorage.getItem(
      "boxmag_hide_remove_product_confirm",
    );
    setHideRemoveProductConfirm(storedPreference === "true");
  }, []);

  async function handleSave(options?: {
    redirectToAdmin?: boolean;
    productsOverride?: EditableProduct[];
  }) {
    if (!boxType) return;
    const redirectToAdmin = options?.redirectToAdmin ?? true;
    const productsToSave = (options?.productsOverride ?? products).map(
      (product) => ({
        ...product,
        prices: normalizePrices(product.prices),
      }),
    );

    const trimmedTitle = title.trim();
    let trimmedImagePath = imagePath.trim();

    if (!trimmedTitle || !trimmedImagePath) {
      setSaveError("Name and photo are required.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      if (selectedImageFile) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append("image", selectedImageFile);
        const uploadResponse = await fetch(
          `${backendBaseUrl}/api/box-types/upload-image`,
          {
            method: "POST",
            body: formData,
          },
        );
        const uploadBody = (await uploadResponse.json()) as {
          ok?: boolean;
          data?: { imagePath?: string };
          message?: string;
        };
        if (
          !uploadResponse.ok ||
          uploadBody.ok !== true ||
          !uploadBody.data?.imagePath
        ) {
          throw new Error(uploadBody.message ?? "Failed to upload image");
        }
        trimmedImagePath = uploadBody.data.imagePath.trim();
        setImagePath(trimmedImagePath);
      }

      const response = await fetch(
        `${backendBaseUrl}/api/box-types/${boxType.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: trimmedTitle,
            imagePath: trimmedImagePath,
            isActive,
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

      const productsResponse = await fetch(
        `${backendBaseUrl}/api/box-types/${boxType.id}/products`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            products: productsToSave,
          }),
        },
      );
      const productsPayload = (await productsResponse.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!productsResponse.ok || productsPayload.ok !== true) {
        throw new Error(
          productsPayload.message ??
            `Failed with status ${productsResponse.status}`,
        );
      }

      await loadBoxTypes();
      setSelectedImageFile(null);
      setSelectedImageFileName(null);
      if (redirectToAdmin) {
        router.push("/admin");
      }
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save box type",
      );
    } finally {
      setIsUploadingImage(false);
      setIsSaving(false);
    }
  }

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedImageFile(file);
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
    updater: (current: EditableProduct) => EditableProduct,
  ) {
    setProducts((current) =>
      current.map((product, index) =>
        index === productIndex ? updater(product) : product,
      ),
    );
  }

  function updatePrice(
    productIndex: number,
    priceIndex: number,
    updater: (current: EditablePrice) => EditablePrice,
  ) {
    updateProduct(productIndex, (product) => ({
      ...product,
      prices: product.prices.map((price, index) =>
        index === priceIndex ? updater(price) : price,
      ),
    }));
  }

  function addProduct() {
    setProducts((current) => [...current, createEmptyProduct()]);
  }

  function requestRemoveProduct(productIndex: number) {
    if (hideRemoveProductConfirm) {
      const nextProducts = products.filter(
        (_, index) => index !== productIndex,
      );
      setProducts(nextProducts);
      void handleSave({
        redirectToAdmin: false,
        productsOverride: nextProducts,
      });
      return;
    }

    setPendingRemoveProductIndex(productIndex);
    setDontShowRemoveProductConfirmAgain(false);
    setIsRemoveProductConfirmOpen(true);
  }

  async function confirmRemoveProduct() {
    if (pendingRemoveProductIndex === null) return;

    const nextProducts = products.filter(
      (_, index) => index !== pendingRemoveProductIndex,
    );
    setProducts(nextProducts);

    if (dontShowRemoveProductConfirmAgain) {
      window.localStorage.setItem("boxmag_hide_remove_product_confirm", "true");
      setHideRemoveProductConfirm(true);
    }

    setIsRemoveProductConfirmOpen(false);
    setPendingRemoveProductIndex(null);
    setDontShowRemoveProductConfirmAgain(false);

    await handleSave({
      redirectToAdmin: false,
      productsOverride: nextProducts,
    });
  }

  function cancelRemoveProduct() {
    setIsRemoveProductConfirmOpen(false);
    setPendingRemoveProductIndex(null);
    setDontShowRemoveProductConfirmAgain(false);
  }

  const showNotFound =
    !isLoadingBoxTypes &&
    !boxTypesError &&
    Number.isInteger(boxTypeId) &&
    !boxType;
  const taxMultiplier = 1 + taxPercent / 100;

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
            {isLoadingBoxTypes ? (
              <p className="text-gray-600">Loading box type...</p>
            ) : null}
            {boxTypesError ? (
              <p className="text-red-600">Failed to load: {boxTypesError}</p>
            ) : null}
            {showNotFound ? (
              <p className="text-red-600">Box type not found.</p>
            ) : null}

            {boxType ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">
                    Name
                  </span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">
                    Status
                  </span>
                  <select
                    value={isActive ? "active" : "draft"}
                    onChange={(event) =>
                      setIsActive(event.target.value === "active")
                    }
                    className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">
                    Photo Upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="h-11 rounded-lg border border-gray-300 bg-white px-3 py-0 text-sm leading-10 text-gray-900 file:mr-4 file:my-1 file:h-8 file:rounded-md file:border-0 file:bg-my-light-gray2 file:px-3 file:py-0 file:text-sm file:font-medium file:leading-8 file:text-gray-800 hover:file:bg-gray-200"
                  />
                  <span className="text-xs text-gray-500">
                    {selectedImageFileName
                      ? `Selected: ${selectedImageFileName}`
                      : "Choose a file to replace the current image on save."}
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
                  <h2 className="text-sm font-semibold text-gray-900">
                    Box Type Products and Prices
                  </h2>
                  <p className="text-xs text-gray-500">
                    Save updates all products and prices for this box type.
                  </p>
                  {isLoadingProducts ? (
                    <p className="text-sm text-gray-600">Loading products...</p>
                  ) : null}
                  {productsError ? (
                    <p className="text-sm text-red-600">{productsError}</p>
                  ) : null}
                  {products.map((product, productIndex) => (
                    <div
                      key={`${product.id ?? "new"}-${productIndex}`}
                      className="rounded-xl border-2 border-gray-300 bg-gray-50/40 p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Product #{productIndex + 1}
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void requestRemoveProduct(productIndex)
                            }
                            disabled={isSaving}
                            className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Remove product
                          </button>
                        </div>
                      </div>

                      <div className="rounded-lg border border-blue-200 bg-white p-3 space-y-3">
                        <div className="border-b border-blue-100 pb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-blue-700">
                            Product details
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          <input
                            type="text"
                            value={product.itemNo}
                            onChange={(event) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                itemNo: event.target.value,
                              }))
                            }
                            placeholder="Item no"
                            className="h-10 rounded-md border border-gray-300 px-2 text-sm"
                          />
                          <input
                            type="text"
                            value={product.productName}
                            onChange={(event) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                productName: event.target.value,
                              }))
                            }
                            placeholder="Product name"
                            className="h-10 rounded-md border border-gray-300 px-2 text-sm md:col-span-2"
                          />
                          <input
                            type="text"
                            value={product.qualityCardboard}
                            onChange={(event) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                qualityCardboard: event.target.value,
                              }))
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
                                internalDimensionsMM: {
                                  ...current.internalDimensionsMM,
                                  l: value,
                                },
                              }))
                            }
                          />
                          <NumberField
                            label="W"
                            value={product.internalDimensionsMM.w}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                internalDimensionsMM: {
                                  ...current.internalDimensionsMM,
                                  w: value,
                                },
                              }))
                            }
                          />
                          <NumberField
                            label="H"
                            value={product.internalDimensionsMM.h}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                internalDimensionsMM: {
                                  ...current.internalDimensionsMM,
                                  h: value,
                                },
                              }))
                            }
                          />
                          <NumberField
                            label="Weight Piece (gr)"
                            value={product.weightPieceGr}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                weightPieceGr: value,
                              }))
                            }
                          />
                          <NumberField
                            label="Weight Pallet (kg)"
                            value={product.weightPalletKg}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                weightPalletKg: value,
                              }))
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
                                palletDimensionsCM: {
                                  ...current.palletDimensionsCM,
                                  l: value,
                                },
                              }))
                            }
                          />
                          <NumberField
                            label="Pallet W"
                            value={product.palletDimensionsCM.w}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                palletDimensionsCM: {
                                  ...current.palletDimensionsCM,
                                  w: value,
                                },
                              }))
                            }
                          />
                          <NumberField
                            label="Pallet H"
                            value={product.palletDimensionsCM.h}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                palletDimensionsCM: {
                                  ...current.palletDimensionsCM,
                                  h: value,
                                },
                              }))
                            }
                          />
                          <NumberField
                            label="Pallet pcs"
                            value={product.palletPcs}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                palletPcs: value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-amber-200 bg-white overflow-hidden">
                        <div className="border-b border-amber-100 bg-amber-50 px-3 py-2">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-amber-700">
                            Prices
                          </h4>
                        </div>
                        <table className="min-w-full text-xs">
                          <thead className="bg-amber-50/60">
                            <tr>
                              <th className="w-1 whitespace-nowrap px-2 py-1 text-left">
                                Price name
                              </th>
                              <th className="px-2 py-1 text-left">
                                Without tax (EUR)
                              </th>
                              <th className="px-2 py-1 text-left">{`With tax (EUR, +${taxPercent}% VAT)`}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {product.prices.map((price, priceIndex) => (
                              <tr
                                key={`${price.id ?? "new-price"}-${priceIndex}`}
                                className="border-t border-gray-200"
                              >
                                <td className="w-1 whitespace-nowrap px-2 py-1">
                                  <span className="inline-flex h-8 items-center px-1 text-xs font-medium text-gray-700">
                                    {FIXED_PRICE_NAMES[priceIndex]}
                                  </span>
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={price.withoutTax}
                                    onChange={(event) =>
                                      updatePrice(
                                        productIndex,
                                        priceIndex,
                                        (current) => ({
                                          ...current,
                                          withoutTax: parseNumber(
                                            event.target.value,
                                          ),
                                        }),
                                      )
                                    }
                                    className="h-8 w-full rounded border border-gray-300 px-2"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <div className="h-8 w-full rounded border border-gray-200 bg-gray-50 px-2 text-sm leading-8 text-gray-700">
                                    {(price.withoutTax * taxMultiplier).toFixed(
                                      2,
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex items-center gap-2 p-2">
                          <button
                            type="button"
                            onClick={() =>
                              void handleSave({ redirectToAdmin: false })
                            }
                            disabled={isSaving || isUploadingImage}
                            className="ml-auto rounded-md bg-my-red px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isUploadingImage
                              ? "Uploading image..."
                              : isSaving
                                ? "Saving..."
                                : "Save product"}
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
                    disabled={isSaving || isUploadingImage}
                    className="rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUploadingImage
                      ? "Uploading image..."
                      : isSaving
                        ? "Saving..."
                        : "Save"}
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

      {isRemoveProductConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900">
              Remove product?
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              Are you sure you want to remove this product?
            </p>
            <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={dontShowRemoveProductConfirmAgain}
                onChange={(event) =>
                  setDontShowRemoveProductConfirmAgain(event.target.checked)
                }
              />
              <span>Don&apos;t show this again</span>
            </label>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelRemoveProduct}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRemoveProduct()}
                disabled={isSaving}
                className="rounded-md bg-my-red px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Remove and save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function createEmptyProduct(): EditableProduct {
  return {
    itemNo: "",
    productName: "",
    internalDimensionsMM: { l: 0, w: 0, h: 0 },
    qualityCardboard: "",
    palletDimensionsCM: { l: 0, w: 0, h: 0 },
    weightPieceGr: 0,
    weightPalletKg: 0,
    amountQtyInPcs: 0,
    palletPcs: 0,
    prices: normalizePrices([]),
  };
}

function normalizePrices(prices: EditablePrice[]): EditablePrice[] {
  return FIXED_PRICE_NAMES.map((name, index) => ({
    id: prices[index]?.id,
    name,
    withoutTax: Number(prices[index]?.withoutTax ?? 0),
  }));
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
