import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface ReportIndexEntry {
  id: string;
  jobId: string;
  question: string;
  reportPath: string;
  completedAt: string;
}

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
    await this.upsertIndexEntry({
      id: input.jobId,
      jobId: input.jobId,
      question: input.question,
      reportPath,
      completedAt: input.completedAt
    });
    return reportPath;
  }

  async listReports(limit = 10): Promise<ReportIndexEntry[]> {
    const entries = await this.readIndex();
    return entries
      .slice()
      .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
      .slice(0, limit);
  }

  private async upsertIndexEntry(entry: ReportIndexEntry): Promise<void> {
    const entries = await this.readIndex();
    const nextEntries = [entry, ...entries.filter((existing) => existing.id !== entry.id)];
    await mkdir(this.reportDirectory, { recursive: true });
    await writeFile(this.indexPath(), `${JSON.stringify(nextEntries, null, 2)}\n`, "utf8");
  }

  private async readIndex(): Promise<ReportIndexEntry[]> {
    try {
      const raw = await readFile(this.indexPath(), "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(isReportIndexEntry);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  private indexPath(): string {
    return join(this.reportDirectory, "index.json");
  }
}

function isReportIndexEntry(value: unknown): value is ReportIndexEntry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.jobId === "string" &&
    typeof record.question === "string" &&
    typeof record.reportPath === "string" &&
    typeof record.completedAt === "string"
  );
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 60);
  return slug || "report";
}
