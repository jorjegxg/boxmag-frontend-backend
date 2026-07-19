import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE_NAME, createAdminSessionToken } from "../config/admin-auth";

const { queryMock, executeMock, getConnectionMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  executeMock: vi.fn(),
  getConnectionMock: vi.fn(),
}));

vi.mock("../db/mysql", () => ({
  mysqlPool: {
    query: queryMock,
    execute: executeMock,
    getConnection: getConnectionMock,
  },
}));

vi.mock("../services/image-optimize", () => ({
  optimizeUploadedBoxImage: vi.fn(async () => ({
    buffer: Buffer.from("optimized"),
    mimeType: "image/jpeg",
    extension: ".jpg",
  })),
}));

vi.mock("../services/minio", () => ({
  uploadBoxImageToMinio: vi.fn(async () => "http://localhost:9000/bucket/boxes/test.jpg"),
}));

import { app } from "../app";

const ADMIN_PASSWORD = "test-admin-password";

function adminCookie(): string {
  return `${ADMIN_COOKIE_NAME}=${createAdminSessionToken(ADMIN_PASSWORD)}`;
}

function fakeConnection(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    beginTransaction: vi.fn(async () => undefined),
    execute: vi.fn(async () => [{ insertId: 1, affectedRows: 1 }]),
    commit: vi.fn(async () => undefined),
    rollback: vi.fn(async () => undefined),
    release: vi.fn(),
    ...overrides,
  };
}

const validImages = [
  { url: "http://localhost:9000/bucket/boxes/a.jpg", isPrimary: true },
];

