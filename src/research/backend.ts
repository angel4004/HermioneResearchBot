import type { ResearchJobHandle, ResearchJobSnapshot, StartResearchInput } from "./types.js";

export interface ResearchBackend {
  startResearch(input: StartResearchInput): Promise<ResearchJobHandle>;
  getResearchJob(jobId: string): Promise<ResearchJobSnapshot>;
  cancelResearchJob?(jobId: string): Promise<boolean>;
}
