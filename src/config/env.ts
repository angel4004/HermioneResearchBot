import { APP_ID } from "./constants.js";

export interface AppConfig {
  appId: string;
  telegramBotToken: string;
  allowedTelegramUserIds: Set<number>;
  sessionFilePath: string;
  searcharvesterUrl: string;
  researchDefaultTimeoutMs: number;
  researchPollIntervalMs: number;
  researchMaxParallelJobs: number;
  researchQualityGateEnabled: boolean;
  researchMaxAutoContinuations: number;
  telegramFreeTextResearchEnabled: boolean;
  telegramMessageChunkLimit: number;
  telegramMaxDirectReportChars: number;
  reportOutputDir: string;
  envFilePath?: string | undefined;
  serviceName?: string | undefined;
}

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const appId = env.APP_ID?.trim() || APP_ID;
  if (appId !== APP_ID) {
    throw new Error(`APP_ID must be ${APP_ID}`);
  }

  const telegramBotToken = requiredString(env, "TELEGRAM_BOT_TOKEN");
  const allowedTelegramUserIds = parseUserIdSet(requiredString(env, "ALLOWED_TELEGRAM_USER_IDS"));
  const searcharvesterUrl = parseUrl(requiredString(env, "SEARCHARVESTER_URL"), "SEARCHARVESTER_URL");

  return {
    appId,
    telegramBotToken,
    allowedTelegramUserIds,
    sessionFilePath: env.SESSION_FILE_PATH?.trim() || "data/sessions.json",
    searcharvesterUrl,
    researchDefaultTimeoutMs: parsePositiveInteger(env, "RESEARCH_DEFAULT_TIMEOUT_SECONDS", 3600) * 1000,
    researchPollIntervalMs: parsePositiveInteger(env, "RESEARCH_POLL_INTERVAL_SECONDS", 5) * 1000,
    researchMaxParallelJobs: parsePositiveInteger(env, "RESEARCH_MAX_PARALLEL_JOBS", 1),
    researchQualityGateEnabled: parseBoolean(env, "RESEARCH_QUALITY_GATE_ENABLED", true),
    researchMaxAutoContinuations: parseNonNegativeInteger(env, "RESEARCH_MAX_AUTO_CONTINUATIONS", 4),
    telegramFreeTextResearchEnabled: parseBoolean(env, "TELEGRAM_FREE_TEXT_RESEARCH_ENABLED", true),
    telegramMessageChunkLimit: parsePositiveInteger(env, "TELEGRAM_MESSAGE_CHUNK_LIMIT", 3900),
    telegramMaxDirectReportChars: parsePositiveInteger(env, "TELEGRAM_MAX_DIRECT_REPORT_CHARS", 12_000),
    reportOutputDir: env.REPORT_OUTPUT_DIR?.trim() || "data/reports",
    envFilePath: firstNonEmpty(env.HERMIONE_ENV_PATH, env.ENV_FILE_PATH),
    serviceName: firstNonEmpty(env.HERMIONE_SERVICE_NAME, env.SERVICE_NAME)
  };
}

function parseBoolean(env: Record<string, string | undefined>, key: string, defaultValue: boolean): boolean {
  const rawValue = env[key]?.trim().toLowerCase();
  if (!rawValue) {
    return defaultValue;
  }

  if (["true", "1", "yes", "on"].includes(rawValue)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(rawValue)) {
    return false;
  }
  throw new Error(`${key} must be a boolean`);
}

function parseNonNegativeInteger(
  env: Record<string, string | undefined>,
  key: string,
  defaultValue: number
): number {
  const rawValue = env[key]?.trim();
  if (!rawValue) {
    return defaultValue;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${key} must be a non-negative integer`);
  }
  return parsed;
}

function requiredString(env: Record<string, string | undefined>, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function parsePositiveInteger(
  env: Record<string, string | undefined>,
  key: string,
  defaultValue: number
): number {
  const rawValue = env[key]?.trim();
  if (!rawValue) {
    return defaultValue;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }
  return parsed;
}

function parseUserIdSet(value: string): Set<number> {
  const ids = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number(part));

  if (ids.length === 0 || ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error("ALLOWED_TELEGRAM_USER_IDS must contain positive numeric Telegram user ids");
  }

  return new Set(ids);
}

function parseUrl(value: string, key: string): string {
  try {
    return new URL(value).toString().replace(/\/$/u, "");
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
}
