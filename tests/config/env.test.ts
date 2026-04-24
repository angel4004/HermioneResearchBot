import { describe, expect, it } from "vitest";

import { loadConfig } from "../../src/config/env.js";

const requiredEnv = {
  TELEGRAM_BOT_TOKEN: "123456:token",
  ALLOWED_TELEGRAM_USER_IDS: "100, 200",
  SEARCHARVESTER_URL: "http://127.0.0.1:8000"
};

describe("loadConfig", () => {
  it("loads required values and safe defaults", () => {
    const config = loadConfig(requiredEnv);

    expect(config.appId).toBe("hermione-research-bot");
    expect(config.allowedTelegramUserIds).toEqual(new Set([100, 200]));
    expect(config.sessionFilePath).toBe("data/sessions.json");
    expect(config.researchDefaultTimeoutMs).toBe(3_600_000);
    expect(config.researchPollIntervalMs).toBe(5_000);
    expect(config.researchMaxParallelJobs).toBe(1);
    expect(config.researchQualityGateEnabled).toBe(true);
    expect(config.researchMaxAutoContinuations).toBe(4);
    expect(config.telegramFreeTextResearchEnabled).toBe(true);
    expect(config.reportOutputDir).toBe("data/reports");
  });

  it("allows quality gate rollout settings to be customized", () => {
    const config = loadConfig({
      ...requiredEnv,
      RESEARCH_QUALITY_GATE_ENABLED: "false",
      RESEARCH_MAX_AUTO_CONTINUATIONS: "0"
    });

    expect(config.researchQualityGateEnabled).toBe(false);
    expect(config.researchMaxAutoContinuations).toBe(0);
  });

  it("allows free-text Telegram research rollout to be customized", () => {
    const config = loadConfig({
      ...requiredEnv,
      TELEGRAM_FREE_TEXT_RESEARCH_ENABLED: "false"
    });

    expect(config.telegramFreeTextResearchEnabled).toBe(false);
  });

  it("rejects an APP_ID that is not Hermione", () => {
    expect(() =>
      loadConfig({
        ...requiredEnv,
        APP_ID: "openclaw-paf-auditor"
      })
    ).toThrow(/APP_ID/);
  });

  it("rejects missing Telegram token", () => {
    expect(() =>
      loadConfig({
        ALLOWED_TELEGRAM_USER_IDS: "100",
        SEARCHARVESTER_URL: "http://127.0.0.1:8000"
      })
    ).toThrow(/TELEGRAM_BOT_TOKEN/);
  });

  it("rejects invalid numeric limits", () => {
    expect(() =>
      loadConfig({
        ...requiredEnv,
        RESEARCH_MAX_PARALLEL_JOBS: "0"
      })
    ).toThrow(/RESEARCH_MAX_PARALLEL_JOBS/);
  });

  it("rejects invalid quality gate settings", () => {
    expect(() =>
      loadConfig({
        ...requiredEnv,
        RESEARCH_QUALITY_GATE_ENABLED: "maybe"
      })
    ).toThrow(/RESEARCH_QUALITY_GATE_ENABLED/);

    expect(() =>
      loadConfig({
        ...requiredEnv,
        RESEARCH_MAX_AUTO_CONTINUATIONS: "-1"
      })
    ).toThrow(/RESEARCH_MAX_AUTO_CONTINUATIONS/);
  });

  it("rejects invalid Searcharvester URL", () => {
    expect(() =>
      loadConfig({
        ...requiredEnv,
        SEARCHARVESTER_URL: "not-a-url"
      })
    ).toThrow(/SEARCHARVESTER_URL/);
  });
});
