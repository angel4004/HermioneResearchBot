import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SessionStore } from "../../src/storage/session-store.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "hermione-session-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("SessionStore", () => {
  it("returns an empty session state when the file does not exist", async () => {
    const store = new SessionStore(join(tempDir, "sessions.json"));

    await expect(store.getState()).resolves.toEqual({
      activeJob: null,
      lastCompletedJob: null
    });
  });

  it("persists active and completed job metadata", async () => {
    const store = new SessionStore(join(tempDir, "nested", "sessions.json"));

    await store.setActiveJob({
      jobId: "job-1",
      question: "question",
      status: "running",
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:01.000Z"
    });
    await store.setLastCompletedJob({
      jobId: "job-1",
      question: "question",
      status: "completed",
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:01:00.000Z",
      reportPath: "data/reports/report.md",
      unresolvedGaps: ["gap"],
      sources: [{ url: "https://example.com" }]
    });

    const reloaded = new SessionStore(join(tempDir, "nested", "sessions.json"));
    await expect(reloaded.getState()).resolves.toEqual({
      activeJob: null,
      lastCompletedJob: {
        jobId: "job-1",
        question: "question",
        status: "completed",
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:01:00.000Z",
        reportPath: "data/reports/report.md",
        unresolvedGaps: ["gap"],
        sources: [{ url: "https://example.com" }]
      }
    });
  });
});
