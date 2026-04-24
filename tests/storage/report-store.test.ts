import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ReportStore } from "../../src/storage/report-store.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "hermione-reports-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("ReportStore", () => {
  it("stores final markdown reports indefinitely under the report directory", async () => {
    const store = new ReportStore(tempDir);

    const reportPath = await store.saveReport({
      jobId: "job-1",
      question: "Compare research backends",
      markdown: "# Final report\n\nEvidence first.",
      completedAt: "2026-04-24T10:00:00.000Z"
    });

    expect(reportPath.startsWith(tempDir)).toBe(true);
    expect(reportPath.endsWith(".md")).toBe(true);
    await expect(readFile(reportPath, "utf8")).resolves.toContain("# Final report");
  });

  it("indexes saved reports newest first", async () => {
    const store = new ReportStore(tempDir);

    const firstPath = await store.saveReport({
      jobId: "job-1",
      question: "First report",
      markdown: "# First",
      completedAt: "2026-04-24T10:00:00.000Z"
    });
    const secondPath = await store.saveReport({
      jobId: "job-2",
      question: "Second report",
      markdown: "# Second",
      completedAt: "2026-04-24T11:00:00.000Z"
    });

    await expect(store.listReports()).resolves.toEqual([
      {
        id: "job-2",
        jobId: "job-2",
        question: "Second report",
        reportPath: secondPath,
        completedAt: "2026-04-24T11:00:00.000Z"
      },
      {
        id: "job-1",
        jobId: "job-1",
        question: "First report",
        reportPath: firstPath,
        completedAt: "2026-04-24T10:00:00.000Z"
      }
    ]);
  });
});
