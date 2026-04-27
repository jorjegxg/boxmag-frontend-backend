import { Router } from "express";
import multer from "multer";
import { RowDataPacket } from "mysql2";
import { env } from "../config/env";
import { mysqlPool } from "../db/mysql";
import { uploadBoxImageToMinio } from "../services/minio";

type BoxTypeRow = RowDataPacket & {
  id: number;
  key: string;
  title: string;
  image_path: string;
  is_active: number;
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

boxTypesRouter.post("/upload-image", imageUpload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({
      ok: false,
      message: "Image file is required",
    });
    return;
  }

  try {
    const imagePath = await uploadBoxImageToMinio({
      fileBuffer: req.file.buffer,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
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

boxTypesRouter.get("/", async (_req, res) => {
  try {
    const [rows] = await mysqlPool.query<BoxTypeRow[]>(
      `SELECT id, \`key\`, title, image_path, is_active
       FROM box_types
       ORDER BY id ASC`
    );

    res.json({
      ok: true,
      data: rows.map((row) => ({
        id: row.id,
        key: row.key,
        title: row.title,
        imagePath: row.image_path,
        isActive: row.is_active === 1,
      })),
    });
  } catch (error) {
    console.error("Failed to load box types", error);
    res.status(500).json({
      ok: false,
      message: "Failed to load box types",
    });
  }
});

boxTypesRouter.post("/", async (req, res) => {
  const payload = req.body as {
    key?: unknown;
    title?: unknown;
    imagePath?: unknown;
    isActive?: unknown;
  };

  if (typeof payload.key !== "string" || payload.key.trim().length === 0) {
    res.status(400).json({
      ok: false,
      message: "Key is required",
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

  if (typeof payload.imagePath !== "string" || payload.imagePath.trim().length === 0) {
    res.status(400).json({
      ok: false,
      message: "Image path is required",
    });
    return;
  }

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

    await mysqlPool.execute(
      `INSERT INTO box_types (id, \`key\`, title, image_path, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        nextId,
        payload.key.trim(),
        payload.title.trim(),
        payload.imagePath.trim(),
        payload.isActive === false ? 0 : 1,
      ]
    );

    res.status(201).json({
      ok: true,
      data: {
        id: nextId,
        key: payload.key.trim(),
        title: payload.title.trim(),
        imagePath: payload.imagePath.trim(),
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
        amountQtyInPcs: row.amount_qty_in_pcs,
        palletPcs: row.pallet_pcs,
        prices: pricesByProductId.get(row.id) ?? [],
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

boxTypesRouter.put("/:id/products", async (req, res) => {
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
      typeof product.amountQtyInPcs !== "number" ||
      typeof product.palletPcs !== "number" ||
      typeof product.weightPieceGr !== "number" ||
      typeof product.weightPalletKg !== "number" ||
      typeof product.internalDimensionsMM?.l !== "number" ||
      typeof product.internalDimensionsMM?.w !== "number" ||
      typeof product.internalDimensionsMM?.h !== "number" ||
      typeof product.palletDimensionsCM?.l !== "number" ||
      typeof product.palletDimensionsCM?.w !== "number" ||
      typeof product.palletDimensionsCM?.h !== "number" ||
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
      if (typeof price.name !== "string" || typeof price.withoutTax !== "number") {
        res.status(400).json({
          ok: false,
          message: "Invalid price payload",
        });
        return;
      }
      normalizedPrices.push({
        name: price.name,
        withoutTax: price.withoutTax,
      });
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

boxTypesRouter.put("/:id", async (req, res) => {
  const boxTypeId = Number(req.params.id);
  const payload = req.body as {
    title?: unknown;
    imagePath?: unknown;
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

  if (typeof payload.imagePath !== "string" || payload.imagePath.trim().length === 0) {
    res.status(400).json({
      ok: false,
      message: "Image path is required",
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
    const [result] = await mysqlPool.execute(
      `UPDATE box_types
       SET title = ?, image_path = ?, is_active = ?
       WHERE id = ?`,
      [payload.title.trim(), payload.imagePath.trim(), payload.isActive ? 1 : 0, boxTypeId]
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
    });
  } catch (error) {
    console.error("Failed to update box type", error);
    res.status(500).json({
      ok: false,
      message: "Failed to update box type",
    });
  }
});
