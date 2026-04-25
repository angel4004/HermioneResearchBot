import { describe, expect, it, vi } from "vitest";

import { JobManager } from "../../src/jobs/job-manager.js";
import type { ResearchBackend } from "../../src/research/backend.js";
import type { ResearchJobSnapshot } from "../../src/research/types.js";
import type { ReportStoreLike, SessionStoreLike } from "../../src/jobs/types.js";
import type { SessionState, StoredJob } from "../../src/storage/types.js";

class MemorySessionStore implements SessionStoreLike {
  state: SessionState = { activeJob: null, lastCompletedJob: null };

  async getState(): Promise<SessionState> {
    return this.state;
  }

  async setActiveJob(job: StoredJob): Promise<void> {
    this.state = { ...this.state, activeJob: job };
  }

  async clearActiveJob(): Promise<void> {
    this.state = { ...this.state, activeJob: null };
  }

  async setLastCompletedJob(job: StoredJob): Promise<void> {
    this.state = { activeJob: null, lastCompletedJob: job };
  }
}

function createManager(parts: {
  backend: ResearchBackend;
  sessionStore?: MemorySessionStore;
  reportStore?: ReportStoreLike;
  now?: () => Date;
  qualityGate?: {
    enabled: boolean;
    maxAutoContinuations: number;
  };
}): JobManager {
  return new JobManager({
    backend: parts.backend,
    sessionStore: parts.sessionStore ?? new MemorySessionStore(),
    reportStore:
      parts.reportStore ??
      ({
        saveReport: vi.fn(async () => "data/reports/job.md")
      } satisfies ReportStoreLike),
    timeoutMs: 60_000,
    pollIntervalMs: 1,
    maxParallelJobs: 1,
    qualityGate: parts.qualityGate,
    autoRun: false,
    now: parts.now ?? (() => new Date("2026-04-24T10:00:00.000Z")),
    sleep: async () => undefined
  });
}

