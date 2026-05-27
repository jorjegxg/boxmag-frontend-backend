import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MIN_ORDER_QTY } from "../constants/order";

export type CartItem = {
  itemNo: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
};

type AddCartItemInput = Omit<CartItem, "quantity"> & {
  quantity?: number;
};

export type CartStoreType = {
  items: CartItem[];
  newCartItems: number;
  subtotal: number;
  totalItems: number;
  addProductToCart: (numberOfProducts: number) => void;
  addItem: (item: AddCartItemInput) => void;
  removeItem: (itemNo: string) => void;
  setQuantity: (itemNo: string, quantity: number) => void;
  clearCart: () => void;
};

function toCartQuantity(value: number | undefined, fallback = MIN_ORDER_QTY): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(MIN_ORDER_QTY, Math.floor(value as number));
}

function computeTotalItems(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

function computeSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export const useCartStore = create<CartStoreType>()(
  persist(
    (set) => ({
      items: [],
      newCartItems: 0,
      subtotal: 0,
      totalItems: 0,
      addProductToCart: (numberOfProducts: number) => {
        const increment = toCartQuantity(numberOfProducts, MIN_ORDER_QTY);
        set((state) => ({
          newCartItems: state.newCartItems + increment,
        }));
      },
      addItem: (item) => {
        const quantityToAdd = toCartQuantity(item.quantity, MIN_ORDER_QTY);
        set((state) => {
          const existing = state.items.find((entry) => entry.itemNo === item.itemNo);
          const nextItems = existing
            ? state.items.map((entry) =>
                entry.itemNo === item.itemNo
                  ? { ...entry, quantity: entry.quantity + quantityToAdd }
                  : entry,
              )
            : [
                ...state.items,
                {
                  itemNo: item.itemNo,
                  name: item.name,
                  unitPrice: item.unitPrice,
                  quantity: quantityToAdd,
                  imageUrl: item.imageUrl,
                },
              ];
          return {
            items: nextItems,
            newCartItems: state.newCartItems + quantityToAdd,
            totalItems: computeTotalItems(nextItems),
            subtotal: computeSubtotal(nextItems),
          };
        });
      },
      removeItem: (itemNo) => {
        set((state) => {
          const target = state.items.find((item) => item.itemNo === itemNo);
          const removedQty = target?.quantity ?? 0;
          const nextItems = state.items.filter((item) => item.itemNo !== itemNo);
          return {
            items: nextItems,
            newCartItems: Math.max(0, state.newCartItems - removedQty),
            totalItems: computeTotalItems(nextItems),
            subtotal: computeSubtotal(nextItems),
          };
        });
      },
      setQuantity: (itemNo, quantity) => {
        const normalizedQty = Math.max(0, Math.floor(quantity));
        const nextQty =
          normalizedQty === 0
            ? 0
            : normalizedQty < MIN_ORDER_QTY
              ? MIN_ORDER_QTY
              : normalizedQty;
        set((state) => {
          const existing = state.items.find((entry) => entry.itemNo === itemNo);
          if (!existing) return state;

          const nextItems =
            nextQty === 0
              ? state.items.filter((entry) => entry.itemNo !== itemNo)
              : state.items.map((entry) =>
                  entry.itemNo === itemNo ? { ...entry, quantity: nextQty } : entry,
                );

          const qtyDiff = nextQty - existing.quantity;
          return {
            items: nextItems,
            newCartItems: Math.max(0, state.newCartItems + qtyDiff),
            totalItems: computeTotalItems(nextItems),
            subtotal: computeSubtotal(nextItems),
          };
        });
      },
      clearCart: () => {
        set({
          items: [],
          newCartItems: 0,
          totalItems: 0,
          subtotal: 0,
        });
      },
    }),
    {
      name: "boxmag.cart",
    },
  ),
);
