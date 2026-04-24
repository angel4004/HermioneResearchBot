export type ResearchJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface ResearchSource {
  url: string;
  title?: string | undefined;
}

export interface StartResearchInput {
  question: string;
}

export interface ResearchJobHandle {
  id: string;
}

export interface ResearchJobSnapshot {
  id: string;
  status: ResearchJobStatus;
  phase?: string | undefined;
  reportMarkdown?: string | undefined;
  errorMessage?: string | undefined;
  sources?: ResearchSource[] | undefined;
  unresolvedGaps?: string[] | undefined;
}
