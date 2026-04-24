import type { ResearchBackend } from "../research/backend.js";
import { buildQualityContinuationQuestion, evaluateResearchReport } from "../research/quality-gate.js";
import { analyzeResearchReport } from "../research/report-analysis.js";
import type { ResearchSource } from "../research/types.js";
import type { ReportIndexEntry } from "../storage/report-store.js";
import type { StoredJob } from "../storage/types.js";
import type { CancelJobResult, JobManagerOptions, JobPollResult, StartResearchJobOptions } from "./types.js";

export class JobManager {
  private readonly backend: ResearchBackend;
  private readonly autoRun: boolean;
  private runningLoop: Promise<void> | null = null;

  constructor(private readonly options: JobManagerOptions) {
    this.backend = options.backend;
    this.autoRun = options.autoRun ?? true;
  }

  async startResearch(question: string, options: StartResearchJobOptions = {}): Promise<StoredJob> {
    const state = await this.options.sessionStore.getState();
    if (state.activeJob !== null && this.options.maxParallelJobs <= 1) {
      throw new Error("There is already an active research job");
    }

    const handle = await this.backend.startResearch({ question });
    const now = this.nowIso();
    const job: StoredJob = {
      jobId: handle.id,
      question,
      status: "queued",
      createdAt: now,
      updatedAt: now,
      ...optionalTelegramChatId(options.telegramChatId)
    };
    await this.options.sessionStore.setActiveJob(job);

    if (this.autoRun) {
      this.startBackgroundLoop();
    }

    return job;
  }

  async getStatus(): Promise<StoredJob | null> {
    return (await this.options.sessionStore.getState()).activeJob;
  }

  async getLastCompletedJob(): Promise<StoredJob | null> {
    return (await this.options.sessionStore.getState()).lastCompletedJob;
  }

  async listReports(limit?: number): Promise<ReportIndexEntry[]> {
    return this.options.reportStore.listReports?.(limit) ?? [];
  }

  async cancelActiveJob(): Promise<CancelJobResult> {
    const state = await this.options.sessionStore.getState();
    if (state.activeJob === null) {
      return { cancelled: false, backendCancelled: false };
    }

    const activeJob = state.activeJob;
    let backendCancelled = false;
    if (this.backend.cancelResearchJob) {
      backendCancelled = await this.backend.cancelResearchJob(activeJob.jobId);
    }

    const cancelledJob: StoredJob = {
      ...activeJob,
      status: "cancelled",
      updatedAt: this.nowIso()
    };
    await this.options.sessionStore.setLastCompletedJob(cancelledJob);
    return { cancelled: true, backendCancelled, jobId: activeJob.jobId };
  }

