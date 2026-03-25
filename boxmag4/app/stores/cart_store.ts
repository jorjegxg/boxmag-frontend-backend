//this store is for adding to the shopify cart products + showing the cart notification
import { create } from "zustand";

export type CartStoreType = {
  newCartItems: number;
  addProductToCart: (numberOfProducts: number) => void;
};

export const useCartStore = create<CartStoreType>((set, get) => ({
  newCartItems: 0,
  addProductToCart: (numberOfProducts: number) => {
    set((state) => ({
      newCartItems: get().newCartItems + 1,
    }));
  },
}));
