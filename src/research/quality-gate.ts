export type QualityGateFindingCode =
  | "premature_continuation_offer"
  | "unexecuted_safe_pivot"
  | "missing_source_links"
  | "missing_hypothesis_ledger"
  | "missing_pivots_executed"
  | "missing_evidence"
  | "missing_caveats";

export interface QualityGateFinding {
  code: QualityGateFindingCode;
  message: string;
}

export interface QualityGateResult {
  passed: boolean;
  findings: QualityGateFinding[];
}

export interface BuildQualityContinuationQuestionInput {
  originalQuestion: string;
  previousReportMarkdown: string;
  findings: QualityGateFinding[];
}

const requiredSections: Array<{ code: QualityGateFindingCode; heading: string; message: string }> = [
  {
    code: "missing_hypothesis_ledger",
    heading: "Hypothesis ledger",
    message: "Report must show which relationship hypotheses were tested and their status."
  },
  {
    code: "missing_pivots_executed",
    heading: "Pivots executed",
    message: "Report must show which safe research pivots were executed before stopping."
  },
  {
    code: "missing_evidence",
    heading: "Evidence",
    message: "Report must include source-backed evidence."
  },
  {
    code: "missing_caveats",
    heading: "Caveats",
    message: "Report must include caveats, uncertainty, and remaining gaps."
  }
];

const continuationOfferPatterns = [
  /if you want[, ]+i (can|will|could) (continue|check|look|search|dig)/iu,
  /\bi can keep (researching|checking|looking|searching|digging)/iu,
  /\bnext step[:\s-]+i (will|can) (continue|check|look|search|dig)/iu,
  /если хочешь[, ]+я (могу|буду)? ?(продолжу|продолжить|проверю|проверить|поищу|поискать|добью|сделаю)/iu,
  /если хочешь[, ]+(продолжу|продолжить|проверю|проверить|поищу|поискать|добью|сделаю)/iu,
  /если нужно[, ]+я (могу|буду)? ?(продолжу|продолжить|проверю|проверить|поищу|поискать|добью|сделаю)/iu,
  /если нужно[, ]+(продолжу|продолжить|проверю|проверить|поищу|поискать|добью|сделаю)/iu,
  /могу следующим сообщением/iu,
  /(?:^|[^\p{L}\p{N}_])могу продолж(ать|ить)(?:$|[^\p{L}\p{N}_])/iu,
  /(?:^|[^\p{L}\p{N}_])я продолжу (искать|проверять|изучать|добивать|собирать)(?:$|[^\p{L}\p{N}_])/iu,
  /следующ(ий|им)\s+шагом?.{0,160}\b(продолжу|проверю|поищу|соберу|добью)\b/isu
];

const unfinishedSafePivotPatterns = [
  /(?:not|не|пока не).{0,120}(verified|exhausted|checked|confirmed|верифицирован[аоы]?|исчерпан[аоы]?|проверен[аоы]?|подтвержден[аоы]?).{0,160}(official registry|registry card|e-business register|äriregister|ariregister|archives?|wayback|historical domain|истори[яю]|официальн.{0,40}(реестр|карточк)|архив|travelline oü)/ius,
  /(official registry|registry card|e-business register|äriregister|ariregister|archives?|wayback|historical domain|истори[яю]|официальн.{0,40}(реестр|карточк)|архив|travelline oü).{0,160}(not|не|пока не).{0,120}(verified|exhausted|checked|confirmed|верифицирован[аоы]?|исчерпан[аоы]?|проверен[аоы]?|подтвержден[аоы]?)/ius
];

const nextActionSafePivotPattern =
  /^#{1,6}\s+Next action\s*$[\s\S]{0,700}(check|verify|проверить|верифицировать).{0,240}(official registry|registry card|e-business register|äriregister|ariregister|archives?|wayback|historical domain|истори[яю]|официальн.{0,40}(реестр|карточк)|архив|travelline oü)/imu;

const deferredSafePivotExclusionPattern = /after the next registry update|после следующ(его|ей) обновлен/iu;

export function evaluateResearchReport(markdown: string): QualityGateResult {
  const findings: QualityGateFinding[] = [];

  if (continuationOfferPatterns.some((pattern) => pattern.test(markdown))) {
    findings.push({
      code: "premature_continuation_offer",
      message:
        "Report asks for permission to continue or defers obvious pivots instead of executing safe pivots within the research budget."
    });
  }

  if (hasUnexecutedSafePivot(markdown)) {
    findings.push({
      code: "unexecuted_safe_pivot",
      message:
        "Report leaves an obvious safe public-source pivot unexecuted instead of continuing within the research budget."
    });
  }

  if (!hasSourceLink(markdown)) {
    findings.push({
      code: "missing_source_links",
      message: "Report must include source links, not only narrative evidence."
    });
  }

  for (const section of requiredSections) {
    if (!hasMarkdownHeading(markdown, section.heading)) {
      findings.push({
        code: section.code,
        message: section.message
      });
    }
  }

  return {
    passed: findings.length === 0,
    findings
  };
}

function hasUnexecutedSafePivot(markdown: string): boolean {
  if (deferredSafePivotExclusionPattern.test(markdown)) {
    return false;
  }

  return (
    unfinishedSafePivotPatterns.some((pattern) => pattern.test(markdown)) ||
    nextActionSafePivotPattern.test(markdown)
  );
}

export function buildQualityContinuationQuestion(input: BuildQualityContinuationQuestionInput): string {
  const findingLines = input.findings.map((finding) => `- ${finding.code}: ${finding.message}`).join("\n");
  const previousReportExcerpt = buildPreviousReportExcerpt(input.previousReportMarkdown);

  return [
    "Continue the same research task without asking the user for permission to continue.",
    "",
    `Original question: ${input.originalQuestion}`,
    "",
    "The previous report did not pass Hermione's research quality gate.",
    "Quality gate findings:",
    findingLines,
    "",
    "Required output for the continuation:",
    "- Hypothesis ledger with tested / supported / refuted / still unknown status.",
    "- Pivots executed across safe public-source pivot families.",
    "- Execute obvious safe public-source pivots that the previous report left in Caveats or Next action.",
    "- Evidence with source-backed claims and explicit source links.",
    "- Caveats and remaining uncertainty.",
    "- A final answer only if stopping criteria are met.",
    "",
    "Previous report:",
    previousReportExcerpt
  ].join("\n");
}

function buildPreviousReportExcerpt(markdown: string): string {
  const maxLength = 5000;
  if (markdown.length <= maxLength) {
    return markdown;
  }

  const edgeLength = Math.floor((maxLength - 40) / 2);
  return [
    markdown.slice(0, edgeLength),
    "",
    "[previous report middle truncated]",
    "",
    markdown.slice(-edgeLength)
  ].join("\n");
}

function hasSourceLink(markdown: string): boolean {
  return /https?:\/\/\S+/iu.test(markdown);
}

function hasMarkdownHeading(markdown: string, heading: string): boolean {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`^#{1,6}\\s+${escapedHeading}\\s*$`, "imu").test(markdown);
}
