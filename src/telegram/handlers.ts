import type { Bot, Context } from "grammy";

import type { AppConfig } from "../config/env.js";
import type { JobManager } from "../jobs/job-manager.js";
import { parseContinueCommand, parseFreeTextResearchQuestion, parseResearchCommand } from "./command-parser.js";
import { splitTelegramMessage } from "./chunking.js";
import {
  formatActiveJob,
  formatAutoContinuationStarted,
  formatBrief,
  formatDiagnostics,
  formatHistory,
  formatLastJob,
  formatResearchAccepted,
  formatSettings,
  formatSources,
  START_MESSAGE
} from "./messages.js";

type ResearchDeliveryJobManager = Pick<JobManager, "getStatus" | "pollActiveJobOnce">;
type SendTelegramMessage = (text: string) => Promise<unknown>;

export interface RegisterHandlersOptions {
  bot: Bot;
  config: AppConfig;
  jobManager: JobManager;
}

export function registerHandlers(options: RegisterHandlersOptions): void {
  const { bot, config, jobManager } = options;

  bot.command("start", async (ctx) => {
    await ctx.reply(START_MESSAGE);
  });

  bot.command("settings", async (ctx) => {
    await ctx.reply(formatSettings(config));
  });

  bot.command("diagnostics", async (ctx) => {
    const [activeJob, lastCompletedJob] = await Promise.all([
      jobManager.getStatus(),
      jobManager.getLastCompletedJob()
    ]);
    await ctx.reply(formatDiagnostics({ config, activeJob, lastCompletedJob }));
  });

  bot.command("status", async (ctx) => {
    const activeJob = await jobManager.getStatus();
    if (activeJob) {
      await ctx.reply(formatActiveJob(activeJob));
      return;
    }

    const lastCompletedJob = await jobManager.getLastCompletedJob();
    await ctx.reply(lastCompletedJob ? formatLastJob(lastCompletedJob) : "No active or completed research jobs.");
  });

  bot.command("sources", async (ctx) => {
    const lastCompletedJob = await jobManager.getLastCompletedJob();
    await ctx.reply(lastCompletedJob ? formatSources(lastCompletedJob) : "No completed research job to show sources for.");
  });

  bot.command("brief", async (ctx) => {
    const lastCompletedJob = await jobManager.getLastCompletedJob();
    await ctx.reply(lastCompletedJob ? formatBrief(lastCompletedJob) : "No completed research job to show a brief for.");
  });

  bot.command("history", async (ctx) => {
    await ctx.reply(formatHistory(await jobManager.listReports(10)));
  });

  bot.command("research", async (ctx) => {
    const parsed = parseResearchCommand(ctx.message?.text ?? "");
    if (!parsed.ok) {
      await ctx.reply("Usage: /research <question>");
      return;
    }

    await startResearchFromTelegram(ctx, jobManager, config, parsed.question);
  });

  bot.command("cancel", async (ctx) => {
    const result = await jobManager.cancelActiveJob();
    if (!result.cancelled) {
      await ctx.reply("No active research job to cancel.");
      return;
    }
    await ctx.reply(`Research job cancelled: ${result.jobId}`);
  });

  bot.command("continue", async (ctx) => {
    const lastCompletedJob = await jobManager.getLastCompletedJob();
    if (!lastCompletedJob) {
      await ctx.reply("No completed research job to continue from.");
      return;
    }

    const parsed = parseContinueCommand(ctx.message?.text ?? "");
    const gaps = lastCompletedJob.unresolvedGaps?.length
      ? lastCompletedJob.unresolvedGaps.map((gap) => `- ${gap}`).join("\n")
      : "- Re-check unresolved or weakly supported claims from the previous report.";
    const focus = parsed.focus ? `\nAdditional focus from user: ${parsed.focus}` : "";
    const question = [
      "Continue the previous Hermione research cycle.",
      `Original question: ${lastCompletedJob.question}`,
      lastCompletedJob.reportPath ? `Previous report path: ${lastCompletedJob.reportPath}` : undefined,
      "Unresolved gaps:",
      gaps,
      focus
    ]
      .filter((part): part is string => part !== undefined)
      .join("\n");

    try {
      const job = await jobManager.startResearch(question, { telegramChatId: ctx.chat?.id });
      await ctx.reply(formatResearchAccepted(job.jobId));
      void deliverWhenFinished(ctx.reply.bind(ctx), jobManager, {
        chunkLimit: config.telegramMessageChunkLimit,
        maxDirectReportChars: config.telegramMaxDirectReportChars,
        pollIntervalMs: config.researchPollIntervalMs
      });
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Failed to start continuation research job.");
    }
  });

  bot.on("message:text", async (ctx) => {
    if (!config.telegramFreeTextResearchEnabled) {
      return;
    }

    const parsed = parseFreeTextResearchQuestion(ctx.message.text);
    if (!parsed.ok) {
      return;
    }

    await startResearchFromTelegram(ctx, jobManager, config, parsed.question);
  });
}

