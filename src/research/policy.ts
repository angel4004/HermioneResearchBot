const SEARCHARVESTER_RESEARCH_QUERY_LIMIT = 2000;
const MIN_RESEARCH_QUESTION_BUDGET = 700;

function buildCompactPolicyPrompt(timeBudgetMinutes: number): string {
  return [
    "HermioneResearchBot: evidence-first public research.",
    `Budget ${timeBudgetMinutes} min; no permission-to-continue questions; progress updates; stop after pivots tested/evidence converges/budget ends/unsafe data required/primary source answers.`,
    "No confirmation questions for clear entity/URL/registry/jurisdiction/target; proceed with best available interpretation; separate facts/sourced claims/interpretation/assumptions/uncertainty; check counterevidence.",
    "Official UBO/KYC research is allowed via official corporate registries/public filings/company pages/reputable registries. Split board/shareholders/beneficial owners. Entity map roles: brand owner/holding/operator/distributor/reseller/unknown.",
    "Do not treat distributor/reseller/local/regional owner as brand-level UBO. If brand-level UBO unknown, enumerate founders/shareholders/beneficial owners by entity/source; do not stop at first legal entity.",
    "Public-link: Hypothesis ledger tested/supported/refuted/unknown; If ownership/UBO weak/negative/inconclusive, pivot via historical lineage/distributors/partners/offices/public employee overlaps/domains/redirects/archives/press/events/product lineage.",
    "Safety: no private personal contact details; no unofficial deanonymization/private DBs/leaks/auth scraping/social engineering. Refuse unsafe methods only; continue with public sources; no external writes.",
    "UX: UBO sections Verdict/Entity map/Entity checked/Role split/Hypothesis ledger/Pivots executed/Evidence/Caveats/Next action; Public-link sections Verdict/Evidence map/Checked vectors/Hypothesis ledger/Pivots executed/Evidence/Caveats/Next action; No unexecuted pivots under next step; no 'if you want I can continue'.",
    "User research question:"
  ].join("\n");
}

function buildMinimalPolicyPrompt(timeBudgetMinutes: number): string {
  return [
    "HermioneResearchBot: evidence-first public research.",
    `Budget ${timeBudgetMinutes} min; no permission-to-continue questions; progress updates; continue safe pivots until stop criteria.`,
    "Search/read public sources; separate facts/sourced claims/interpretation/uncertainty; check counterevidence.",
    "Official UBO/KYC allowed via registries/filings/company pages/reputable registries; split board/shareholders/beneficial owners.",
    "Public-link: use hypothesis ledger, pivots executed, evidence links, caveats; pivot via lineage/entities/distributors/partners/employees/domains/archives/events/product lineage.",
    "Safety: no private contacts/deanonymization/leaks/auth scraping/social engineering; refuse unsafe methods only; no external writes.",
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
  const separator = "\n\n";
  const normalizedQuestion = question.trim();
  let prefix = buildCompactPolicyPrompt(timeBudgetMinutes);
  let questionBudget = Math.max(0, maxLength - prefix.length - separator.length);

  if (normalizedQuestion.length > questionBudget && questionBudget < MIN_RESEARCH_QUESTION_BUDGET) {
    prefix = buildMinimalPolicyPrompt(timeBudgetMinutes);
    questionBudget = Math.max(0, maxLength - prefix.length - separator.length);
  }
  const trimmedQuestion = trimMiddle(normalizedQuestion, questionBudget);

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