describe("JobManager", () => {
  it("starts one active research job", async () => {
    const backend: ResearchBackend = {
      startResearch: vi.fn(async () => ({ id: "job-1" })),
      getResearchJob: vi.fn()
    };
    const sessionStore = new MemorySessionStore();
    const manager = createManager({ backend, sessionStore });

    await expect(manager.startResearch("question")).resolves.toEqual({
      jobId: "job-1",
      question: "question",
      status: "queued",
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:00.000Z"
    });
    await expect(manager.startResearch("second")).rejects.toThrow(/active research job/);
    expect(sessionStore.state.activeJob?.jobId).toBe("job-1");
  });

  it("stores Telegram chat metadata when starting a research job", async () => {
    const backend: ResearchBackend = {
      startResearch: vi.fn(async () => ({ id: "job-1" })),
      getResearchJob: vi.fn()
    };
    const sessionStore = new MemorySessionStore();
    const manager = createManager({ backend, sessionStore });

    await manager.startResearch("question", { telegramChatId: 12345 });

    expect(sessionStore.state.activeJob).toEqual(
      expect.objectContaining({
        jobId: "job-1",
        telegramChatId: 12345
      })
    );
  });

  it("saves report and moves completed job to lastCompletedJob", async () => {
    const completedSnapshot = {
      id: "job-1",
      status: "completed",
      reportMarkdown: "# Done",
      sources: [{ url: "https://example.com" }],
      unresolvedGaps: ["gap"]
    } satisfies ResearchJobSnapshot;
    const backend: ResearchBackend = {
      startResearch: vi.fn(),
      getResearchJob: vi.fn(async () => completedSnapshot)
    };
    const sessionStore = new MemorySessionStore();
    await sessionStore.setActiveJob({
      jobId: "job-1",
      question: "question",
      status: "running",
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:01.000Z"
    });
    const reportStore = {
      saveReport: vi.fn(async () => "data/reports/job-1.md")
    } satisfies ReportStoreLike;
    const manager = createManager({ backend, sessionStore, reportStore });

    await expect(manager.pollActiveJobOnce()).resolves.toEqual({
      kind: "completed",
      job: expect.objectContaining({
        jobId: "job-1",
        status: "completed",
        reportPath: "data/reports/job-1.md",
        unresolvedGaps: ["gap"],
        sources: [{ url: "https://example.com" }]
      }),
      reportMarkdown: "# Done",
      reportPath: "data/reports/job-1.md"
    });
    expect(sessionStore.state.activeJob).toBeNull();
    expect(sessionStore.state.lastCompletedJob?.status).toBe("completed");
  });

  it("post-processes completed report markdown into brief, sources, and gaps", async () => {
    const completedSnapshot = {
      id: "job-1",
      status: "completed",
      reportMarkdown: [
        "## Verdict",
        "Публичная связь подтверждается.",
        "",
        "## Evidence",
        "1. [Official page](https://example.com/about) confirms the profile.",
        "",
        "## Caveats",
        "- Registry history не была исчерпана полностью."
      ].join("\n")
    } satisfies ResearchJobSnapshot;
    const backend: ResearchBackend = {
      startResearch: vi.fn(),
      getResearchJob: vi.fn(async () => completedSnapshot)
    };
    const sessionStore = new MemorySessionStore();
    await sessionStore.setActiveJob({
      jobId: "job-1",
      question: "question",
      status: "running",
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:01.000Z"
    });
    const manager = createManager({ backend, sessionStore });

    await manager.pollActiveJobOnce();

    expect(sessionStore.state.lastCompletedJob).toEqual(
      expect.objectContaining({
        reportBrief: "Публичная связь подтверждается.",
        sources: [{ url: "https://example.com/about", title: "Official page" }],
        unresolvedGaps: ["Registry history не была исчерпана полностью."]
      })
    );
  });

  it("lists stored report history when the report store supports it", async () => {
    const backend: ResearchBackend = {
      startResearch: vi.fn(),
      getResearchJob: vi.fn()
    };
    const reportStore = {
      saveReport: vi.fn(async () => "data/reports/job.md"),
      listReports: vi.fn(async () => [
        {
          id: "job-1",
          jobId: "job-1",
          question: "question",
          reportPath: "data/reports/job-1.md",
          completedAt: "2026-04-24T10:00:00.000Z"
        }
      ])
    } satisfies ReportStoreLike;
    const manager = createManager({ backend, reportStore });

    await expect(manager.listReports(5)).resolves.toEqual([
      {
        id: "job-1",
        jobId: "job-1",
        question: "question",
        reportPath: "data/reports/job-1.md",
        completedAt: "2026-04-24T10:00:00.000Z"
      }
    ]);
    expect(reportStore.listReports).toHaveBeenCalledWith(5);
  });

  it("marks failed backend jobs as failed and clears active job", async () => {
    const failedSnapshot = {
      id: "job-1",
      status: "failed",
      errorMessage: "backend failed"
    } satisfies ResearchJobSnapshot;
    const backend: ResearchBackend = {
      startResearch: vi.fn(),
      getResearchJob: vi.fn(async () => failedSnapshot)
    };
    const sessionStore = new MemorySessionStore();
    await sessionStore.setActiveJob({
      jobId: "job-1",
      question: "question",
      status: "running",
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:01.000Z"
    });
    const manager = createManager({ backend, sessionStore });

    await expect(manager.pollActiveJobOnce()).resolves.toEqual({
      kind: "failed",
      job: expect.objectContaining({ status: "failed", errorMessage: "backend failed" })
    });
    expect(sessionStore.state.activeJob).toBeNull();
    expect(sessionStore.state.lastCompletedJob?.status).toBe("failed");
  });

  it("cancels active jobs locally and through backend when supported", async () => {
    const backend: ResearchBackend = {
      startResearch: vi.fn(),
      getResearchJob: vi.fn(),
      cancelResearchJob: vi.fn(async () => true)
    };
    const sessionStore = new MemorySessionStore();
    await sessionStore.setActiveJob({
      jobId: "job-1",
      question: "question",
      status: "running",
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:01.000Z"
    });
    const manager = createManager({ backend, sessionStore });

    await expect(manager.cancelActiveJob()).resolves.toEqual({
      cancelled: true,
      backendCancelled: true,
      jobId: "job-1"
    });
    expect(backend.cancelResearchJob).toHaveBeenCalledWith("job-1");
    expect(sessionStore.state.lastCompletedJob?.status).toBe("cancelled");
  });

  it("times out stale active jobs", async () => {
    const backend: ResearchBackend = {
      startResearch: vi.fn(),
      getResearchJob: vi.fn(),
      cancelResearchJob: vi.fn(async () => true)
    };
    const sessionStore = new MemorySessionStore();
    await sessionStore.setActiveJob({
      jobId: "job-1",
      question: "question",
      status: "running",
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:01.000Z"
    });
    const manager = createManager({
      backend,
      sessionStore,
      now: () => new Date("2026-04-24T10:02:00.000Z")
    });

    await expect(manager.pollActiveJobOnce()).resolves.toEqual({
      kind: "timeout",
      job: expect.objectContaining({ status: "failed", errorMessage: expect.stringContaining("timeout") })
    });
    expect(sessionStore.state.activeJob).toBeNull();
  });

  it("auto-continues incomplete reports instead of saving them as final", async () => {
    const incompleteSnapshot = {
      id: "job-1",
      status: "completed",
      reportMarkdown: [
        "## Verdict",
        "No direct ownership match was found.",
        "",
        "Если хочешь, я могу продолжить и проверить архивы, сотрудников и партнеров."
      ].join("\n")
    } satisfies ResearchJobSnapshot;
    const backend: ResearchBackend = {
      startResearch: vi.fn(async () => ({ id: "job-2" })),
      getResearchJob: vi.fn(async () => incompleteSnapshot)
    };
    const sessionStore = new MemorySessionStore();
    await sessionStore.setActiveJob({
      jobId: "job-1",
      question: "Find public links between Company A and Company B.",
      status: "running",
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:01.000Z",
      telegramChatId: 12345,
      continuationCount: 0
    });
    const reportStore = {
      saveReport: vi.fn(async () => "data/reports/job-1.md")
    } satisfies ReportStoreLike;
    const manager = createManager({
      backend,
      sessionStore,
      reportStore,
      qualityGate: {
        enabled: true,
        maxAutoContinuations: 1
      }
    });

    await expect(manager.pollActiveJobOnce()).resolves.toEqual({
      kind: "continued",
      previousJob: expect.objectContaining({
        jobId: "job-1",
        status: "completed",
        qualityGatePassed: false
      }),
      job: expect.objectContaining({
        jobId: "job-2",
        status: "queued",
        parentJobId: "job-1",
        continuationCount: 1,
        telegramChatId: 12345,
        qualityGateFindings: expect.arrayContaining([
          expect.objectContaining({ code: "premature_continuation_offer" })
        ])
      })
    });
    expect(reportStore.saveReport).not.toHaveBeenCalled();
    expect(backend.startResearch).toHaveBeenCalledWith({
      question: expect.stringContaining("Continue the same research task")
    });
    expect(sessionStore.state.activeJob?.jobId).toBe("job-2");
    expect(sessionStore.state.lastCompletedJob).toBeNull();
  });

  it("fails low-quality final attempts after the continuation budget instead of saving them as final", async () => {
    const badSnapshot = {
      id: "job-1",
      status: "completed",
      reportMarkdown: [
        "The requested **`searcharvester-deep-research`** skill is not present in the current toolset.",
        "I’m unable to run that workflow without the skill being installed or available."
      ].join("\n")
    } satisfies ResearchJobSnapshot;
    const backend: ResearchBackend = {
      startResearch: vi.fn(),
      getResearchJob: vi.fn(async () => badSnapshot)
    };
    const sessionStore = new MemorySessionStore();
    await sessionStore.setActiveJob({
      jobId: "job-1",
      question: "Find public links between Company A and Company B.",
      status: "running",
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:01.000Z",
      continuationCount: 1
    });
    const reportStore = {
      saveReport: vi.fn(async () => "data/reports/job-1.md")
    } satisfies ReportStoreLike;
    const manager = createManager({
      backend,
      sessionStore,
      reportStore,
      qualityGate: {
        enabled: true,
        maxAutoContinuations: 1
      }
    });

    await expect(manager.pollActiveJobOnce()).resolves.toEqual({
      kind: "failed",
      job: expect.objectContaining({
        jobId: "job-1",
        status: "failed",
        qualityGatePassed: false,
        errorMessage: expect.stringContaining("не отправляю черновик как финальный отчет"),
        qualityGateFindings: expect.arrayContaining([
          expect.objectContaining({ code: "backend_capability_missing" })
        ])
      })
    });
    expect(reportStore.saveReport).not.toHaveBeenCalled();
    expect(sessionStore.state.activeJob).toBeNull();
    expect(sessionStore.state.lastCompletedJob?.status).toBe("failed");
  });
});
