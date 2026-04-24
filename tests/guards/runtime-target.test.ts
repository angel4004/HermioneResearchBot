import { describe, expect, it } from "vitest";

import {
  ReservedTargetError,
  validateRuntimeTarget
} from "../../src/guards/runtime-target.js";

describe("validateRuntimeTarget", () => {
  it("allows a dedicated Hermione target", () => {
    expect(() =>
      validateRuntimeTarget({
        cwd: "/opt/hermione-research-bot",
        envPath: "/opt/hermione-research-bot/.env",
        serviceName: "hermione-research-bot.service"
      })
    ).not.toThrow();
  });

  it("rejects the reserved Salamander/OpenClaw working directory", () => {
    expect(() =>
      validateRuntimeTarget({
        cwd: "/opt/openclaw-paf-auditor/"
      })
    ).toThrow(ReservedTargetError);
  });

  it("rejects the reserved Salamander/OpenClaw env path", () => {
    try {
      validateRuntimeTarget({
        cwd: "/opt/hermione-research-bot",
        envPath: "/opt/openclaw-paf-auditor/.env"
      });
      throw new Error("expected guard to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ReservedTargetError);
      expect((error as ReservedTargetError).violations).toEqual([
        {
          field: "envPath",
          reservedValue: "/opt/openclaw-paf-auditor/.env"
        }
      ]);
    }
  });

  it("rejects the reserved Salamander/OpenClaw service name", () => {
    expect(() =>
      validateRuntimeTarget({
        cwd: "/opt/hermione-research-bot",
        serviceName: "openclaw-paf-auditor.service"
      })
    ).toThrow(/openclaw-paf-auditor\.service/);
  });
});
