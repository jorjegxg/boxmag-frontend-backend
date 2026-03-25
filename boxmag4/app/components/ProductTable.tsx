"use client";
import { FaShoppingCart } from "react-icons/fa";
import useTableEComStore from "../stores/table_e_commerce_store";
import { Product } from "../types/product";
import { useLanguage } from "../i18n/language-context";

export function ProductsTable() {
  const { t } = useLanguage();
  const products = useTableEComStore().products;
  const incrementProducts = useTableEComStore().increment;
  const decrementProducts = useTableEComStore().decrement;

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
            {product.prices.map((price, idx) => (
              <td key={idx} className="px-3 py-2 text-center whitespace-nowrap">
                <div className="">{price.withoutTax} €</div>
                <div className="font-semibold ">{price.withTax} €</div>
              </td>
            ))}

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
