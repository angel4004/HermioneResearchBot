import { describe, expect, it } from "vitest";

import { loadConfig } from "../../src/config/env.js";
import {
  formatAutoContinuationStarted,
  formatBrief,
  formatDiagnostics,
  formatHistory,
  formatResearchFailed,
  formatResearchAccepted,
  formatSources,
  formatSettings,
  START_MESSAGE
} from "../../src/telegram/messages.js";

describe("START_MESSAGE", () => {
  it("identifies the new HermioneResearchBot runtime", () => {
    expect(START_MESSAGE).toContain("HermioneResearchBot");
    expect(START_MESSAGE).toContain("/research <question>");
    expect(START_MESSAGE).toContain("/sources");
    expect(START_MESSAGE).toContain("/brief");
    expect(START_MESSAGE).toContain("Можно просто прислать research-задачу обычным сообщением");
  });

  it("does not present Hermione as the old OpenClaw or coding-agent runtime", () => {
    expect(START_MESSAGE).not.toContain("OpenClaw");
    expect(START_MESSAGE).not.toContain("кодом");
    expect(START_MESSAGE).not.toContain("инфраструктурой");
  });
});

describe("formatResearchAccepted", () => {
  it("explains autonomous research behavior for accepted jobs", () => {
    expect(formatResearchAccepted("job-1")).toBe(
      [
        "Задачу приняла. Начинаю исследование.",
        "Что буду делать: искать публичные источники, проверять факты и сама переходить к следующим очевидным направлениям.",
        "Напишу, когда появится важный прогресс, задача остановится по качеству/безопасности или будет готов отчет.",
        "Технический id: job-1"
      ].join("\n")
    );
  });
});

describe("formatSettings", () => {
  it("shows free-text research and auto-continuation settings", () => {
    const config = loadConfig({
      TELEGRAM_BOT_TOKEN: "123456:token",
      ALLOWED_TELEGRAM_USER_IDS: "100",
      SEARCHARVESTER_URL: "http://127.0.0.1:8000"
    });

    const settings = formatSettings(config);

    expect(settings).toContain("max auto-continuations: 4");
    expect(settings).toContain("free-text research: enabled");
  });
});

describe("formatDiagnostics", () => {
  it("formats non-secret runtime diagnostics", () => {
    const config = loadConfig({
      TELEGRAM_BOT_TOKEN: "123456:token",
      ALLOWED_TELEGRAM_USER_IDS: "100",
      SEARCHARVESTER_URL: "http://127.0.0.1:8000"
    });

    expect(
      formatDiagnostics({
        config,
        activeJob: {
          jobId: "job-active",
          question: "question",
          status: "running",
          createdAt: "2026-04-24T10:00:00.000Z",
          updatedAt: "2026-04-24T10:01:00.000Z",
          continuationCount: 1
        },
        lastCompletedJob: {
          jobId: "job-done",
          question: "done",
          status: "completed",
          createdAt: "2026-04-24T09:00:00.000Z",
          updatedAt: "2026-04-24T09:05:00.000Z",
          reportPath: "data/reports/job-done.md",
          sources: [{ url: "https://example.com" }],
          unresolvedGaps: ["gap"]
        }
      })
    ).toContain("Hermione diagnostics");
  });
});

describe("formatSources", () => {
  it("formats stored report sources for Telegram", () => {
    expect(
      formatSources({
        jobId: "job-1",
        question: "question",
        status: "completed",
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:01:00.000Z",
        sources: [
          { url: "https://example.com/about", title: "Official page" },
          { url: "https://registry.example/company/123" }
        ]
      })
    ).toBe(
      [
        "Sources for job job-1:",
        "1. Official page",
        "   https://example.com/about",
        "2. https://registry.example/company/123"
      ].join("\n")
    );
  });

  it("explains when sources are missing", () => {
    expect(
      formatSources({
        jobId: "job-1",
        question: "question",
        status: "completed",
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:01:00.000Z"
      })
    ).toBe("No stored sources for job job-1.");
  });
});

describe("formatBrief", () => {
  it("formats stored report brief and gaps", () => {
    expect(
      formatBrief({
        jobId: "job-1",
        question: "question",
        status: "completed",
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:01:00.000Z",
        reportBrief: "Публичная связь подтверждается.",
        unresolvedGaps: ["Registry history не была исчерпана полностью."]
      })
    ).toBe(
      [
        "Brief for job job-1:",
        "",
        "Публичная связь подтверждается.",
        "",
        "Unresolved gaps:",
        "- Registry history не была исчерпана полностью."
      ].join("\n")
    );
  });
});

describe("formatHistory", () => {
  it("formats report history entries", () => {
    expect(
      formatHistory([
        {
          id: "job-2",
          jobId: "job-2",
          question: "Second report",
          reportPath: "data/reports/job-2.md",
          completedAt: "2026-04-24T11:00:00.000Z"
        },
        {
          id: "job-1",
          jobId: "job-1",
          question: "First report",
          reportPath: "data/reports/job-1.md",
          completedAt: "2026-04-24T10:00:00.000Z"
        }
      ])
    ).toBe(
      [
        "Recent reports:",
        "1. job-2 — 2026-04-24T11:00:00.000Z",
        "   Second report",
        "   data/reports/job-2.md",
        "2. job-1 — 2026-04-24T10:00:00.000Z",
        "   First report",
        "   data/reports/job-1.md"
      ].join("\n")
    );
  });

  it("explains when report history is empty", () => {
    expect(formatHistory([])).toBe("No stored reports yet.");
  });
});

describe("formatAutoContinuationStarted", () => {
  it("explains that Hermione continues because quality gate failed without asking permission", () => {
    expect(
      formatAutoContinuationStarted({
        previousJobId: "job-1",
        nextJobId: "job-2",
        findings: [
          {
            code: "missing_source_links",
            message: "Report must include source links, not only narrative evidence."
          },
          {
            code: "missing_pivots_executed",
            message: "Report must show which safe research pivots were executed before stopping."
          }
        ]
      })
    ).toBe(
      [
        "Промежуточный результат пока сырой, не отправляю его как финальный отчет.",
        "Что не хватает: ссылок на источники; списка реально проверенных направлений.",
        "Продолжаю сама: доберу публичные подтверждения и проверю следующие безопасные направления."
      ].join("\n")
    );
  });
});

describe("formatResearchFailed", () => {
  it("formats a human-readable stopped message without leaking backend output as final research", () => {
    expect(
      formatResearchFailed({
        jobId: "job-1",
        question: "question",
        status: "failed",
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:01:00.000Z",
        errorMessage:
          "Исследование остановлено: backend не вернул отчет исследовательского качества, поэтому не отправляю черновик как финальный отчет.",
        qualityGateFindings: [
          {
            code: "backend_capability_missing",
            message: "The backend did not have the research capability it tried to call."
          }
        ]
      })
    ).toBe(
      [
        "Исследование остановлено без финального отчета.",
        "Причина: backend не вернул отчет исследовательского качества, поэтому не отправляю черновик как финальный отчет.",
        "Что не так: исследовательский backend не смог запустить нужный research workflow.",
        "Технический id: job-1"
      ].join("\n")
    );
  });
});
