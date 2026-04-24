import { describe, expect, it } from "vitest";

import {
  buildQualityContinuationQuestion,
  evaluateResearchReport
} from "../../src/research/quality-gate.js";

const completeReport = [
  "## Verdict",
  "The relationship is supported by public evidence.",
  "",
  "## Entity map",
  "- Example A Ltd: operating company.",
  "- Example B OÜ: distributor.",
  "",
  "## Role split",
  "- Example founder: shareholder.",
  "",
  "## Hypothesis ledger",
  "- Shared ownership: tested / refuted.",
  "- Historical lineage: tested / supported.",
  "",
  "## Pivots executed",
  "- Official registries.",
  "- Historical lineage.",
  "- Public employee-role overlaps.",
  "",
  "## Evidence",
  "1. https://example.com confirms the public bridge.",
  "",
  "## Caveats",
  "- Brand-level UBO is not fully confirmed.",
  "",
  "## Next action",
  "Check official filings again after the next registry update."
].join("\n");

describe("evaluateResearchReport", () => {
  it("passes a report with required quality sections and no early continuation offer", () => {
    expect(evaluateResearchReport(completeReport)).toEqual({
      passed: true,
      findings: []
    });
  });

  it("fails a report that asks the user whether to continue before stop criteria are met", () => {
    const report = [
      "## Verdict",
      "No direct UBO match was found.",
      "",
      "Если хочешь, я могу продолжить и проверить архивы, сотрудников и партнеров."
    ].join("\n");

    const result = evaluateResearchReport(report);

    expect(result.passed).toBe(false);
    expect(result.findings).toContainEqual({
      code: "premature_continuation_offer",
      message: expect.stringContaining("permission to continue")
    });
  });

  it("fails a public-link audit that defers obvious pivots to a next message", () => {
    const report = [
      "Уже найденные публичные связи между TravelLine и Exely:",
      "",
      "Прямые / сильные",
      "",
      "1. Оба бренда используют эстонский international corporate layer",
      "2. Почти одинаковая география международных локализаций",
      "",
      "Следующий шаг",
      "",
      "Я продолжу искать:",
      "",
      "1. TravelLine OÜ в эстонском реестре,",
      "2. историю связей TravelLine OÜ ↔ RevBoost Tech OÜ,",
      "3. архивные страницы и публичные переходы сотрудников/локальных структур.",
      "",
      "Могу продолжать в том же формате и постепенно собирать полный public-link audit."
    ].join("\n");

    const result = evaluateResearchReport(report);

    expect(result.passed).toBe(false);
    expect(result.findings).toContainEqual({
      code: "premature_continuation_offer",
      message: expect.stringContaining("obvious pivots")
    });
  });

  it("fails a structured audit that leaves obvious safe public pivots as next action", () => {
    const report = [
      "## Verdict",
      "Публичная связь подтверждается с высокой уверенностью.",
      "",
      "## Evidence map",
      "- Direct / strong: оба бренда используют эстонские international legal vehicles.",
      "",
      "## Checked vectors",
      "- Official brand websites.",
      "- Contacts / about pages.",
      "",
      "## Hypothesis ledger",
      "- TravelLine OÜ and RevBoost Tech OÜ are sequential or related international legal vehicles: supported directionally, not yet fully document-proven.",
      "- Employee/public-speaker traces can produce direct cross-brand bridges: still unknown in this pass.",
      "",
      "## Pivots executed",
      "- От сайтов к legal/contact pages.",
      "- От брендов к international layer.",
      "",
      "## Evidence",
      "1. https://www.travelline.pro/ confirms TravelLine international footprint.",
      "2. https://exely.com/contacts/ confirms RevBoost Tech OÜ.",
      "",
      "## Caveats",
      "- TravelLine OÜ пока не верифицирована через официальный эстонский registry card в этом проходе.",
      "- Wayback/archival progression и historical domain transitions не были исчерпаны полностью.",
      "",
      "## Next action",
      "Проверить официальную карточку и историю компании TravelLine OÜ (reg code 14468735) в эстонском e-Business Register."
    ].join("\n");

    const result = evaluateResearchReport(report);

    expect(result.passed).toBe(false);
    expect(result.findings).toContainEqual({
      code: "unexecuted_safe_pivot",
      message: expect.stringContaining("safe public-source pivot")
    });
  });

  it("fails a non-trivial relationship report without hypothesis ledger and pivots", () => {
    const result = evaluateResearchReport("## Verdict\nNo public connection found.");

    expect(result.passed).toBe(false);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        { code: "missing_hypothesis_ledger", message: expect.any(String) },
        { code: "missing_pivots_executed", message: expect.any(String) },
        { code: "missing_evidence", message: expect.any(String) },
        { code: "missing_caveats", message: expect.any(String) }
      ])
    );
  });

  it("fails a report that has an Evidence section but no source links", () => {
    const report = [
      "## Verdict",
      "The relationship is likely.",
      "",
      "## Hypothesis ledger",
      "- Shared international structure: tested / supported.",
      "",
      "## Pivots executed",
      "- Official websites.",
      "- Corporate registries.",
      "",
      "## Evidence",
      "Official pages and registry sources confirm the claim.",
      "",
      "## Caveats",
      "- Registry history was not fully available."
    ].join("\n");

    const result = evaluateResearchReport(report);

    expect(result.passed).toBe(false);
    expect(result.findings).toContainEqual({
      code: "missing_source_links",
      message: expect.stringContaining("source links")
    });
  });
});

describe("buildQualityContinuationQuestion", () => {
  it("builds a focused continuation question from quality gate findings", () => {
    const evaluation = evaluateResearchReport("## Verdict\nЕсли хочешь, продолжу.");

    const question = buildQualityContinuationQuestion({
      originalQuestion: "Find public links between Company A and Company B.",
      previousReportMarkdown: "## Verdict\nЕсли хочешь, продолжу.",
      findings: evaluation.findings
    });

    expect(question).toContain("Continue the same research task without asking the user for permission");
    expect(question).toContain("Find public links between Company A and Company B.");
    expect(question).toContain("premature_continuation_offer");
    expect(question).toContain("Hypothesis ledger");
    expect(question).toContain("Pivots executed");
  });

  it("keeps the tail of long previous reports because caveats and next action are usually there", () => {
    const longBody = "A".repeat(5000);

    const question = buildQualityContinuationQuestion({
      originalQuestion: "Find public links between Company A and Company B.",
      previousReportMarkdown: [
        "## Verdict",
        longBody,
        "## Caveats",
        "TravelLine OÜ пока не верифицирована через официальный registry card.",
        "## Next action",
        "Проверить официальную карточку TravelLine OÜ в эстонском e-Business Register."
      ].join("\n"),
      findings: [
        {
          code: "unexecuted_safe_pivot",
          message: "Report leaves an obvious safe public-source pivot unexecuted."
        }
      ]
    });

    expect(question).toContain("[previous report middle truncated]");
    expect(question).toContain("TravelLine OÜ пока не верифицирована");
    expect(question).toContain("Проверить официальную карточку TravelLine OÜ");
  });
});