async function startResearchFromTelegram(
  ctx: Context,
  jobManager: JobManager,
  config: AppConfig,
  question: string
): Promise<void> {
  try {
    const job = await jobManager.startResearch(question, { telegramChatId: ctx.chat?.id });
    await ctx.reply(formatResearchAccepted(job.jobId));
    void deliverWhenFinished(ctx.reply.bind(ctx), jobManager, {
      chunkLimit: config.telegramMessageChunkLimit,
      maxDirectReportChars: config.telegramMaxDirectReportChars,
      pollIntervalMs: config.researchPollIntervalMs
    });
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Failed to start research job.");
  }
}

export async function resumeActiveJobDelivery(options: {
  jobManager: ResearchDeliveryJobManager;
  sendMessage: (chatId: number, text: string) => Promise<unknown>;
  chunkLimit: number;
  maxDirectReportChars: number;
  pollIntervalMs: number;
}): Promise<void> {
  const activeJob = await options.jobManager.getStatus();
  if (activeJob?.telegramChatId === undefined) {
    return;
  }

  const chatId = activeJob.telegramChatId;
  await options.sendMessage(chatId, `Возобновляю доставку активной research-задачи после restart: ${activeJob.jobId}`);
  await deliverWhenFinished((text) => options.sendMessage(chatId, text), options.jobManager, {
    chunkLimit: options.chunkLimit,
    maxDirectReportChars: options.maxDirectReportChars,
    pollIntervalMs: options.pollIntervalMs
  });
}

async function deliverWhenFinished(
  sendMessage: SendTelegramMessage,
  jobManager: ResearchDeliveryJobManager,
  options: {
    chunkLimit: number;
    maxDirectReportChars: number;
    pollIntervalMs: number;
  }
): Promise<void> {
  while (true) {
    const result = await jobManager.pollActiveJobOnce();
    if (result.kind === "running") {
      await new Promise((resolve) => setTimeout(resolve, options.pollIntervalMs));
      continue;
    }

    if (result.kind === "continued") {
      await sendMessage(
        formatAutoContinuationStarted({
          previousJobId: result.previousJob.jobId,
          nextJobId: result.job.jobId,
          findingsCount: result.job.qualityGateFindings?.length ?? 0
        })
      );
      await new Promise((resolve) => setTimeout(resolve, options.pollIntervalMs));
      continue;
    }

    if (result.kind === "completed") {
      await sendMessage(`Research completed. Report saved: ${result.reportPath}`);
      if (result.reportMarkdown.length <= options.maxDirectReportChars) {
        for (const chunk of splitTelegramMessage(result.reportMarkdown, options.chunkLimit)) {
          await sendMessage(chunk);
        }
      } else {
        await sendMessage("Report is too large for direct Telegram delivery. Use the saved markdown file.");
      }
      return;
    }

    if (result.kind === "failed" || result.kind === "timeout") {
      await sendMessage(result.job.errorMessage ?? "Research job failed.");
      return;
    }

    if (result.kind === "cancelled" || result.kind === "idle") {
      return;
    }
  }
}
