import type { AppConfig } from "../config/env.js";
import type { QualityGateFinding, QualityGateFindingCode } from "../research/quality-gate.js";
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
    "Задачу приняла. Начинаю исследование.",
    "Что буду делать: искать публичные источники, проверять факты и сама переходить к следующим очевидным направлениям.",
    "Напишу, когда появится важный прогресс, задача остановится по качеству/безопасности или будет готов отчет.",
    `Технический id: ${jobId}`
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
  findings: QualityGateFinding[];
}): string {
  return [
    "Промежуточный результат пока сырой, не отправляю его как финальный отчет.",
    `Что не хватает: ${formatFindingSummary(input.findings)}.`,
    "Продолжаю сама: доберу публичные подтверждения и проверю следующие безопасные направления."
  ].join("\n");
}

export function formatResearchCompleted(reportPath: string): string {
  return `Исследование завершено. Отчет сохранен: ${reportPath}\nНиже отправляю отчет.`;
}

export function formatResearchFailed(job: StoredJob): string {
  const reason = stripStoppedPrefix(job.errorMessage ?? "backend не вернул финальный отчет.");
  return [
    "Исследование остановлено без финального отчета.",
    `Причина: ${reason}`,
    job.qualityGateFindings?.length ? `Что не так: ${formatFindingSummary(job.qualityGateFindings)}.` : undefined,
    `Технический id: ${job.jobId}`
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

function formatFindingSummary(findings: QualityGateFinding[]): string {
  const labels = findings.map((finding) => qualityFindingLabel(finding.code));
  const uniqueLabels = [...new Set(labels)];
  if (uniqueLabels.length === 0) {
    return "нужно больше проверок качества";
  }
  return uniqueLabels.join("; ");
}

function qualityFindingLabel(code: QualityGateFindingCode): string {
  switch (code) {
    case "backend_capability_missing":
      return "исследовательский backend не смог запустить нужный research workflow";
    case "missing_source_links":
      return "ссылок на источники";
    case "missing_hypothesis_ledger":
      return "проверки гипотез";
    case "missing_pivots_executed":
      return "списка реально проверенных направлений";
    case "missing_evidence":
      return "evidence map с подтверждениями";
    case "missing_caveats":
      return "оговорок и оставшихся неопределенностей";
    case "premature_continuation_offer":
      return "результат слишком рано предложил продолжить вместо самостоятельной проверки";
    case "unexecuted_safe_pivot":
      return "остались очевидные безопасные направления поиска";
  }
}

function stripStoppedPrefix(message: string): string {
  return message.replace(/^Исследование остановлено:\s*/u, "");
}
