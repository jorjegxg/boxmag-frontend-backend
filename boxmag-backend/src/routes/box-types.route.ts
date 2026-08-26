import { Router } from "express";
import multer from "multer";
import { RowDataPacket } from "mysql2";
import { requireAdmin } from "../middleware/require-admin";
import { env } from "../config/env";
import { mysqlPool } from "../db/mysql";
import { optimizeUploadedBoxImage } from "../services/image-optimize";
import { uploadBoxImageToMinio } from "../services/minio";
import { MIN_ORDER_QTY } from "../constants/order";
import { isNumberAtLeast } from "../utils/numbers";
import {
  clampToMinOrderQty,
  filterShopPrices,
  isRemovedPriceTier,
} from "../constants/price-tiers";

type BoxTypeRow = RowDataPacket & {
  id: number;
  title: string;
  key: string;
  is_active: number;
  image_id: number | null;
  image_url: string | null;
  image_sort_order: number | null;
  image_alt_text: string | null;
  image_is_primary: number | null;
};

type BoxTypeImageInput = {
  url: string;
  sortOrder?: number;
  altText?: string | null;
  isPrimary?: boolean;
};

type NormalizedBoxTypeImage = {
  url: string;
  sortOrder: number;
  altText: string | null;
  isPrimary: boolean;
};

type BoxTypeProductRow = RowDataPacket & {
  id: number;
  box_type_id: number;
  item_no: string;
  product_name: string;
  internal_l_mm: number;
  internal_w_mm: number;
  internal_h_mm: number;
  quality_cardboard: string;
  pallet_l_cm: number;
  pallet_w_cm: number;
  pallet_h_cm: number;
  weight_piece_gr: string;
  weight_pallet_kg: string;
  amount_qty_in_pcs: number;
  pallet_pcs: number;
};

type BoxTypeProductPriceRow = RowDataPacket & {
  id: number;
  box_type_product_id: number;
  price_name: string;
  price_without_tax: string;
};
type BoxTypePrimaryImageRow = RowDataPacket & {
  url: string;
};

export const boxTypesRouter = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
      return;
    }
    callback(new Error("Only image uploads are allowed"));
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

function calculateWithTax(withoutTax: number): number {
  const taxMultiplier = 1 + env.taxPercent / 100;
  return Number((withoutTax * taxMultiplier).toFixed(2));
}

/** Slug for `/products/[key]` from admin title when client omits `key`. */
function slugifyBoxTypeKey(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return slug || `box-type-${Date.now()}`;
}

boxTypesRouter.post("/upload-image", requireAdmin, imageUpload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({
      ok: false,
      message: "Image file is required",
    });
    return;
  }

  try {
    const optimized = await optimizeUploadedBoxImage(
      req.file.buffer,
      req.file.mimetype,
    );
    const imagePath = await uploadBoxImageToMinio({
      fileBuffer: optimized.buffer,
      originalFileName: req.file.originalname,
      mimeType: optimized.mimeType,
      extensionOverride: optimized.extension,
    });

    res.status(201).json({
      ok: true,
      data: {
        imagePath,
        fileName: req.file.originalname,
      },
    });
  } catch (error) {
    console.error("Failed to upload image to MinIO", error);
    res.status(500).json({
      ok: false,
      message: "Failed to upload image",
    });
  }
});

boxTypesRouter.post("/upload-images", requireAdmin, imageUpload.array("images", 10), async (req, res) => {
  const files = Array.isArray(req.files) ? req.files : [];
  if (files.length === 0) {
    res.status(400).json({
      ok: false,
      message: "At least one image file is required",
    });
    return;
  }

  try {
    const uploadedImages = await Promise.all(
      files.map(async (file) => {
        const optimized = await optimizeUploadedBoxImage(
          file.buffer,
          file.mimetype,
        );
        const imagePath = await uploadBoxImageToMinio({
          fileBuffer: optimized.buffer,
          originalFileName: file.originalname,
          mimeType: optimized.mimeType,
          extensionOverride: optimized.extension,
        });
        return {
          url: imagePath,
          fileName: file.originalname,
        };
      })
    );

    res.status(201).json({
      ok: true,
      data: {
        images: uploadedImages,
      },
    });
  } catch (error) {
    console.error("Failed to upload images to MinIO", error);
    res.status(500).json({
      ok: false,
      message: "Failed to upload images",
    });
  }
});

