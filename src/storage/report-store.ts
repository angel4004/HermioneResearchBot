import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface SaveReportInput {
  jobId: string;
  question: string;
  markdown: string;
  completedAt: string;
}

export class ReportStore {
  constructor(private readonly reportDirectory: string) {}

  async saveReport(input: SaveReportInput): Promise<string> {
    await mkdir(this.reportDirectory, { recursive: true });
    const filename = `${input.completedAt.slice(0, 10)}-${slugify(input.question)}-${slugify(input.jobId)}.md`;
    const reportPath = join(this.reportDirectory, filename);
    const metadata = [
      "<!--",
      `hermione_job_id: ${input.jobId}`,
      `hermione_completed_at: ${input.completedAt}`,
      `hermione_question: ${input.question}`,
      "-->",
      ""
    ].join("\n");
    await writeFile(reportPath, `${metadata}${input.markdown.trim()}\n`, "utf8");
    return reportPath;
  }
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 60);
  return slug || "report";
}
