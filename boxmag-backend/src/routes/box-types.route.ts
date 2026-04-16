import { Router } from "express";
import { RowDataPacket } from "mysql2";
import { mysqlPool } from "../db/mysql";

type BoxTypeRow = RowDataPacket & {
  id: number;
  key: string;
  title: string;
  price_eur: string | number | null;
  image_path: string;
  is_active: number;
};

export const boxTypesRouter = Router();

boxTypesRouter.get("/", async (_req, res) => {
  try {
    const [rows] = await mysqlPool.query<BoxTypeRow[]>(
      `SELECT id, \`key\`, title, price_eur, image_path, is_active
       FROM box_types
       ORDER BY id ASC`
    );

    res.json({
      ok: true,
      data: rows.map((row) => ({
        id: row.id,
        key: row.key,
        title: row.title,
        priceEur: row.price_eur == null ? null : Number(row.price_eur),
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