function normalizeImages(images: unknown): NormalizedBoxTypeImage[] | null {
  if (!Array.isArray(images) || images.length === 0) {
    return null;
  }

  const normalized: NormalizedBoxTypeImage[] = [];
  for (let index = 0; index < images.length; index += 1) {
    const candidate = images[index] as BoxTypeImageInput;
    if (typeof candidate?.url !== "string" || candidate.url.trim().length === 0) {
      return null;
    }
    normalized.push({
      url: candidate.url.trim(),
      sortOrder:
        typeof candidate.sortOrder === "number" &&
        Number.isInteger(candidate.sortOrder) &&
        candidate.sortOrder >= 0
          ? candidate.sortOrder
          : index,
      altText:
        typeof candidate.altText === "string" && candidate.altText.trim().length > 0
          ? candidate.altText.trim()
          : null,
      isPrimary: candidate.isPrimary === true,
    });
  }

  const primaryCount = normalized.filter((image) => image.isPrimary).length;
  if (primaryCount !== 1) {
    return null;
  }

  return normalized;
}

boxTypesRouter.get("/", async (_req, res) => {
  try {
    const [rows] = await mysqlPool.query<BoxTypeRow[]>(
      `SELECT bt.id, bt.title, bt.\`key\`, bt.is_active,
              bti.id AS image_id, bti.url AS image_url, bti.sort_order AS image_sort_order,
              bti.alt_text AS image_alt_text, bti.is_primary AS image_is_primary
       FROM box_types bt
       LEFT JOIN box_type_images bti ON bti.box_type_id = bt.id
       ORDER BY bt.is_active DESC, bt.id ASC, bti.sort_order ASC, bti.id ASC`
    );

    const grouped = new Map<
      number,
      {
        id: number;
        title: string;
        key: string;
        isActive: boolean;
        images: Array<{
          id: number;
          url: string;
          sortOrder: number;
          altText: string | null;
          isPrimary: boolean;
        }>;
      }
    >();

    for (const row of rows) {
      if (!grouped.has(row.id)) {
        grouped.set(row.id, {
          id: row.id,
          title: row.title,
          key: row.key,
          isActive: row.is_active === 1,
          images: [],
        });
      }
      if (row.image_id != null && row.image_url != null) {
        grouped.get(row.id)?.images.push({
          id: row.image_id,
          url: row.image_url,
          sortOrder: row.image_sort_order ?? 0,
          altText: row.image_alt_text,
          isPrimary: row.image_is_primary === 1,
        });
      }
    }

    res.json({
      ok: true,
      data: Array.from(grouped.values()),
    });
  } catch (error) {
    console.error("Failed to load box types", error);
    res.status(500).json({
      ok: false,
      message: "Failed to load box types",
    });
  }
});

