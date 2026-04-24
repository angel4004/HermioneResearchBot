import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("validate-deploy-target script", () => {
  it("prints a concise error for reserved Salamander/OpenClaw targets", async () => {
    await expect(
      execFileAsync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/validate-deploy-target.ts"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          HERMIONE_WORKING_DIRECTORY: "/opt/openclaw-paf-auditor",
          HERMIONE_ENV_PATH: "/opt/openclaw-paf-auditor/.env",
          HERMIONE_SERVICE_NAME: "openclaw-paf-auditor.service",
          TELEGRAM_BOT_TOKEN: "placeholder",
          ALLOWED_TELEGRAM_USER_IDS: "1",
          SEARCHARVESTER_URL: "http://127.0.0.1:8000"
        }
      })
    ).rejects.toMatchObject({
      stderr: expect.stringContaining("Hermione deploy target preflight failed")
    });
  });
});
