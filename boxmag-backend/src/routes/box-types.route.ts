import { Router } from "express";
import { RowDataPacket } from "mysql2";
import { mysqlPool } from "../db/mysql";

type BoxTypeRow = RowDataPacket & {
  id: number;
  key: string;
  title: string;
  image_path: string;
  is_active: number;
};

export const boxTypesRouter = Router();

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
