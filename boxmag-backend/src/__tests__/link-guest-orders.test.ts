import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock("../db/mysql", () => ({
  mysqlPool: {
    execute: executeMock,
  },
}));

import { linkGuestOrdersToUser } from "../services/link-guest-orders";

describe("linkGuestOrdersToUser", () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it("returns 0 for invalid user id", async () => {
    const affected = await linkGuestOrdersToUser(0, "guest@example.com");
    expect(affected).toBe(0);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns 0 for empty email", async () => {
    const affected = await linkGuestOrdersToUser(42, "   ");
    expect(affected).toBe(0);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("links guest orders by normalized email", async () => {
    executeMock.mockResolvedValueOnce([{ affectedRows: 2 }]);

    const affected = await linkGuestOrdersToUser(42, " Guest@Example.com ");

    expect(affected).toBe(2);
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE orders o"),
      [42, "guest@example.com"],
    );
  });
});