boxTypesRouter.post("/", requireAdmin, async (req, res) => {
  const payload = req.body as {
    title?: unknown;
    key?: unknown;
    images?: unknown;
    isActive?: unknown;
  };

  if (typeof payload.title !== "string" || payload.title.trim().length === 0) {
    res.status(400).json({
      ok: false,
      message: "Title is required",
    });
    return;
  }

  const normalizedImages = normalizeImages(payload.images);
  if (!normalizedImages) {
    res.status(400).json({
      ok: false,
      message: "images must be a non-empty array with exactly one primary image",
    });
    return;
  }

  const providedKey =
    typeof payload.key === "string" && payload.key.trim().length > 0
      ? payload.key.trim()
      : slugifyBoxTypeKey(payload.title.trim());

  if (payload.isActive != null && typeof payload.isActive !== "boolean") {
    res.status(400).json({
      ok: false,
      message: "isActive must be a boolean",
    });
    return;
  }

  try {
    const [maxIdRows] = await mysqlPool.query<Array<RowDataPacket & { maxId: number | null }>>(
      "SELECT MAX(id) AS maxId FROM box_types"
    );
    const nextId = (maxIdRows[0]?.maxId ?? 0) + 1;
    let boxTypeKey = providedKey;
    const [existingKeyRows] = await mysqlPool.query<Array<RowDataPacket & { id: number }>>(
      "SELECT id FROM box_types WHERE `key` = ? LIMIT 1",
      [boxTypeKey],
    );
    if (existingKeyRows.length > 0) {
      boxTypeKey = `${providedKey.slice(0, 90)}-${nextId}`;
    }

    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO box_types (id, title, \`key\`, is_active)
         VALUES (?, ?, ?, ?)`,
        [nextId, payload.title.trim(), boxTypeKey, payload.isActive === false ? 0 : 1]
      );
      for (const image of normalizedImages) {
        await connection.execute(
          `INSERT INTO box_type_images (box_type_id, url, sort_order, alt_text, is_primary)
           VALUES (?, ?, ?, ?, ?)`,
          [nextId, image.url, image.sortOrder, image.altText, image.isPrimary ? 1 : 0]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.status(201).json({
      ok: true,
      data: {
        id: nextId,
        title: payload.title.trim(),
        key: boxTypeKey,
        images: normalizedImages.map((image, index) => ({
          id: index + 1,
          url: image.url,
          sortOrder: image.sortOrder,
          altText: image.altText,
          isPrimary: image.isPrimary,
        })),
        isActive: payload.isActive === false ? false : true,
      },
    });
  } catch (error) {
    console.error("Failed to create box type", error);
    res.status(500).json({
      ok: false,
      message: "Failed to create box type",
    });
  }
});

boxTypesRouter.get("/:id/products", async (req, res) => {
  const boxTypeId = Number(req.params.id);
  if (!Number.isInteger(boxTypeId) || boxTypeId <= 0) {
    res.status(400).json({
      ok: false,
      message: "Invalid box type id",
    });
    return;
  }

  try {
    const [imageRows] = await mysqlPool.query<BoxTypePrimaryImageRow[]>(
      `SELECT url
       FROM box_type_images
       WHERE box_type_id = ?
       ORDER BY is_primary DESC, sort_order ASC, id ASC
       LIMIT 1`,
      [boxTypeId]
    );
    const primaryImageUrl = imageRows[0]?.url ?? null;

    const [productRows] = await mysqlPool.query<BoxTypeProductRow[]>(
      `SELECT id, box_type_id, item_no, product_name, internal_l_mm, internal_w_mm, internal_h_mm,
              quality_cardboard, pallet_l_cm, pallet_w_cm, pallet_h_cm, weight_piece_gr, weight_pallet_kg,
              amount_qty_in_pcs, pallet_pcs
       FROM box_type_products
       WHERE box_type_id = ?
       ORDER BY id ASC`,
      [boxTypeId]
    );

    const productIds = productRows.map((row) => row.id);
    const pricesByProductId = new Map<
      number,
      Array<{ id: number; name: string; withoutTax: number; withTax: number }>
    >();

    if (productIds.length > 0) {
      const [priceRows] = await mysqlPool.query<BoxTypeProductPriceRow[]>(
        `SELECT id, box_type_product_id, price_name, price_without_tax
         FROM box_type_product_prices
         WHERE box_type_product_id IN (?)
         ORDER BY id ASC`,
        [productIds]
      );

      for (const row of priceRows) {
        const existing = pricesByProductId.get(row.box_type_product_id);
        const mappedPrice = {
          id: row.id,
          name: row.price_name,
          withoutTax: Number(row.price_without_tax),
          withTax: calculateWithTax(Number(row.price_without_tax)),
        };
        if (existing) {
          existing.push(mappedPrice);
        } else {
          pricesByProductId.set(row.box_type_product_id, [mappedPrice]);
        }
      }
    }

    res.json({
      ok: true,
      data: productRows.map((row) => ({
        id: row.id,
        boxTypeId: row.box_type_id,
        itemNo: row.item_no,
        productName: row.product_name,
        internalDimensionsMM: {
          l: row.internal_l_mm,
          w: row.internal_w_mm,
          h: row.internal_h_mm,
        },
        qualityCardboard: row.quality_cardboard,
        palletDimensionsCM: {
          l: row.pallet_l_cm,
          w: row.pallet_w_cm,
          h: row.pallet_h_cm,
        },
        weightPieceGr: Number(row.weight_piece_gr),
        weightPalletKg: Number(row.weight_pallet_kg),
        amountQtyInPcs: clampToMinOrderQty(row.amount_qty_in_pcs),
        palletPcs: row.pallet_pcs,
        imageUrl: primaryImageUrl,
        prices: filterShopPrices(pricesByProductId.get(row.id) ?? []),
      })),
    });
  } catch (error) {
    console.error("Failed to load box type products", error);
    res.status(500).json({
      ok: false,
      message: "Failed to load box type products",
    });
  }
});

boxTypesRouter.put("/:id/products", requireAdmin, async (req, res) => {
  const boxTypeId = Number(req.params.id);
  const payload = req.body as {
    products?: Array<{
      itemNo?: unknown;
      productName?: unknown;
      internalDimensionsMM?: { l?: unknown; w?: unknown; h?: unknown };
      qualityCardboard?: unknown;
      palletDimensionsCM?: { l?: unknown; w?: unknown; h?: unknown };
      weightPieceGr?: unknown;
      weightPalletKg?: unknown;
      amountQtyInPcs?: unknown;
      palletPcs?: unknown;
      prices?: Array<{ name?: unknown; withoutTax?: unknown }>;
    }>;
  };

  if (!Number.isInteger(boxTypeId) || boxTypeId <= 0) {
    res.status(400).json({
      ok: false,
      message: "Invalid box type id",
    });
    return;
  }

  if (!Array.isArray(payload.products)) {
    res.status(400).json({
      ok: false,
      message: "products must be an array",
    });
    return;
  }

  const normalizedProducts: Array<{
    itemNo: string;
    productName: string;
    internalDimensionsMM: { l: number; w: number; h: number };
    qualityCardboard: string;
    palletDimensionsCM: { l: number; w: number; h: number };
    weightPieceGr: number;
    weightPalletKg: number;
    amountQtyInPcs: number;
    palletPcs: number;
    prices: Array<{ name: string; withoutTax: number }>;
  }> = [];

  for (const product of payload.products) {
    if (
      typeof product.itemNo !== "string" ||
      typeof product.productName !== "string" ||
      typeof product.qualityCardboard !== "string" ||
      !isNumberAtLeast(product.amountQtyInPcs, 1) ||
      !isNumberAtLeast(product.palletPcs, 1) ||
      !isNumberAtLeast(product.weightPieceGr, 0) ||
      !isNumberAtLeast(product.weightPalletKg, 0) ||
      !isNumberAtLeast(product.internalDimensionsMM?.l, 1) ||
      !isNumberAtLeast(product.internalDimensionsMM?.w, 1) ||
      !isNumberAtLeast(product.internalDimensionsMM?.h, 1) ||
      !isNumberAtLeast(product.palletDimensionsCM?.l, 1) ||
      !isNumberAtLeast(product.palletDimensionsCM?.w, 1) ||
      !isNumberAtLeast(product.palletDimensionsCM?.h, 1) ||
      !Array.isArray(product.prices)
    ) {
      res.status(400).json({
        ok: false,
        message: "Invalid product payload",
      });
      return;
    }

    const normalizedPrices: Array<{ name: string; withoutTax: number }> = [];
    for (const price of product.prices) {
      if (typeof price.name !== "string" || !isNumberAtLeast(price.withoutTax, 0)) {
        res.status(400).json({
          ok: false,
          message: "Invalid price payload",
        });
        return;
      }
      if (isRemovedPriceTier(price.name)) {
        continue;
      }
      normalizedPrices.push({
        name: price.name,
        withoutTax: price.withoutTax,
      });
    }

    if (product.amountQtyInPcs < MIN_ORDER_QTY) {
      res.status(400).json({
        ok: false,
        message: `Minimum order quantity is ${MIN_ORDER_QTY} pcs per product`,
      });
      return;
    }

    normalizedProducts.push({
      itemNo: product.itemNo,
      productName: product.productName,
      internalDimensionsMM: {
        l: product.internalDimensionsMM.l,
        w: product.internalDimensionsMM.w,
        h: product.internalDimensionsMM.h,
      },
      qualityCardboard: product.qualityCardboard,
      palletDimensionsCM: {
        l: product.palletDimensionsCM.l,
        w: product.palletDimensionsCM.w,
        h: product.palletDimensionsCM.h,
      },
      weightPieceGr: product.weightPieceGr,
      weightPalletKg: product.weightPalletKg,
      amountQtyInPcs: product.amountQtyInPcs,
      palletPcs: product.palletPcs,
      prices: normalizedPrices,
    });
  }

  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `DELETE p
       FROM box_type_product_prices p
       JOIN box_type_products btp ON btp.id = p.box_type_product_id
       WHERE btp.box_type_id = ?`,
      [boxTypeId]
    );

    await connection.execute(`DELETE FROM box_type_products WHERE box_type_id = ?`, [boxTypeId]);

    for (const product of normalizedProducts) {
      const [insertResult] = await connection.execute(
        `INSERT INTO box_type_products
          (box_type_id, item_no, product_name, internal_l_mm, internal_w_mm, internal_h_mm,
           quality_cardboard, pallet_l_cm, pallet_w_cm, pallet_h_cm, weight_piece_gr, weight_pallet_kg,
           amount_qty_in_pcs, pallet_pcs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          boxTypeId,
          product.itemNo,
          product.productName,
          product.internalDimensionsMM.l,
          product.internalDimensionsMM.w,
          product.internalDimensionsMM.h,
          product.qualityCardboard,
          product.palletDimensionsCM.l,
          product.palletDimensionsCM.w,
          product.palletDimensionsCM.h,
          product.weightPieceGr,
          product.weightPalletKg,
          product.amountQtyInPcs,
          product.palletPcs,
        ]
      );

      const insertedProductId = (insertResult as { insertId?: number }).insertId;
      if (!insertedProductId) {
        throw new Error("Failed to create product");
      }

      for (const price of product.prices) {
        await connection.execute(
          `INSERT INTO box_type_product_prices
            (box_type_product_id, price_name, price_without_tax)
           VALUES (?, ?, ?)`,
          [insertedProductId, price.name, price.withoutTax]
        );
      }
    }

    await connection.commit();
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    console.error("Failed to save box type products", error);
    res.status(500).json({
      ok: false,
      message: "Failed to save box type products",
    });
  } finally {
    connection.release();
  }
});

boxTypesRouter.put("/:id", requireAdmin, async (req, res) => {
  const boxTypeId = Number(req.params.id);
  const payload = req.body as {
    title?: unknown;
    key?: unknown;
    images?: unknown;
    isActive?: unknown;
  };

  if (!Number.isInteger(boxTypeId) || boxTypeId <= 0) {
    res.status(400).json({
      ok: false,
      message: "Invalid box type id",
    });
    return;
  }

  if (typeof payload.title !== "string" || payload.title.trim().length === 0) {
    res.status(400).json({
      ok: false,
      message: "Title is required",
    });
    return;
  }

  const normalizedImages = normalizeImages(payload.images);
  if (!normalizedImages) {
    res.status(400).json({
      ok: false,
      message: "images must be a non-empty array with exactly one primary image",
    });
    return;
  }

  if (payload.key != null && (typeof payload.key !== "string" || payload.key.trim().length === 0)) {
    res.status(400).json({
      ok: false,
      message: "key must be a non-empty string",
    });
    return;
  }

  if (typeof payload.isActive !== "boolean") {
    res.status(400).json({
      ok: false,
      message: "isActive must be a boolean",
    });
    return;
  }

  try {
    const normalizedKey =
      typeof payload.key === "string" && payload.key.trim().length > 0
        ? payload.key.trim()
        : null;

    const connection = await mysqlPool.getConnection();
    let result: unknown;
    try {
      await connection.beginTransaction();
      const [updateResult] = await connection.execute(
        `UPDATE box_types
         SET title = ?, \`key\` = COALESCE(?, \`key\`), is_active = ?
         WHERE id = ?`,
        [payload.title.trim(), normalizedKey, payload.isActive ? 1 : 0, boxTypeId]
      );
      result = updateResult;
      await connection.execute(`DELETE FROM box_type_images WHERE box_type_id = ?`, [boxTypeId]);
      for (const image of normalizedImages) {
        await connection.execute(
          `INSERT INTO box_type_images (box_type_id, url, sort_order, alt_text, is_primary)
           VALUES (?, ?, ?, ?, ?)`,
          [boxTypeId, image.url, image.sortOrder, image.altText, image.isPrimary ? 1 : 0]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const updateResult = result as { affectedRows?: number };
    if (!updateResult.affectedRows) {
      res.status(404).json({
        ok: false,
        message: "Box type not found",
      });
      return;
    }

    res.json({
      ok: true,
    });
  } catch (error) {
    console.error("Failed to update box type", error);
    res.status(500).json({
      ok: false,
      message: "Failed to update box type",
    });
  }
});

boxTypesRouter.delete("/:id", requireAdmin, async (req, res) => {
  const boxTypeId = Number(req.params.id);

  if (!Number.isInteger(boxTypeId) || boxTypeId <= 0) {
    res.status(400).json({
      ok: false,
      message: "Invalid box type id",
    });
    return;
  }

  try {
    const [result] = await mysqlPool.execute(
      `UPDATE box_types SET is_active = 0 WHERE id = ?`,
      [boxTypeId]
    );

    const updateResult = result as { affectedRows?: number };
    if (!updateResult.affectedRows) {
      res.status(404).json({
        ok: false,
        message: "Box type not found",
      });
      return;
    }

    res.json({
      ok: true,
      data: {
        id: boxTypeId,
        isActive: false,
      },
    });
  } catch (error) {
    console.error("Failed to deactivate box type", error);
    res.status(500).json({
      ok: false,
      message: "Failed to deactivate box type",
    });
  }
});

boxTypesRouter.post("/:id/activate", requireAdmin, async (req, res) => {
  const boxTypeId = Number(req.params.id);

  if (!Number.isInteger(boxTypeId) || boxTypeId <= 0) {
    res.status(400).json({
      ok: false,
      message: "Invalid box type id",
    });
    return;
  }

  try {
    const [result] = await mysqlPool.execute(
      `UPDATE box_types SET is_active = 1 WHERE id = ?`,
      [boxTypeId]
    );

    const updateResult = result as { affectedRows?: number };
    if (!updateResult.affectedRows) {
      res.status(404).json({
        ok: false,
        message: "Box type not found",
      });
      return;
    }

    res.json({
      ok: true,
      data: {
        id: boxTypeId,
        isActive: true,
      },
    });
  } catch (error) {
    console.error("Failed to activate box type", error);
    res.status(500).json({
      ok: false,
      message: "Failed to activate box type",
    });
  }
});