  async pollActiveJobOnce(): Promise<JobPollResult> {
    const state = await this.options.sessionStore.getState();
    const activeJob = state.activeJob;
    if (activeJob === null) {
      return { kind: "idle" };
    }

    if (this.isTimedOut(activeJob)) {
      if (this.backend.cancelResearchJob) {
        await this.backend.cancelResearchJob(activeJob.jobId);
      }
      const timedOutJob: StoredJob = {
        ...activeJob,
        status: "failed",
        updatedAt: this.nowIso(),
        errorMessage: `Research job timeout after ${this.options.timeoutMs}ms`
      };
      await this.options.sessionStore.setLastCompletedJob(timedOutJob);
      return { kind: "timeout", job: timedOutJob };
    }

    const snapshot = await this.backend.getResearchJob(activeJob.jobId);
    const updatedJob: StoredJob = {
      ...activeJob,
      status: snapshot.status,
      updatedAt: this.nowIso(),
      errorMessage: snapshot.errorMessage,
      sources: snapshot.sources,
      unresolvedGaps: snapshot.unresolvedGaps
    };

    if (snapshot.status === "completed") {
      if (!snapshot.reportMarkdown?.trim()) {
        const failedJob: StoredJob = {
          ...updatedJob,
          status: "failed",
          errorMessage: "Research backend completed without a final report"
        };
        await this.options.sessionStore.setLastCompletedJob(failedJob);
        return { kind: "failed", job: failedJob };
      }

      const reportAnalysis = analyzeResearchReport(snapshot.reportMarkdown);
      const qualityGateResult = this.options.qualityGate?.enabled
        ? evaluateResearchReport(snapshot.reportMarkdown)
        : { passed: true, findings: [] };
      const continuationCount = activeJob.continuationCount ?? 0;

      if (
        !qualityGateResult.passed &&
        continuationCount < (this.options.qualityGate?.maxAutoContinuations ?? 0)
      ) {
        const previousJob: StoredJob = {
          ...updatedJob,
          reportBrief: reportAnalysis.brief,
          sources: mergeSources(snapshot.sources, reportAnalysis.sources),
          unresolvedGaps: mergeStrings(snapshot.unresolvedGaps, reportAnalysis.unresolvedGaps),
          qualityGatePassed: false,
          qualityGateFindings: qualityGateResult.findings
        };
        const continuationQuestion = buildQualityContinuationQuestion({
          originalQuestion: activeJob.question,
          previousReportMarkdown: snapshot.reportMarkdown,
          findings: qualityGateResult.findings
        });
        const handle = await this.backend.startResearch({ question: continuationQuestion });
        const now = this.nowIso();
        const continuationJob: StoredJob = {
          jobId: handle.id,
          question: continuationQuestion,
          status: "queued",
          createdAt: now,
          updatedAt: now,
          parentJobId: activeJob.jobId,
          continuationCount: continuationCount + 1,
          ...optionalTelegramChatId(activeJob.telegramChatId),
          qualityGateFindings: qualityGateResult.findings
        };
        await this.options.sessionStore.setActiveJob(continuationJob);
        return {
          kind: "continued",
          previousJob,
          job: continuationJob
        };
      }

      const reportPath = await this.options.reportStore.saveReport({
        jobId: activeJob.jobId,
        question: activeJob.question,
        markdown: snapshot.reportMarkdown,
        completedAt: updatedJob.updatedAt
      });
      const completedJob: StoredJob = {
        ...updatedJob,
        reportPath,
        reportBrief: reportAnalysis.brief,
        sources: mergeSources(snapshot.sources, reportAnalysis.sources),
        unresolvedGaps: mergeStrings(snapshot.unresolvedGaps, reportAnalysis.unresolvedGaps),
        qualityGatePassed: qualityGateResult.passed,
        qualityGateFindings: qualityGateResult.findings
      };
      await this.options.sessionStore.setLastCompletedJob(completedJob);
      return {
        kind: "completed",
        job: completedJob,
        reportMarkdown: snapshot.reportMarkdown,
        reportPath
      };
    }

    if (snapshot.status === "failed") {
      await this.options.sessionStore.setLastCompletedJob(updatedJob);
      return { kind: "failed", job: updatedJob };
    }

    if (snapshot.status === "cancelled") {
      await this.options.sessionStore.setLastCompletedJob(updatedJob);
      return { kind: "cancelled", job: updatedJob };
    }

    await this.options.sessionStore.setActiveJob(updatedJob);
    return { kind: "running", job: updatedJob };
  }

  startBackgroundLoop(): void {
    if (this.runningLoop !== null) {
      return;
    }

    this.runningLoop = this.runLoop().finally(() => {
      this.runningLoop = null;
    });
  }

  private async runLoop(): Promise<void> {
    while (true) {
      const result = await this.pollActiveJobOnce();
      if (result.kind !== "running" && result.kind !== "continued") {
        return;
      }
      await this.sleep(this.options.pollIntervalMs);
    }
  }

  private isTimedOut(job: StoredJob): boolean {
    const nowMs = this.options.now?.().getTime() ?? Date.now();
    return nowMs - Date.parse(job.createdAt) > this.options.timeoutMs;
  }

  private nowIso(): string {
    return (this.options.now?.() ?? new Date()).toISOString();
  }

  private sleep(ms: number): Promise<void> {
    return this.options.sleep?.(ms) ?? new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function optionalTelegramChatId(telegramChatId: number | undefined): Partial<Pick<StoredJob, "telegramChatId">> {
  return typeof telegramChatId === "number" ? { telegramChatId } : {};
}

function mergeSources(
  primary: ResearchSource[] | undefined,
  fallback: ResearchSource[] | undefined
): ResearchSource[] | undefined {
  const byUrl = new Map<string, ResearchSource>();
  for (const source of [...(primary ?? []), ...(fallback ?? [])]) {
    if (!byUrl.has(source.url)) {
      byUrl.set(source.url, source);
    }
  }
  return byUrl.size > 0 ? [...byUrl.values()] : undefined;
}

function mergeStrings(primary: string[] | undefined, fallback: string[] | undefined): string[] | undefined {
  const values = [...(primary ?? []), ...(fallback ?? [])].filter((value) => value.trim().length > 0);
  const uniqueValues = [...new Set(values)];
  return uniqueValues.length > 0 ? uniqueValues : undefined;
}
