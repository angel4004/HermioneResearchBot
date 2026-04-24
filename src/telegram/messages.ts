import type { AppConfig } from "../config/env.js";
import type { ReportIndexEntry } from "../storage/report-store.js";
import type { StoredJob } from "../storage/types.js";

export const START_MESSAGE = [
  "HermioneResearchBot принимает глубокие web research-задачи.",
  "Можно просто прислать research-задачу обычным сообщением.",
  "",
  "Команды:",
  "/research <question> - запустить исследование",
  "/status - показать активную задачу",
  "/cancel - отменить активную задачу",
  "/continue - продолжить от последнего отчета и gaps",
  "/sources - показать источники последнего отчета",
  "/brief - показать краткую выжимку последнего отчета",
  "/history - показать последние сохраненные отчеты",
  "/diagnostics - показать состояние runtime без секретов",
  "/settings - показать текущие лимиты"
].join("\n");

export function formatSettings(config: AppConfig): string {
  return [
    "Current Hermione settings:",
    `APP_ID: ${config.appId}`,
    `SEARCHARVESTER_URL: ${config.searcharvesterUrl}`,
    `timeout: ${config.researchDefaultTimeoutMs / 1000}s`,
    `poll interval: ${config.researchPollIntervalMs / 1000}s`,
    `max parallel jobs: ${config.researchMaxParallelJobs}`,
    `quality gate: ${config.researchQualityGateEnabled ? "enabled" : "disabled"}`,
    `max auto-continuations: ${config.researchMaxAutoContinuations}`,
    `free-text research: ${config.telegramFreeTextResearchEnabled ? "enabled" : "disabled"}`,
    `report output dir: ${config.reportOutputDir}`
  ].join("\n");
}

export function formatResearchAccepted(jobId: string): string {
  return [
    `Принял research-задачу: ${jobId}`,
    "Буду работать автономно: искать, проверять источники и продолжать очевидные безопасные pivots без отдельных подтверждений."
  ].join("\n");
}

export function formatActiveJob(job: StoredJob): string {
  return [
    `Active research job: ${job.jobId}`,
    `Status: ${job.status}`,
    `Question: ${job.question}`,
    `Created: ${job.createdAt}`,
    `Updated: ${job.updatedAt}`
  ].join("\n");
}

export function formatLastJob(job: StoredJob): string {
  return [
    `No active research job.`,
    `Last completed job: ${job.jobId}`,
    `Status: ${job.status}`,
    `Question: ${job.question}`,
    job.reportPath ? `Report: ${job.reportPath}` : undefined
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

export function formatSources(job: StoredJob): string {
  if (!job.sources?.length) {
    return `No stored sources for job ${job.jobId}.`;
  }

  const lines = [`Sources for job ${job.jobId}:`];
  for (const [index, source] of job.sources.entries()) {
    if (source.title) {
      lines.push(`${index + 1}. ${source.title}`);
      lines.push(`   ${source.url}`);
    } else {
      lines.push(`${index + 1}. ${source.url}`);
    }
  }
  return lines.join("\n");
}

export function formatBrief(job: StoredJob): string {
  const lines = [`Brief for job ${job.jobId}:`, "", job.reportBrief ?? "No stored brief for this report."];
  if (job.unresolvedGaps?.length) {
    lines.push("", "Unresolved gaps:", ...job.unresolvedGaps.map((gap) => `- ${gap}`));
  }
  return lines.join("\n");
}

export function formatDiagnostics(input: {
  config: AppConfig;
  activeJob: StoredJob | null;
  lastCompletedJob: StoredJob | null;
}): string {
  const active = input.activeJob;
  const last = input.lastCompletedJob;
  return [
    "Hermione diagnostics",
    `APP_ID: ${input.config.appId}`,
    `SEARCHARVESTER_URL: ${input.config.searcharvesterUrl}`,
    `quality gate: ${input.config.researchQualityGateEnabled ? "enabled" : "disabled"}`,
    `max auto-continuations: ${input.config.researchMaxAutoContinuations}`,
    `free-text research: ${input.config.telegramFreeTextResearchEnabled ? "enabled" : "disabled"}`,
    `report output dir: ${input.config.reportOutputDir}`,
    "",
    active
      ? `Active job: ${active.jobId} (${active.status}), continuations: ${active.continuationCount ?? 0}`
      : "Active job: none",
    last
      ? `Last completed job: ${last.jobId} (${last.status}), sources: ${last.sources?.length ?? 0}, gaps: ${
          last.unresolvedGaps?.length ?? 0
        }`
      : "Last completed job: none",
    last?.reportPath ? `Last report: ${last.reportPath}` : undefined
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

export function formatHistory(entries: ReportIndexEntry[]): string {
  if (entries.length === 0) {
    return "No stored reports yet.";
  }

  const lines = ["Recent reports:"];
  for (const [index, entry] of entries.entries()) {
    lines.push(`${index + 1}. ${entry.id} — ${entry.completedAt}`);
    lines.push(`   ${entry.question}`);
    lines.push(`   ${entry.reportPath}`);
  }
  return lines.join("\n");
}

export function formatAutoContinuationStarted(input: {
  previousJobId: string;
  nextJobId: string;
  findingsCount: number;
}): string {
  return [
    "Не отдаю промежуточный отчет как финальный.",
    `Quality gate нашел недоработки: ${input.findingsCount}.`,
    `Предыдущая задача: ${input.previousJobId}`,
    `Продолжение: ${input.nextJobId}`,
    "Продолжаю исследование сам, без запроса на следующий очевидный шаг."
  ].join("\n");
}
