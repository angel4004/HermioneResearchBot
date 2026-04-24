import type { Bot, Context } from "grammy";

import type { AppConfig } from "../config/env.js";
import type { JobManager } from "../jobs/job-manager.js";
import { parseContinueCommand, parseResearchCommand } from "./command-parser.js";
import { splitTelegramMessage } from "./chunking.js";
import { formatActiveJob, formatLastJob, formatSettings, START_MESSAGE } from "./messages.js";

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

  bot.command("status", async (ctx) => {
    const activeJob = await jobManager.getStatus();
    if (activeJob) {
      await ctx.reply(formatActiveJob(activeJob));
      return;
    }

    const lastCompletedJob = await jobManager.getLastCompletedJob();
    await ctx.reply(lastCompletedJob ? formatLastJob(lastCompletedJob) : "No active or completed research jobs.");
  });

  bot.command("research", async (ctx) => {
    const parsed = parseResearchCommand(ctx.message?.text ?? "");
    if (!parsed.ok) {
      await ctx.reply("Usage: /research <question>");
      return;
    }

    try {
      const job = await jobManager.startResearch(parsed.question);
      await ctx.reply(`Research job accepted: ${job.jobId}`);
      void deliverWhenFinished(
        ctx,
        jobManager,
        config.telegramMessageChunkLimit,
        config.telegramMaxDirectReportChars,
        config.researchPollIntervalMs
      );
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Failed to start research job.");
    }
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
      const job = await jobManager.startResearch(question);
      await ctx.reply(`Continuation research job accepted: ${job.jobId}`);
      void deliverWhenFinished(
        ctx,
        jobManager,
        config.telegramMessageChunkLimit,
        config.telegramMaxDirectReportChars,
        config.researchPollIntervalMs
      );
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Failed to start continuation research job.");
    }
  });
}

async function deliverWhenFinished(
  ctx: Context,
  jobManager: JobManager,
  chunkLimit: number,
  maxDirectReportChars: number,
  pollIntervalMs: number
): Promise<void> {
  while (true) {
    const result = await jobManager.pollActiveJobOnce();
    if (result.kind === "running") {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      continue;
    }

    if (result.kind === "completed") {
      await ctx.reply(`Research completed. Report saved: ${result.reportPath}`);
      if (result.reportMarkdown.length <= maxDirectReportChars) {
        for (const chunk of splitTelegramMessage(result.reportMarkdown, chunkLimit)) {
          await ctx.reply(chunk);
        }
      } else {
        await ctx.reply("Report is too large for direct Telegram delivery. Use the saved markdown file.");
      }
      return;
    }

    if (result.kind === "failed" || result.kind === "timeout") {
      await ctx.reply(result.job.errorMessage ?? "Research job failed.");
      return;
    }

    if (result.kind === "cancelled" || result.kind === "idle") {
      return;
    }
  }
}
