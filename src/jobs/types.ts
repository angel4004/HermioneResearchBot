import type { ResearchJobSnapshot } from "../research/types.js";
import type { QualityGateFinding } from "../research/quality-gate.js";
import type { SessionState, StoredJob } from "../storage/types.js";
import type { ReportIndexEntry, SaveReportInput } from "../storage/report-store.js";

export interface SessionStoreLike {
  getState(): Promise<SessionState>;
  setActiveJob(job: StoredJob): Promise<void>;
  clearActiveJob(): Promise<void>;
  setLastCompletedJob(job: StoredJob): Promise<void>;
}

export interface ReportStoreLike {
  saveReport(input: SaveReportInput): Promise<string>;
  listReports?(limit?: number): Promise<ReportIndexEntry[]>;
}

export interface JobManagerOptions {
  backend: {
    startResearch(input: { question: string }): Promise<{ id: string }>;
    getResearchJob(jobId: string): Promise<ResearchJobSnapshot>;
    cancelResearchJob?(jobId: string): Promise<boolean>;
  };
  sessionStore: SessionStoreLike;
  reportStore: ReportStoreLike;
  timeoutMs: number;
  pollIntervalMs: number;
  maxParallelJobs: number;
  qualityGate?: QualityGateOptions | undefined;
  autoRun?: boolean | undefined;
  now?: (() => Date) | undefined;
  sleep?: ((ms: number) => Promise<void>) | undefined;
}

export interface StartResearchJobOptions {
  telegramChatId?: number | undefined;
}

export interface QualityGateOptions {
  enabled: boolean;
  maxAutoContinuations: number;
}

export type JobPollResult =
  | { kind: "idle" }
  | { kind: "running"; job: StoredJob }
  | { kind: "continued"; previousJob: StoredJob; job: StoredJob }
  | { kind: "completed"; job: StoredJob; reportMarkdown: string; reportPath: string }
  | { kind: "failed"; job: StoredJob }
  | { kind: "cancelled"; job: StoredJob }
  | { kind: "timeout"; job: StoredJob };

export interface QualityGateContinuationMetadata {
  qualityGatePassed: false;
  qualityGateFindings: QualityGateFinding[];
}

export interface CancelJobResult {
  cancelled: boolean;
  backendCancelled: boolean;
  jobId?: string | undefined;
}
