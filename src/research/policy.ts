const SEARCHARVESTER_RESEARCH_QUERY_LIMIT = 2000;

function buildCompactPolicyPrompt(timeBudgetMinutes: number): string {
  return [
    "HermioneResearchBot contract.",
    `Budget ${timeBudgetMinutes} min; no permission-to-continue questions; progress updates; stop after pivots tested/evidence converges/budget ends/unsafe data required/primary source answers.`,
    "Evidence-first: search/read public sources; separate facts/sourced claims/interpretation/assumptions/uncertainty; check counterevidence.",
    "No confirmation questions for clear entity/URL/registry/jurisdiction/target; proceed with best available interpretation.",
    "Official UBO/KYC research is allowed via legal entities, official corporate registries, public filings, company pages, reputable registries. Split board/shareholders/beneficial owners; Entity map roles: brand owner/holding/operator/distributor/reseller/unknown.",
    "Do not treat distributor/reseller/local/regional owner as brand-level UBO unless sourced. If brand-level UBO unknown, enumerate founders/shareholders/beneficial owners by entity/source; do not stop at first legal entity.",
    "Relationship/public-link: Hypothesis ledger tested/supported/refuted/unknown. If ownership/UBO weak/negative/inconclusive, pivot via historical lineage, entity map, distributors/partners/offices, public employee overlaps, domains/redirects/archives/press/events/product lineage.",
    "Safety: no private personal contact details, home addresses, private phones/emails/profiles; no unofficial deanonymization/private DBs/leaks/auth scraping/social engineering. Refuse unsafe methods only; continue with public sources; no external writes.",
    "UX: UBO sections Verdict/Entity map/Entity checked/Role split/Hypothesis ledger/Pivots executed/Evidence/Caveats/Next action. Public-link sections Verdict/Evidence map/Checked vectors/Hypothesis ledger/Pivots executed/Evidence/Caveats/Next action. No unexecuted pivots under next step; no 'if you want I can continue'.",
    "User research question:"
  ].join("\n");
}

export interface BuildResearchPromptOptions {
  timeBudgetMs?: number | undefined;
  maxLength?: number | undefined;
}

export function buildResearchPrompt(question: string, options: BuildResearchPromptOptions = {}): string {
  const timeBudgetMinutes = Math.max(1, Math.round((options.timeBudgetMs ?? 3_600_000) / 60_000));
  const maxLength = options.maxLength ?? SEARCHARVESTER_RESEARCH_QUERY_LIMIT;
  const prefix = buildCompactPolicyPrompt(timeBudgetMinutes);
  const separator = "\n\n";
  const questionBudget = Math.max(0, maxLength - prefix.length - separator.length);
  const trimmedQuestion = trimMiddle(question.trim(), questionBudget);

  return `${prefix}${separator}${trimmedQuestion}`;
}

function trimMiddle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  if (maxLength <= 0) {
    return "";
  }

  const marker = "\n[...truncated to fit backend query limit...]\n";
  if (maxLength <= marker.length) {
    return value.slice(0, maxLength);
  }

  const available = maxLength - marker.length;
  const headLength = Math.ceil(available * 0.6);
  const tailLength = available - headLength;

  return `${value.slice(0, headLength)}${marker}${value.slice(-tailLength)}`;
}
