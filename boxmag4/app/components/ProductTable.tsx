"use client";
import { FaShoppingCart } from "react-icons/fa";
import useTableEComStore from "../stores/table_e_commerce_store";
import { Product } from "../types/product";
import { useLanguage } from "../i18n/language-context";
import { useEffect, useMemo } from "react";

export function ProductsTable() {
  const { t } = useLanguage();
  const products = useTableEComStore((s) => s.products);
  const isLoading = useTableEComStore((s) => s.isLoading);
  const loadError = useTableEComStore((s) => s.loadError);
  const loadProducts = useTableEComStore((s) => s.loadProducts);
  const incrementProducts = useTableEComStore((s) => s.increment);
  const decrementProducts = useTableEComStore((s) => s.decrement);

  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  useEffect(() => {
    void loadProducts({ backendBaseUrl, boxTypeId: 1 });
  }, [backendBaseUrl, loadProducts]);

  return (
    <div className="overflow-x-auto rounded-xl border border-my-light-gray">
      <table className="min-w-full text-sm">
        {Headers()}
        {TableBody()}
      </table>
    </div>
  );

  function TableBody() {
    return (
      <tbody className="divide-y text-center">
        {isLoading ? (
          <tr>
            <td className="px-3 py-6 text-gray-500 text-left" colSpan={16}>
              Loading products...
            </td>
          </tr>
        ) : null}
        {!isLoading && loadError ? (
          <tr>
            <td className="px-3 py-6 text-red-600 text-left" colSpan={16}>
              Failed to load products: {loadError}
            </td>
          </tr>
        ) : null}
        {products.map((product: Product) => (
          <tr key={product.itemNo} className="hover:bg-my-light-gray">
            <td className="px-3 py-2 font-medium">{product.itemNo}</td>
            <td className="px-3 py-2">{product.name}</td>
            <td className="px-3 py-2">{product.internalDimensionsMM.l}</td>
            <td className="px-3 py-2">{product.internalDimensionsMM.w}</td>
            <td className="px-3 py-2">
              {Array.isArray(product.internalDimensionsMM.h)
                ? product.internalDimensionsMM.h.join(" / ")
                : product.internalDimensionsMM.h}
            </td>
            <td className="px-3 py-2 ">{product.qualityCardboard}</td>
            <td className="px-3 py-2">{product.palletDimensionsCM.l}</td>
            <td className="px-3 py-2">{product.palletDimensionsCM.w}</td>
            <td className="px-3 py-2">{product.palletDimensionsCM.h}</td>
            <td className="px-3 py-2">
              {product.weightPieceGr} / {product.weightPalletKg}
            </td>

            {/* Price Without Tax */}
            {Array.from({ length: 4 }).map((_, idx) => {
              const price = product.prices[idx];
              return (
                <td key={idx} className="px-3 py-2 text-center whitespace-nowrap">
                  {price ? (
                    <>
                      <div className="">{price.withoutTax} €</div>
                      <div className="font-semibold ">{price.withTax} €</div>
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              );
            })}

            {/* Amount QTY in pcs */}
            <td className="px-3 py-2">
              <div className="flex white-space-nowrap items-center justify-center gap-2  ">
                <span className="flex flex-col gap-1 ">
                  <div>
                    <button
                      onClick={() => {
                        incrementProducts(product.itemNo);
                      }}
                      className="btn btn-"
                    >
                      ▲
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      decrementProducts(product.itemNo);
                    }}
                  >
                    ▼
                  </button>
                </span>

                <span>{product.amountQtyInPcs}</span>
                <span>
                  <button>
                    <FaShoppingCart />
                  </button>
                </span>
              </div>
            </td>

            {/* Pallet/pcs */}
            <td className="px-3 py-2 text-center ">
              <div className="bg-my-red rounded-md text-my-white py-1 px-2">
                +{product.palletPcs}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    );
  }

  function Headers() {
    return (
      <thead className=" bg-my-yellow">
        <tr>
          <th rowSpan={2} className="px-3 py-2 text-left">
            {t("productTable.itemNo")}
          </th>
          <th rowSpan={2} className="px-3 py-2 text-left">
            {t("productTable.name")}
          </th>
          <th colSpan={3} className="px-3 py-2 text-left">
            {t("productTable.internalDimensions")}
          </th>
          <th rowSpan={2} className="px-3 py-2 text-left">
            {t("productTable.qualityCardboard")}
          </th>
          <th colSpan={3} className="px-3 py-2 text-left">
            {t("productTable.palletSizes")}
          </th>
          <th rowSpan={2} className="px-3 py-2 text-left whitespace-nowrap">
            {t("productTable.weight")}
          </th>
          <th colSpan={4} className="px-3 py-2 text-center">
            {t("productTable.price")}
          </th>
          <th rowSpan={2} className="px-3 py-2 text-center">
            {t("productTable.qty")}
          </th>
          <th rowSpan={2} className="px-3 py-2 text-center">
            {t("productTable.palletPcs")}
          </th>
        </tr>
        <tr>
          <th>L</th>
          <th>W</th>
          <th>H</th>

          <th>L</th>
          <th>W</th>
          <th>H</th>
          <th rowSpan={1} className="px-3 py-2 text-center">
            &lt; 100 pcs
          </th>
          <th className="px-3 py-2 text-center">&lt; 300 pcs</th>
          <th className="px-3 py-2 text-center">&lt; 500 pcs</th>
          <th className="px-3 py-2 text-center">{t("productTable.palletPcs")}</th>
        </tr>
      </thead>
    );
  }
}
