import { describe, expect, it, vi } from "vitest";

import { resumeActiveJobDelivery } from "../../src/telegram/handlers.js";
import type { JobPollResult } from "../../src/jobs/types.js";
import type { StoredJob } from "../../src/storage/types.js";

describe("resumeActiveJobDelivery", () => {
  it("resumes delivery for an active job that has Telegram chat metadata", async () => {
    const sentMessages: Array<{ chatId: number; text: string }> = [];
    const pollResults: JobPollResult[] = [
      {
        kind: "completed",
        job: {
          jobId: "job-1",
          question: "question",
          status: "completed",
          createdAt: "2026-04-24T10:00:00.000Z",
          updatedAt: "2026-04-24T10:01:00.000Z",
          telegramChatId: 12345,
          reportPath: "data/reports/job-1.md"
        },
        reportMarkdown: "## Verdict\nDone.",
        reportPath: "data/reports/job-1.md"
      }
    ];
    const jobManager = {
      getStatus: vi.fn(async () =>
        ({
          jobId: "job-1",
          question: "question",
          status: "running",
          createdAt: "2026-04-24T10:00:00.000Z",
          updatedAt: "2026-04-24T10:00:30.000Z",
          telegramChatId: 12345
        }) satisfies StoredJob
      ),
      pollActiveJobOnce: vi.fn(async () => pollResults.shift() ?? ({ kind: "idle" } satisfies JobPollResult))
    };

    await resumeActiveJobDelivery({
      jobManager,
      sendMessage: async (chatId, text) => {
        sentMessages.push({ chatId, text });
      },
      chunkLimit: 3900,
      maxDirectReportChars: 12_000,
      pollIntervalMs: 1
    });

    expect(sentMessages).toEqual([
      {
        chatId: 12345,
        text: "Возобновляю доставку активной research-задачи после restart: job-1"
      },
      {
        chatId: 12345,
        text: "Research completed. Report saved: data/reports/job-1.md"
      },
      {
        chatId: 12345,
        text: "## Verdict\nDone."
      }
    ]);
  });

  it("does nothing when the active job has no Telegram chat metadata", async () => {
    const sendMessage = vi.fn();
    const jobManager = {
      getStatus: vi.fn(async () =>
        ({
          jobId: "job-1",
          question: "question",
          status: "running",
          createdAt: "2026-04-24T10:00:00.000Z",
          updatedAt: "2026-04-24T10:00:30.000Z"
        }) satisfies StoredJob
      ),
      pollActiveJobOnce: vi.fn()
    };

    await resumeActiveJobDelivery({
      jobManager,
      sendMessage,
      chunkLimit: 3900,
      maxDirectReportChars: 12_000,
      pollIntervalMs: 1
    });

    expect(sendMessage).not.toHaveBeenCalled();
    expect(jobManager.pollActiveJobOnce).not.toHaveBeenCalled();
  });
});
