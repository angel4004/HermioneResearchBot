import { describe, expect, it } from "vitest";

import { analyzeResearchReport } from "../../src/research/report-analysis.js";

describe("analyzeResearchReport", () => {
  it("extracts a brief from the Verdict section", () => {
    const analysis = analyzeResearchReport([
      "## Verdict",
      "Публичная связь подтверждается с высокой уверенностью.",
      "",
      "## Evidence",
      "1. [Official page](https://example.com/about) confirms the company profile."
    ].join("\n"));

    expect(analysis.brief).toBe("Публичная связь подтверждается с высокой уверенностью.");
  });

  it("extracts and deduplicates markdown and bare URL sources", () => {
    const analysis = analyzeResearchReport([
      "## Evidence",
      "1. [Official page](https://example.com/about) confirms the company profile.",
      "2. Bare source: https://registry.example/company/123.",
      "3. Duplicate: https://example.com/about"
    ].join("\n"));

    expect(analysis.sources).toEqual([
      { url: "https://example.com/about", title: "Official page" },
      { url: "https://registry.example/company/123" }
    ]);
  });

  it("extracts unresolved gaps from Caveats and Next action sections", () => {
    const analysis = analyzeResearchReport([
      "## Caveats",
      "- TravelLine OÜ пока не верифицирована через официальный registry card.",
      "- Wayback/archival progression не была исчерпана полностью.",
      "",
      "## Next action",
      "Проверить официальную карточку TravelLine OÜ в эстонском e-Business Register."
    ].join("\n"));

    expect(analysis.unresolvedGaps).toEqual([
      "TravelLine OÜ пока не верифицирована через официальный registry card.",
      "Wayback/archival progression не была исчерпана полностью.",
      "Проверить официальную карточку TravelLine OÜ в эстонском e-Business Register."
    ]);
  });
});
