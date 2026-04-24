import type { ResearchJobStatus, ResearchSource } from "../research/types.js";
import type { QualityGateFinding } from "../research/quality-gate.js";

export interface StoredJob {
  jobId: string;
  question: string;
  status: ResearchJobStatus;
  createdAt: string;
  updatedAt: string;
  telegramChatId?: number | undefined;
  parentJobId?: string | undefined;
  continuationCount?: number | undefined;
  reportBrief?: string | undefined;
  reportPath?: string | undefined;
  unresolvedGaps?: string[] | undefined;
  sources?: ResearchSource[] | undefined;
  qualityGatePassed?: boolean | undefined;
  qualityGateFindings?: QualityGateFinding[] | undefined;
  errorMessage?: string | undefined;
}

export interface SessionState {
  activeJob: StoredJob | null;
  lastCompletedJob: StoredJob | null;
}
