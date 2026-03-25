import { create } from "zustand";
import { products } from "../data/products";
import type { Product } from "../types/product";

type TableStoreType = {
  products: Product[];
  increment: (itemNo: string) => void;
  decrement: (itemNo: string) => void;
};
const incrementNumber = 20;
const useTableEComStore = create<TableStoreType>((set) => ({
  products: products,
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
