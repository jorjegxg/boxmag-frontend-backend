import { Router } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { mysqlPool } from "../db/mysql";
import { requireUser } from "../middleware/require-user";

type AddressRow = RowDataPacket & {
  id: number;
  label: string | null;
  company_name: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  address_line_1: string;
  address_line_2: string | null;
  postcode: string;
  city: string;
  country: string;
  is_default_billing: number;
  is_default_shipping: number;
};

type UserRow = RowDataPacket & {
  id: number;
};

type CreateAddressPayload = {
  email?: unknown;
  label?: unknown;
  companyName?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  postcode?: unknown;
  city?: unknown;
  country?: unknown;
  isDefaultBilling?: unknown;
  isDefaultShipping?: unknown;
};

type UpdateAddressPayload = {
  email?: unknown;
  label?: unknown;
  companyName?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  postcode?: unknown;
  city?: unknown;
  country?: unknown;
  isDefaultBilling?: unknown;
  isDefaultShipping?: unknown;
};

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toRequiredString(value: unknown): string | null {
  const normalized = toOptionalString(value);
  return normalized && normalized.length > 0 ? normalized : null;
}

export const addressesRouter = Router();

addressesRouter.get("/", requireUser, async (req, res) => {
  const email = req.userSession!.email;

  try {
    const [userRows] = await mysqlPool.execute<UserRow[]>(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email.toLowerCase()]
    );
    if (userRows.length === 0) {
      res.status(404).json({
        ok: false,
        message: "User not found",
      });
      return;
    }

    const userId = userRows[0]!.id;
    const [rows] = await mysqlPool.execute<AddressRow[]>(
      `SELECT id, label, company_name, first_name, last_name, phone, address_line_1, address_line_2, postcode, city, country,
              is_default_billing, is_default_shipping
       FROM addresses
       WHERE user_id = ?
       ORDER BY is_default_shipping DESC, is_default_billing DESC, created_at DESC, id DESC`,
      [userId]
    );

    res.json({
      ok: true,
      data: rows.map((row) => ({
        id: row.id,
        label: row.label ?? "",
        companyName: row.company_name ?? "",
        firstName: row.first_name,
        lastName: row.last_name,
        phone: row.phone ?? "",
        addressLine1: row.address_line_1,
        addressLine2: row.address_line_2 ?? "",
        postcode: row.postcode,
        city: row.city,
        country: row.country,
        isDefaultBilling: Boolean(row.is_default_billing),
        isDefaultShipping: Boolean(row.is_default_shipping),
      })),
    });
  } catch (error) {
    console.error("Failed to load addresses", error);
    res.status(500).json({
      ok: false,
      message: "Failed to load addresses",
    });
  }
});

