export type CartLineItem = {
  itemNo: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl: string | null;
};

export function parseCartItemsJson(raw: string | null): CartLineItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const result: CartLineItem[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const candidate = entry as Record<string, unknown>;
      const itemNo = typeof candidate.itemNo === "string" ? candidate.itemNo : "";
      const name = typeof candidate.name === "string" ? candidate.name : "";
      const unitPrice = Number(candidate.unitPrice ?? 0);
      const quantity = Number(candidate.quantity ?? 0);
      const lineTotalRaw = candidate.lineTotal;
      const lineTotal =
        typeof lineTotalRaw === "number" && Number.isFinite(lineTotalRaw)
          ? lineTotalRaw
          : +(unitPrice * quantity).toFixed(2);
      const imageUrl =
        typeof candidate.imageUrl === "string" && candidate.imageUrl.length > 0
          ? candidate.imageUrl
          : null;
      if (!itemNo && !name) continue;
      result.push({
        itemNo,
        name,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        quantity: Number.isFinite(quantity) ? quantity : 0,
        lineTotal,
        imageUrl,
      });
    }
    return result.length > 0 ? result : null;
  } catch {
    return null;
  }
}
