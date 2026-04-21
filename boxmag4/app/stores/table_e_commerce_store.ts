import { create } from "zustand";
import type { Product } from "../types/product";

type TableStoreType = {
  products: Product[];
  isLoading: boolean;
  loadError: string | null;
  loadProducts: (args: { backendBaseUrl: string; boxTypeId: number }) => Promise<void>;
  increment: (itemNo: string) => void;
  decrement: (itemNo: string) => void;
};
const incrementNumber = 20;
const useTableEComStore = create<TableStoreType>((set) => ({
  products: [],
  isLoading: false,
  loadError: null,
  loadProducts: async ({ backendBaseUrl, boxTypeId }) => {
    set({ isLoading: true, loadError: null });
    try {
      const response = await fetch(`${backendBaseUrl}/api/box-types/${boxTypeId}/products`);
      const payload = (await response.json()) as { ok?: boolean; message?: string; data?: unknown };
      if (!response.ok || payload.ok !== true || !Array.isArray(payload.data)) {
        throw new Error(payload.message ?? `Failed with status ${response.status}`);
      }

      const mapped = (payload.data as Array<any>).map((row) => {
        const prices = Array.isArray(row.prices) ? row.prices : [];
        return {
          itemNo: String(row.itemNo ?? ""),
          name: String(row.productName ?? ""),
          internalDimensionsMM: {
            l: Number(row.internalDimensionsMM?.l ?? 0),
            w: Number(row.internalDimensionsMM?.w ?? 0),
            h: Number(row.internalDimensionsMM?.h ?? 0),
          },
          qualityCardboard: String(row.qualityCardboard ?? ""),
          palletDimensionsCM: {
            l: Number(row.palletDimensionsCM?.l ?? 0),
            w: Number(row.palletDimensionsCM?.w ?? 0),
            h: Number(row.palletDimensionsCM?.h ?? 0),
          },
          prices: prices.map((p: any) => ({
            name: String(p.name ?? ""),
            withoutTax: Number(p.withoutTax ?? 0),
            withTax: Number(p.withTax ?? 0),
          })),
          weightPieceGr: Number(row.weightPieceGr ?? 0),
          weightPalletKg: Number(row.weightPalletKg ?? 0),
          amountQtyInPcs: Number(row.amountQtyInPcs ?? 0),
          palletPcs: Number(row.palletPcs ?? 0),
        } satisfies Product;
      });

      set({ products: mapped, isLoading: false, loadError: null });
    } catch (error) {
      set({
        isLoading: false,
        loadError: error instanceof Error ? error.message : "Failed to load products",
      });
    }
  },
  increment: (itemNo: string) =>
    set((state) => ({
      products: state.products.map((el) =>
        el.itemNo == itemNo
          ? {
              ...el,
              amountQtyInPcs: el.amountQtyInPcs + incrementNumber,
            }
          : el
      ),
    })),
  decrement: (itemNo: string) =>
    set((state) => ({
      products: state.products.map((el) =>
        el.itemNo == itemNo
          ? {
              ...el,
              amountQtyInPcs:
                el.amountQtyInPcs - incrementNumber >= 0
                  ? el.amountQtyInPcs - incrementNumber
                  : 0,
            }
          : el
      ),
    })),
}));

export default useTableEComStore;
