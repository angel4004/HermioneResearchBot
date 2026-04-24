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
    expect(prompt).toContain("board members, shareholders and beneficial owners");
  });

  it("keeps privacy boundaries for personal contacts and unofficial deanonymization", () => {
    const prompt = buildResearchPrompt("Find UBO for the example brand.");

    expect(prompt).toContain("Do not search for private personal contact details");
    expect(prompt).toContain("Do not use unofficial deanonymization");
    expect(prompt).toContain("If beneficial ownership is not publicly available, say so");
  });

  it("tells the backend to proceed without asking obvious confirmation questions", () => {
    const prompt = buildResearchPrompt("Find UBO for Example Brand, Example Operating Ltd, registry code 12345678.");

    expect(prompt).toContain("Do not ask for confirmation when the user already provided a concrete entity");
    expect(prompt).toContain("Proceed with the best available interpretation");
    expect(prompt).toContain("Do not end with offers like");
  });

  it("requires a compact due diligence card for corporate ownership answers", () => {
    const prompt = buildResearchPrompt("Find UBO for the example brand.");

    expect(prompt).toContain("For corporate ownership and UBO answers, use this UX shape");
    expect(prompt).toContain("Verdict");
    expect(prompt).toContain("Entity checked");
    expect(prompt).toContain("Role split");
    expect(prompt).toContain("Evidence");
    expect(prompt).toContain("Caveats");
  });

  it("requires a structured evidence-map UX for public link audits", () => {
    const prompt = buildResearchPrompt("Find all public links between Example A and Example B.");

    expect(prompt).toContain("For public-link, affiliation, lineage, and relationship audit answers, use this UX shape");
    expect(prompt).toContain("Evidence map");
    expect(prompt).toContain("Checked vectors");
    expect(prompt).toContain("Do not put unexecuted obvious pivots under 'next step'");
  });

  it("does not overclaim a local distributor owner as the brand-level UBO", () => {
    const prompt = buildResearchPrompt("Find the UBO of Example Brand. Example Local Operator Ltd may be a distributor.");

    expect(prompt).toContain("Do not call an owner of a distributor, reseller, local operator, or regional entity the brand-level UBO");
    expect(prompt).toContain("classify each legal entity as brand owner, global holding, operating company, distributor, reseller, or unknown");
  });

  it("requires a founder and shareholder sweep when brand-level UBO is not confirmed", () => {
    const prompt = buildResearchPrompt("Find all founders behind Example Brand if UBO is not confirmed.");

    expect(prompt).toContain("If the brand-level UBO is not confirmed, enumerate all found founders, shareholders, and beneficial owners");
    expect(prompt).toContain("Do not stop at the first matching legal entity");
    expect(prompt).toContain("Entity map");
  });

  it("requires autonomous pivots when the direct ownership path is weak or negative", () => {
    const prompt = buildResearchPrompt("Find a connection between Company A and Company B at ownership level.");

    expect(prompt).toContain("When the first direct ownership or UBO path is weak, negative, or inconclusive, autonomously pivot");
    expect(prompt).toContain("historical lineage");
    expect(prompt).toContain("distributors, resellers, partners, local offices");
    expect(prompt).toContain("public employee-role overlaps");
    expect(prompt).toContain("domains, redirects, archived pages, press releases, events, and product lineage");
  });

  it("requires a hypothesis ledger instead of making the user suggest every next step", () => {
    const prompt = buildResearchPrompt("Prove the corporate relationship between two example brands.");

    expect(prompt).toContain("Maintain a hypothesis ledger");
    expect(prompt).toContain("tested / supported / refuted / still unknown");
    expect(prompt).toContain("Do not ask the user to pick the next obvious research pivot");
    expect(prompt).toContain("Pivots executed");
  });

  it("rejects unsafe methods but continues with safe public-source substitutes", () => {
    const prompt = buildResearchPrompt("Use private contacts and grey OSINT to connect two companies.");

    expect(prompt).toContain("If the user asks for unsafe methods inside an otherwise valid research task");
    expect(prompt).toContain("briefly refuse only the unsafe methods");
    expect(prompt).toContain("continue the research using safe public-source substitutes");
  });

  it("defines a long autonomous research budget and prevents early continuation questions", () => {
    const prompt = buildResearchPrompt("Find public links between two companies.", {
      timeBudgetMs: 3_600_000
    });

    expect(prompt).toContain("Default autonomous research time budget: 60 minutes");
    expect(prompt).toContain("Do not ask the user for permission to continue before the time budget is exhausted");
    expect(prompt).toContain("Use progress updates instead of permission questions");
  });

  it("requires explicit stopping criteria before producing a final answer", () => {
    const prompt = buildResearchPrompt("Research a complex public relationship.");

    expect(prompt).toContain("Produce a final answer only when one of these stopping criteria is met");
    expect(prompt).toContain("all safe high-value pivot families were tested");
    expect(prompt).toContain("new public evidence no longer changes the conclusion");
    expect(prompt).toContain("the next meaningful path requires unsafe/private data");
  });
});
