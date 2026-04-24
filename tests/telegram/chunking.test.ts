import { describe, expect, it } from "vitest";

import { splitTelegramMessage } from "../../src/telegram/chunking.js";

describe("splitTelegramMessage", () => {
  it("returns one chunk when the message fits", () => {
    expect(splitTelegramMessage("short report", 50)).toEqual(["short report"]);
  });

  it("splits long text without exceeding the limit", () => {
    const text = ["alpha beta", "gamma delta", "epsilon zeta"].join("\n\n");
    const chunks = splitTelegramMessage(text, 20);

    expect(chunks.every((chunk) => chunk.length <= 20)).toBe(true);
    expect(chunks.join("")).toBe(text);
  });

  it("splits a single long paragraph", () => {
    const chunks = splitTelegramMessage("abcdefghijklmnopqrstuvwxyz", 10);

    expect(chunks).toEqual(["abcdefghij", "klmnopqrst", "uvwxyz"]);
  });
});
