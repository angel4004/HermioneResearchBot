import { describe, expect, it } from "vitest";

import { buildResearchPrompt } from "../../src/research/policy.js";

describe("buildResearchPrompt", () => {
  it("preserves the original user question", () => {
    const prompt = buildResearchPrompt("Find the Ultimate Beneficial Owner of Example Holdings Ltd.");

    expect(prompt).toContain("Find the Ultimate Beneficial Owner of Example Holdings Ltd.");
  });

  it("explicitly allows official UBO/KYC research through public corporate records", () => {
    const prompt = buildResearchPrompt("Find UBO for the example brand.");

    expect(prompt).toContain("Official UBO/KYC research is allowed");
    expect(prompt).toContain("official corporate registries");
    expect(prompt).toContain("public filings");
    expect(prompt).toContain("Split board/shareholders/beneficial owners");
  });

  it("keeps privacy boundaries for personal contacts and unofficial deanonymization", () => {
    const prompt = buildResearchPrompt("Find UBO for the example brand.");

    expect(prompt).toContain("no private personal contact details");
    expect(prompt).toContain("no unofficial deanonymization");
    expect(prompt).toContain("brand-level UBO unknown");
  });

  it("tells the backend to proceed without asking obvious confirmation questions", () => {
    const prompt = buildResearchPrompt("Find UBO for Example Brand, Example Operating Ltd, registry code 12345678.");

    expect(prompt).toContain("No confirmation questions for clear entity");
    expect(prompt).toContain("proceed with best available interpretation");
    expect(prompt).toContain("no 'if you want I can continue'");
  });

  it("requires a compact due diligence card for corporate ownership answers", () => {
    const prompt = buildResearchPrompt("Find UBO for the example brand.");

    expect(prompt).toContain("UX: UBO sections");
    expect(prompt).toContain("Verdict");
    expect(prompt).toContain("Entity checked");
    expect(prompt).toContain("Role split");
    expect(prompt).toContain("Evidence");
    expect(prompt).toContain("Caveats");
  });

  it("requires a structured evidence-map UX for public link audits", () => {
    const prompt = buildResearchPrompt("Find all public links between Example A and Example B.");

    expect(prompt).toContain("Public-link sections");
    expect(prompt).toContain("Evidence map");
    expect(prompt).toContain("Checked vectors");
    expect(prompt).toContain("No unexecuted pivots under next step");
  });

  it("does not overclaim a local distributor owner as the brand-level UBO", () => {
    const prompt = buildResearchPrompt("Find the UBO of Example Brand. Example Local Operator Ltd may be a distributor.");

    expect(prompt).toContain("Do not treat distributor/reseller/local/regional owner as brand-level UBO");
    expect(prompt).toContain("Entity map roles: brand owner/holding/operator/distributor/reseller/unknown");
  });

  it("requires a founder and shareholder sweep when brand-level UBO is not confirmed", () => {
    const prompt = buildResearchPrompt("Find all founders behind Example Brand if UBO is not confirmed.");

    expect(prompt).toContain("If brand-level UBO unknown, enumerate founders/shareholders/beneficial owners");
    expect(prompt).toContain("do not stop at first legal entity");
    expect(prompt).toContain("Entity map");
  });

  it("requires autonomous pivots when the direct ownership path is weak or negative", () => {
    const prompt = buildResearchPrompt("Find a connection between Company A and Company B at ownership level.");

    expect(prompt).toContain("If ownership/UBO weak/negative/inconclusive, pivot");
    expect(prompt).toContain("historical lineage");
    expect(prompt).toContain("distributors/partners/offices");
    expect(prompt).toContain("public employee overlaps");
    expect(prompt).toContain("domains/redirects/archives/press/events/product lineage");
  });

  it("requires a hypothesis ledger instead of making the user suggest every next step", () => {
    const prompt = buildResearchPrompt("Prove the corporate relationship between two example brands.");

    expect(prompt).toContain("Hypothesis ledger");
    expect(prompt).toContain("tested/supported/refuted/unknown");
    expect(prompt).toContain("no permission-to-continue questions");
    expect(prompt).toContain("Pivots executed");
  });

  it("rejects unsafe methods but continues with safe public-source substitutes", () => {
    const prompt = buildResearchPrompt("Use private contacts and grey OSINT to connect two companies.");

    expect(prompt).toContain("Refuse unsafe methods only");
    expect(prompt).toContain("continue with public sources");
    expect(prompt).toContain("no external writes");
  });

  it("defines a long autonomous research budget and prevents early continuation questions", () => {
    const prompt = buildResearchPrompt("Find public links between two companies.", {
      timeBudgetMs: 3_600_000
    });

    expect(prompt).toContain("Budget 60 min");
    expect(prompt).toContain("no permission-to-continue questions");
    expect(prompt).toContain("progress updates");
  });

  it("requires explicit stopping criteria before producing a final answer", () => {
    const prompt = buildResearchPrompt("Research a complex public relationship.");

    expect(prompt).toContain("stop after pivots tested");
    expect(prompt).toContain("evidence converges");
    expect(prompt).toContain("unsafe data required");
    expect(prompt).toContain("primary source answers");
  });

  it("keeps the backend research query under the Searcharvester limit", () => {
    const prompt = buildResearchPrompt(
      [
        "Эти компании 100% связаны. Я это знаю. Я в них работаю.",
        "Твоя задача найти в публичных данных 100% связей, которые соединяют эти компании.",
        "В целом наша задача в компаниях сделать так, чтобы в интернете не было упоминаний об этом.",
        "Поэтому я хочу найти все упоминания об этом.",
        "1. https://www.travelline.ru/",
        "2. https://exely.com/"
      ].join(" ")
    );

    expect(prompt.length).toBeLessThanOrEqual(2000);
  });
});