describe("box types routes", () => {
  beforeEach(() => {
    queryMock.mockReset();
    executeMock.mockReset();
    getConnectionMock.mockReset();
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  });

  it("lists box types grouped with their images", async () => {
    queryMock.mockResolvedValueOnce([
      [
        {
          id: 1,
          title: "Standard Box",
          key: "standard-box",
          is_active: 1,
          image_id: 10,
          image_url: "http://localhost:9000/bucket/boxes/a.jpg",
          image_sort_order: 0,
          image_alt_text: null,
          image_is_primary: 1,
        },
      ],
    ]);

    const response = await request(app).get("/api/box-types");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual([
      {
        id: 1,
        title: "Standard Box",
        key: "standard-box",
        isActive: true,
        images: [
          {
            id: 10,
            url: "http://localhost:9000/bucket/boxes/a.jpg",
            sortOrder: 0,
            altText: null,
            isPrimary: true,
          },
        ],
      },
    ]);
  });

  it("blocks creating a box type without admin auth", async () => {
    const response = await request(app)
      .post("/api/box-types")
      .send({ title: "New Box", images: validImages });

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });

  it("returns 400 when creating a box type without images", async () => {
    const response = await request(app)
      .post("/api/box-types")
      .set("Cookie", adminCookie())
      .send({ title: "New Box", images: [] });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("images must be a non-empty array");
  });

  it("returns 400 when creating a box type with more than one primary image", async () => {
    const response = await request(app)
      .post("/api/box-types")
      .set("Cookie", adminCookie())
      .send({
        title: "New Box",
        images: [
          { url: "http://a", isPrimary: true },
          { url: "http://b", isPrimary: true },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
  });

  it("creates a box type with a generated key when admin authenticated", async () => {
    queryMock
      .mockResolvedValueOnce([[{ maxId: 5 }]])
      .mockResolvedValueOnce([[]]);
    const connection = fakeConnection();
    getConnectionMock.mockResolvedValueOnce(connection);

    const response = await request(app)
      .post("/api/box-types")
      .set("Cookie", adminCookie())
      .send({ title: "New Box Type", images: validImages });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.id).toBe(6);
    expect(response.body.data.key).toBe("new-box-type");
    expect(connection.commit).toHaveBeenCalled();
  });

  it("rolls back the transaction when box type creation fails", async () => {
    queryMock
      .mockResolvedValueOnce([[{ maxId: 5 }]])
      .mockResolvedValueOnce([[]]);
    const connection = fakeConnection({
      execute: vi.fn(async () => {
        throw new Error("insert failed");
      }),
    });
    getConnectionMock.mockResolvedValueOnce(connection);

    const response = await request(app)
      .post("/api/box-types")
      .set("Cookie", adminCookie())
      .send({ title: "New Box Type", images: validImages });

    expect(response.status).toBe(500);
    expect(response.body.ok).toBe(false);
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });

  it("returns 400 for an invalid box type id when listing products", async () => {
    const response = await request(app).get("/api/box-types/not-a-number/products");

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
  });

  it("lists products with prices and primary image for a box type", async () => {
    queryMock
      .mockResolvedValueOnce([[{ url: "http://localhost:9000/bucket/boxes/a.jpg" }]])
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            box_type_id: 1,
            item_no: "SB-001",
            product_name: "Small Box",
            internal_l_mm: 100,
            internal_w_mm: 100,
            internal_h_mm: 100,
            quality_cardboard: "B",
            pallet_l_cm: 80,
            pallet_w_cm: 60,
            pallet_h_cm: 100,
            weight_piece_gr: "50",
            weight_pallet_kg: "20",
            amount_qty_in_pcs: 100,
            pallet_pcs: 200,
          },
        ],
      ])
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            box_type_product_id: 1,
            price_name: "300",
            price_without_tax: "10.00",
          },
        ],
      ]);

    const response = await request(app).get("/api/box-types/1/products");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: 1,
      itemNo: "SB-001",
      imageUrl: "http://localhost:9000/bucket/boxes/a.jpg",
    });
    expect(response.body.data[0].prices[0]).toMatchObject({
      name: "300",
      withoutTax: 10,
    });
  });

  it("blocks replacing box type products without admin auth", async () => {
    const response = await request(app)
      .put("/api/box-types/1/products")
      .send({ products: [] });

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });

  it("returns 400 when replacing products with a non-array payload", async () => {
    const response = await request(app)
      .put("/api/box-types/1/products")
      .set("Cookie", adminCookie())
      .send({ products: "not-an-array" });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("products must be an array");
  });

  it("returns 400 when a product quantity is below the minimum order quantity", async () => {
    const connection = fakeConnection();
    getConnectionMock.mockResolvedValueOnce(connection);

    const response = await request(app)
      .put("/api/box-types/1/products")
      .set("Cookie", adminCookie())
      .send({
        products: [
          {
            itemNo: "SB-001",
            productName: "Small Box",
            internalDimensionsMM: { l: 100, w: 100, h: 100 },
            qualityCardboard: "B",
            palletDimensionsCM: { l: 80, w: 60, h: 100 },
            weightPieceGr: 50,
            weightPalletKg: 20,
            amountQtyInPcs: 1,
            palletPcs: 200,
            prices: [],
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Minimum order quantity");
  });

  it("replaces box type products with admin auth", async () => {
    const connection = fakeConnection();
    getConnectionMock.mockResolvedValueOnce(connection);

    const response = await request(app)
      .put("/api/box-types/1/products")
      .set("Cookie", adminCookie())
      .send({
        products: [
          {
            itemNo: "SB-001",
            productName: "Small Box",
            internalDimensionsMM: { l: 100, w: 100, h: 100 },
            qualityCardboard: "B",
            palletDimensionsCM: { l: 80, w: 60, h: 100 },
            weightPieceGr: 50,
            weightPalletKg: 20,
            amountQtyInPcs: 100,
            palletPcs: 200,
            prices: [{ name: "300", withoutTax: 10 }],
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(connection.commit).toHaveBeenCalled();
  });

  it("returns 404 when updating a box type that does not exist", async () => {
    const connection = fakeConnection({
      execute: vi.fn(async () => [{ affectedRows: 0 }]),
    });
    getConnectionMock.mockResolvedValueOnce(connection);

    const response = await request(app)
      .put("/api/box-types/99")
      .set("Cookie", adminCookie())
      .send({ title: "Updated", images: validImages, isActive: true });

    expect(response.status).toBe(404);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Box type not found");
  });

  it("blocks deactivating a box type without admin auth", async () => {
    const response = await request(app).delete("/api/box-types/1");

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });

  it("deactivates a box type with admin auth", async () => {
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .delete("/api/box-types/1")
      .set("Cookie", adminCookie());

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual({ id: 1, isActive: false });
  });

  it("activates a box type with admin auth", async () => {
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .post("/api/box-types/1/activate")
      .set("Cookie", adminCookie());

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual({ id: 1, isActive: true });
  });

  it("blocks image upload without admin auth", async () => {
    const response = await request(app)
      .post("/api/box-types/upload-image")
      .attach("image", Buffer.from("fake-image-bytes"), "test.jpg");

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
  });

  it("returns 400 when uploading without an image file", async () => {
    const response = await request(app)
      .post("/api/box-types/upload-image")
      .set("Cookie", adminCookie());

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Image file is required");
  });

  it("uploads an image and returns its path when admin authenticated", async () => {
    const response = await request(app)
      .post("/api/box-types/upload-image")
      .set("Cookie", adminCookie())
      .attach("image", Buffer.from("fake-image-bytes"), {
        filename: "test.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.imagePath).toBe("http://localhost:9000/bucket/boxes/test.jpg");
    expect(response.body.data.fileName).toBe("test.jpg");
  });
});
