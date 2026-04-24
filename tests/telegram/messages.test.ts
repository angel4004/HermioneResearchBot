import { describe, expect, it } from "vitest";

import { START_MESSAGE } from "../../src/telegram/messages.js";

describe("START_MESSAGE", () => {
  it("identifies the new HermioneResearchBot runtime", () => {
    expect(START_MESSAGE).toContain("HermioneResearchBot");
    expect(START_MESSAGE).toContain("/research <question>");
  });

  it("does not present Hermione as the old OpenClaw or coding-agent runtime", () => {
    expect(START_MESSAGE).not.toContain("OpenClaw");
    expect(START_MESSAGE).not.toContain("кодом");
    expect(START_MESSAGE).not.toContain("инфраструктурой");
  });
});