addressesRouter.post("/", requireUser, async (req, res) => {
  const payload = (req.body ?? {}) as CreateAddressPayload;
  const email = req.userSession!.email;
  const firstName = toRequiredString(payload.firstName);
  const lastName = toRequiredString(payload.lastName);
  const addressLine1 = toRequiredString(payload.addressLine1);
  const postcode = toRequiredString(payload.postcode);
  const city = toRequiredString(payload.city);
  const country = toRequiredString(payload.country);

  if (!firstName || !lastName || !addressLine1 || !postcode || !city || !country) {
    res.status(400).json({
      ok: false,
      message: "Invalid address payload",
    });
    return;
  }

  const label = toOptionalString(payload.label);
  const companyName = toOptionalString(payload.companyName);
  const phone = toOptionalString(payload.phone);
  const addressLine2 = toOptionalString(payload.addressLine2);
  const isDefaultBilling = payload.isDefaultBilling === true;
  const isDefaultShipping = payload.isDefaultShipping === true;

  try {
    const [userRows] = await mysqlPool.execute<UserRow[]>(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    if (userRows.length === 0) {
      res.status(404).json({
        ok: false,
        message: "User not found",
      });
      return;
    }

    const userId = userRows[0]!.id;
    const [insertResult] = await mysqlPool.execute<ResultSetHeader>(
      `INSERT INTO addresses
        (user_id, label, company_name, first_name, last_name, phone, address_line_1, address_line_2, postcode, city, country, is_default_billing, is_default_shipping)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        label,
        companyName,
        firstName,
        lastName,
        phone,
        addressLine1,
        addressLine2,
        postcode,
        city,
        country,
        isDefaultBilling ? 1 : 0,
        isDefaultShipping ? 1 : 0,
      ]
    );

    res.status(201).json({
      ok: true,
      data: {
        id: insertResult.insertId,
      },
    });
  } catch (error) {
    console.error("Failed to create address", error);
    res.status(500).json({
      ok: false,
      message: "Failed to create address",
    });
  }
});

addressesRouter.put("/:addressId", requireUser, async (req, res) => {
  const addressId = Number(req.params.addressId);
  const payload = (req.body ?? {}) as UpdateAddressPayload;
  const email = req.userSession!.email;
  const firstName = toRequiredString(payload.firstName);
  const lastName = toRequiredString(payload.lastName);
  const addressLine1 = toRequiredString(payload.addressLine1);
  const postcode = toRequiredString(payload.postcode);
  const city = toRequiredString(payload.city);
  const country = toRequiredString(payload.country);

  if (
    !Number.isInteger(addressId) ||
    addressId <= 0 ||
    !firstName ||
    !lastName ||
    !addressLine1 ||
    !postcode ||
    !city ||
    !country
  ) {
    res.status(400).json({
      ok: false,
      message: "Invalid update address payload",
    });
    return;
  }

  const label = toOptionalString(payload.label);
  const companyName = toOptionalString(payload.companyName);
  const phone = toOptionalString(payload.phone);
  const addressLine2 = toOptionalString(payload.addressLine2);
  const isDefaultBilling = payload.isDefaultBilling === true;
  const isDefaultShipping = payload.isDefaultShipping === true;

  try {
    const [userRows] = await mysqlPool.execute<UserRow[]>(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    if (userRows.length === 0) {
      res.status(404).json({
        ok: false,
        message: "User not found",
      });
      return;
    }

    const userId = userRows[0]!.id;
    const [result] = await mysqlPool.execute<ResultSetHeader>(
      `UPDATE addresses
       SET label = ?, company_name = ?, first_name = ?, last_name = ?, phone = ?,
           address_line_1 = ?, address_line_2 = ?, postcode = ?, city = ?, country = ?,
           is_default_billing = ?, is_default_shipping = ?
       WHERE id = ? AND user_id = ?`,
      [
        label,
        companyName,
        firstName,
        lastName,
        phone,
        addressLine1,
        addressLine2,
        postcode,
        city,
        country,
        isDefaultBilling ? 1 : 0,
        isDefaultShipping ? 1 : 0,
        addressId,
        userId,
      ]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        ok: false,
        message: "Address not found",
      });
      return;
    }

    res.status(200).json({
      ok: true,
      data: {
        id: addressId,
      },
    });
  } catch (error) {
    console.error("Failed to update address", error);
    res.status(500).json({
      ok: false,
      message: "Failed to update address",
    });
  }
});

addressesRouter.delete("/:addressId", requireUser, async (req, res) => {
  const addressId = Number(req.params.addressId);
  const email = req.userSession!.email;

  if (!Number.isInteger(addressId) || addressId <= 0) {
    res.status(400).json({
      ok: false,
      message: "Invalid delete address payload",
    });
    return;
  }

  try {
    const [userRows] = await mysqlPool.execute<UserRow[]>(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    if (userRows.length === 0) {
      res.status(404).json({
        ok: false,
        message: "User not found",
      });
      return;
    }

    const userId = userRows[0]!.id;
    const [result] = await mysqlPool.execute<ResultSetHeader>(
      `DELETE FROM addresses WHERE id = ? AND user_id = ?`,
      [addressId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        ok: false,
        message: "Address not found",
      });
      return;
    }

    res.status(200).json({
      ok: true,
      data: {
        id: addressId,
      },
    });
  } catch (error) {
    console.error("Failed to delete address", error);
    res.status(500).json({
      ok: false,
      message: "Failed to delete address",
    });
  }
});
