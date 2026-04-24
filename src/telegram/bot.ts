import { Bot } from "grammy";

import type { AppConfig } from "../config/env.js";
import { JobManager } from "../jobs/job-manager.js";
import { SearcharvesterClient } from "../research/searcharvester-client.js";
import { ReportStore } from "../storage/report-store.js";
import { SessionStore } from "../storage/session-store.js";
import { createAllowlistMiddleware } from "./auth.js";
import { registerHandlers } from "./handlers.js";

export function createHermioneBot(config: AppConfig): Bot {
  const bot = new Bot(config.telegramBotToken);
  const sessionStore = new SessionStore(config.sessionFilePath);
  const reportStore = new ReportStore(config.reportOutputDir);
  const backend = new SearcharvesterClient({
    baseUrl: config.searcharvesterUrl,
    requestTimeoutMs: Math.min(config.researchDefaultTimeoutMs, 30_000),
    researchTimeBudgetMs: config.researchDefaultTimeoutMs
  });
  const jobManager = new JobManager({
    backend,
    sessionStore,
    reportStore,
    timeoutMs: config.researchDefaultTimeoutMs,
    pollIntervalMs: config.researchPollIntervalMs,
    maxParallelJobs: config.researchMaxParallelJobs,
    autoRun: false
  });

  bot.use(createAllowlistMiddleware(config.allowedTelegramUserIds));
  registerHandlers({ bot, config, jobManager });

  return bot;
}
