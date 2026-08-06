import { beforeEach, describe, expect, it } from "vitest";
import { MIN_ORDER_QTY } from "../../app/constants/order";
import { useCartStore } from "../../app/stores/cart_store";

/** INV-QTY-100 — cart clamps line quantity to min 100. */
describe("cart_store (INV-QTY-100)", () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({
      items: [],
      newCartItems: 0,
      subtotal: 0,
      totalItems: 0,
    });
  });

  it("clamps addItem quantity below min to MIN_ORDER_QTY", () => {
    useCartStore.getState().addItem({
      itemNo: "BOX-1",
      name: "Box",
      unitPrice: 1.5,
      quantity: 10,
    });

    const item = useCartStore.getState().items[0];
    expect(item?.quantity).toBe(MIN_ORDER_QTY);
    expect(useCartStore.getState().subtotal).toBe(1.5 * MIN_ORDER_QTY);
  });

  it("defaults missing quantity to MIN_ORDER_QTY", () => {
    useCartStore.getState().addItem({
      itemNo: "BOX-2",
      name: "Box 2",
      unitPrice: 2,
    });

    expect(useCartStore.getState().items[0]?.quantity).toBe(MIN_ORDER_QTY);
  });

  it("clamps setQuantity below min up to MIN_ORDER_QTY", () => {
    useCartStore.getState().addItem({
      itemNo: "BOX-3",
      name: "Box 3",
      unitPrice: 1,
      quantity: 200,
    });
    useCartStore.getState().setQuantity("BOX-3", 50);

    expect(useCartStore.getState().items[0]?.quantity).toBe(MIN_ORDER_QTY);
  });

  it("removes line when setQuantity is 0", () => {
    useCartStore.getState().addItem({
      itemNo: "BOX-4",
      name: "Box 4",
      unitPrice: 1,
      quantity: 100,
    });
    useCartStore.getState().setQuantity("BOX-4", 0);

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("clearCart resets totals", () => {
    useCartStore.getState().addItem({
      itemNo: "BOX-5",
      name: "Box 5",
      unitPrice: 3,
      quantity: 100,
    });
    useCartStore.getState().clearCart();

    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().subtotal).toBe(0);
    expect(useCartStore.getState().totalItems).toBe(0);
  });
});
