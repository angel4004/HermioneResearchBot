import type { ResearchJobStatus, ResearchSource } from "../research/types.js";

export interface StoredJob {
  jobId: string;
  question: string;
  status: ResearchJobStatus;
  createdAt: string;
  updatedAt: string;
  reportPath?: string | undefined;
  unresolvedGaps?: string[] | undefined;
  sources?: ResearchSource[] | undefined;
  errorMessage?: string | undefined;
}

export interface SessionState {
  activeJob: StoredJob | null;
  lastCompletedJob: StoredJob | null;
}
