"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { B2b } from "../../../../global/components/b2b";
import { useAdminBoxTypesStore } from "../../../use-admin-box-types-store";
import { getBackendBaseUrl } from "../../../components/admin-types";
import { blockNegativeInput } from "../../../../utils/number-input";

type EditablePrice = {
  id?: number;
  name: string;
  withoutTax: number;
};

const FIXED_PRICE_NAMES = ["300", "500", "Pallet"] as const;

const PRICE_TIER_LABELS: Record<(typeof FIXED_PRICE_NAMES)[number], string> = {
  "300": "< 300 buc",
  "500": "< 500 buc",
  Pallet: "Palet",
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

type EditableImage = {
  id?: number;
  url: string;
  sortOrder: number;
  altText: string | null;
  isPrimary: boolean;
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

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

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
  const [images, setImages] = useState<EditableImage[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
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
    setImages(boxType.images);
    setIsActive(boxType.isActive);
    setSelectedImageFiles([]);
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
            : "Nu s-au putut încărca produsele tipului de cutie",
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
    if (!trimmedTitle || images.length === 0) {
      setSaveError("Numele și cel puțin o fotografie sunt obligatorii.");
      return;
    }
    const primaryCount = images.filter((image) => image.isPrimary).length;
    if (primaryCount !== 1) {
      setSaveError("Exact o imagine trebuie setată ca principală.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      let nextImages = [...images];
      if (selectedImageFiles.length > 0) {
        setIsUploadingImage(true);
        const formData = new FormData();
        for (const file of selectedImageFiles) {
          formData.append("images", file);
        }
        const uploadResponse = await fetch(
          `${backendBaseUrl}/api/box-types/upload-images`,
          {
            method: "POST",
            credentials: "include",
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
          throw new Error(uploadBody.message ?? "Încărcarea imaginii a eșuat");
        }
        const startingIndex = nextImages.length;
        const uploaded = uploadBody.data.images
          .map((image, index) => {
            const url = String(image.url ?? "").trim();
            if (!url) return null;
            return {
              url,
              sortOrder: startingIndex + index,
              altText: null,
              isPrimary: nextImages.length === 0 && index === 0,
            };
          })
          .filter((image): image is NonNullable<typeof image> => image != null);
        nextImages = [...nextImages, ...uploaded];
      }

      if (
        nextImages.length === 0 ||
        nextImages.filter((image) => image.isPrimary).length !== 1
      ) {
        throw new Error("Galeria trebuie să includă exact o imagine principală");
      }

      const response = await fetch(
        `${backendBaseUrl}/api/box-types/${boxType.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: trimmedTitle,
            images: nextImages,
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
          credentials: "include",
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
      setSelectedImageFiles([]);
      setImages(nextImages);
      if (redirectToAdmin) {
        router.push("/admin/box-types");
      }
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Nu s-a putut salva tipul de cutie",
      );
    } finally {
      setIsUploadingImage(false);
      setIsSaving(false);
    }
  }

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedImageFiles(Array.from(event.target.files ?? []));
  }

  function setPrimaryImage(index: number) {
    setImages((current) =>
      current.map((image, currentIndex) => ({
        ...image,
        isPrimary: currentIndex === index,
      })),
    );
  }

  function removeImage(index: number) {
    setImages((current) => {
      const next = current.filter((_, currentIndex) => currentIndex !== index);
      if (next.length > 0 && !next.some((image) => image.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next.map((image, currentIndex) => ({
        ...image,
        sortOrder: currentIndex,
      }));
    });
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
            Acasă
          </Link>{" "}
          <span className="mx-2">→</span>
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>{" "}
          <span className="mx-2">→</span>
          <Link href="/admin/box-types" className="hover:underline">
            Tipuri de cutii și prețuri
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">Editare tip cutie</span>
        </div>
      </section>

      <section className="w-full bg-white px-6 lg:px-20 py-8">
        <div className="max-w-4xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden">
          <div className="bg-my-red w-full px-6 py-4 text-my-white">
            <h1 className="text-lg font-bold">Editare tip cutie</h1>
          </div>

          <div className="p-6 lg:p-8 space-y-6">
            {!Number.isInteger(boxTypeId) || boxTypeId <= 0 ? (
              <p className="text-red-600">ID tip cutie invalid.</p>
            ) : null}
            {isLoadingBoxTypes ? (
              <p className="text-gray-600">Se încarcă tipul de cutie...</p>
            ) : null}
            {boxTypesError ? (
              <p className="text-red-600">Eroare la încărcare: {boxTypesError}</p>
            ) : null}
            {showNotFound ? (
              <p className="text-red-600">Tipul de cutie nu a fost găsit.</p>
            ) : null}

            {boxType ? (
              <>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving || isUploadingImage}
                    className="rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUploadingImage
                      ? "Se încarcă imaginea..."
                      : isSaving
                        ? "Se salvează..."
                        : "Salvează"}
                  </button>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">
                    Nume
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
                    <option value="active">Activ</option>
                    <option value="draft">Ciornă</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">
                    Încărcare fotografie
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageFileChange}
                    className="h-11 rounded-lg border border-gray-300 bg-white px-3 py-0 text-sm leading-10 text-gray-900 file:mr-4 file:my-1 file:h-8 file:rounded-md file:border-0 file:bg-my-light-gray2 file:px-3 file:py-0 file:text-sm file:font-medium file:leading-8 file:text-gray-800 hover:file:bg-gray-200"
                  />
                  <span className="text-xs text-gray-500">
                    {selectedImageFiles.length > 0
                      ? `${selectedImageFiles.length} fișier(e) selectat(e). Salvează pentru a încărca și adăuga în galerie.`
                      : "Alege unul sau mai multe fișiere pentru a le adăuga în galerie."}
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.map((image, index) => (
                    <div
                      key={`${image.id ?? "new"}-${index}`}
                      className="space-y-2"
                    >
                      <img
                        src={image.url}
                        alt={title || "Previzualizare tip cutie"}
                        className="h-24 w-full rounded-md border border-gray-200 object-cover"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPrimaryImage(index)}
                          className={`rounded border px-2 py-1 text-xs ${
                            image.isPrimary
                              ? "border-green-300 bg-green-50 text-green-700"
                              : "border-gray-300 text-gray-700"
                          }`}
                        >
                          {image.isPrimary ? "Principală" : "Setează principală"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                        >
                          Elimină
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Produse și prețuri tip cutie
                  </h2>
                  <p className="text-xs text-gray-500">
                    Salvarea actualizează toate produsele și prețurile pentru acest tip de cutie.
                  </p>
                  {isLoadingProducts ? (
                    <p className="text-sm text-gray-600">Se încarcă produsele...</p>
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
                          Produs #{productIndex + 1}
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
                            Elimină produs
                          </button>
                        </div>
                      </div>

                      <div className="rounded-lg border border-blue-200 bg-white p-3 space-y-3">
                        <div className="border-b border-blue-100 pb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-blue-700">
                            Detalii produs
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
                            placeholder="Cod articol"
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
                            placeholder="Nume produs"
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
                            placeholder="Calitate carton"
                            className="h-10 rounded-md border border-gray-300 px-2 text-sm md:col-span-3"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                          <div className="col-span-full -mb-1 mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Dimensiuni interne (mm)
                          </div>
                          <NumberField
                            label="L"
                            min={1}
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
                            min={1}
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
                            min={1}
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
                            label="Greutate bucată (gr)"
                            value={product.weightPieceGr}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                weightPieceGr: value,
                              }))
                            }
                          />
                          <NumberField
                            label="Greutate palet (kg)"
                            value={product.weightPalletKg}
                            onChange={(value) =>
                              updateProduct(productIndex, (current) => ({
                                ...current,
                                weightPalletKg: value,
                              }))
                            }
                          />
                          <div className="col-span-full -mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Dimensiuni palet (cm)
                          </div>
                          <NumberField
                            label="Palet L"
                            min={1}
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
                            label="Palet W"
                            min={1}
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
                            label="Palet H"
                            min={1}
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
                            label="Bucăți pe palet"
                            min={1}
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
                            Prețuri
                          </h4>
                        </div>
                        <table className="min-w-full text-xs">
                          <thead className="bg-amber-50/60">
                            <tr>
                              <th className="w-1 whitespace-nowrap px-2 py-1 text-left">
                                Nume preț
                              </th>
                              <th className="px-2 py-1 text-left">
                                Fără TVA (EUR)
                              </th>
                              <th className="px-2 py-1 text-left">{`Cu TVA (EUR, +${taxPercent}%)`}</th>
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
                                    {PRICE_TIER_LABELS[FIXED_PRICE_NAMES[priceIndex]]}
                                  </span>
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={price.withoutTax}
                                    onBeforeInput={blockNegativeInput}
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
                              ? "Se încarcă imaginea..."
                              : isSaving
                                ? "Se salvează..."
                                : "Salvează produs"}
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
                    Adaugă produs
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
                      ? "Se încarcă imaginea..."
                      : isSaving
                        ? "Se salvează..."
                        : "Salvează"}
                  </button>
                  <Link
                    href="/admin/box-types"
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Anulează
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
              Elimini produsul?
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              Ești sigur că vrei să elimini acest produs?
            </p>
            <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={dontShowRemoveProductConfirmAgain}
                onChange={(event) =>
                  setDontShowRemoveProductConfirmAgain(event.target.checked)
                }
              />
              <span>Nu mai afișa acest mesaj</span>
            </label>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelRemoveProduct}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={() => void confirmRemoveProduct()}
                disabled={isSaving}
                className="rounded-md bg-my-red px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Se salvează..." : "Elimină și salvează"}
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
    amountQtyInPcs: 100,
    palletPcs: 0,
    prices: normalizePrices([]),
  };
}

function normalizePrices(prices: EditablePrice[]): EditablePrice[] {
  const byName = new Map<string, EditablePrice>();
  for (const price of prices) {
    const compact = price.name.trim().toLowerCase().replace(/\s/g, "");
    const normalizedName =
      compact === "100" || compact === "<100" || compact === "under100"
        ? "300"
        : price.name.trim();
    if (!byName.has(normalizedName)) {
      byName.set(normalizedName, { ...price, name: normalizedName });
    }
  }

  return FIXED_PRICE_NAMES.map((name) => ({
    id: byName.get(name)?.id,
    name,
    withoutTax: Number(byName.get(name)?.withoutTax ?? 0),
  }));
}

function parseNumber(value: string, min = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, parsed) : min;
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-gray-600">{label}</span>
      <input
        type="number"
        step="0.01"
        min={min}
        value={value}
        onBeforeInput={blockNegativeInput}
        onChange={(event) => onChange(parseNumber(event.target.value, min))}
        className="h-8 rounded border border-gray-300 px-2 text-xs"
      />
    </label>
  );
}
