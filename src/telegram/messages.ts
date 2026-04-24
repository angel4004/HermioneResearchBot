import type { AppConfig } from "../config/env.js";
import type { StoredJob } from "../storage/types.js";

export const START_MESSAGE = [
  "HermioneResearchBot принимает глубокие web research-задачи.",
  "",
  "Команды:",
  "/research <question> - запустить исследование",
  "/status - показать активную задачу",
  "/cancel - отменить активную задачу",
  "/continue - продолжить от последнего отчета и gaps",
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
    `report output dir: ${config.reportOutputDir}`
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
