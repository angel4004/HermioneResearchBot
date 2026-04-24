import { describe, expect, it } from "vitest";

import { isTelegramUserAllowed } from "../../src/telegram/auth.js";

describe("isTelegramUserAllowed", () => {
  it("allows configured Telegram users", () => {
    expect(isTelegramUserAllowed(42, new Set([42, 100]))).toBe(true);
  });

  it("rejects users outside the allowlist", () => {
    expect(isTelegramUserAllowed(41, new Set([42]))).toBe(false);
  });

  it("rejects messages without a Telegram user id", () => {
    expect(isTelegramUserAllowed(undefined, new Set([42]))).toBe(false);
  });
});
