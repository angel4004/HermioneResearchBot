import type { ResearchSource } from "./types.js";

export interface ResearchReportAnalysis {
  brief?: string | undefined;
  sources: ResearchSource[];
  unresolvedGaps: string[];
}

const sectionHeadingPattern = /^#{1,6}\s+(.+?)\s*$/gmu;

export function analyzeResearchReport(markdown: string): ResearchReportAnalysis {
  return {
    brief: extractBrief(markdown),
    sources: extractSources(markdown),
    unresolvedGaps: extractUnresolvedGaps(markdown)
  };
}

function extractBrief(markdown: string): string | undefined {
  const verdict = extractSection(markdown, "Verdict") ?? extractSection(markdown, "TL;DR");
  const source = verdict ?? markdown;
  return firstMeaningfulLines(source, 4);
}

function extractSources(markdown: string): ResearchSource[] {
  const sources = new Map<string, ResearchSource>();

  for (const match of markdown.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/giu)) {
    const title = cleanText(match[1] ?? "");
    const url = normalizeUrl(match[2] ?? "");
    if (url && !sources.has(url)) {
      sources.set(url, title ? { url, title } : { url });
    }
  }

  for (const match of markdown.matchAll(/https?:\/\/[^\s)]+/giu)) {
    const url = normalizeUrl(match[0]);
    if (url && !sources.has(url)) {
      sources.set(url, { url });
    }
  }

  return [...sources.values()];
}

function extractUnresolvedGaps(markdown: string): string[] {
  const sections = [extractSection(markdown, "Caveats"), extractSection(markdown, "Next action")].filter(
    (section): section is string => section !== undefined
  );
  const gaps: string[] = [];

  for (const section of sections) {
    for (const line of section.split(/\r?\n/u)) {
      const cleaned = cleanText(line.replace(/^\s*(?:[-*]|\d+[.)])\s*/u, ""));
      if (cleaned && isGapLike(cleaned) && !gaps.includes(cleaned)) {
        gaps.push(cleaned);
      }
    }
  }

  return gaps;
}

function extractSection(markdown: string, heading: string): string | undefined {
  const sections = [...markdown.matchAll(sectionHeadingPattern)];
  const targetHeading = heading.toLowerCase();

  for (let index = 0; index < sections.length; index += 1) {
    const match = sections[index];
    if (!match) {
      continue;
    }
    const title = cleanText(match[1] ?? "").toLowerCase();
    if (title !== targetHeading) {
      continue;
    }

    const start = (match.index ?? 0) + match[0].length;
    const next = sections[index + 1];
    const end = next?.index ?? markdown.length;
    const body = markdown.slice(start, end).trim();
    return body || undefined;
  }

  return undefined;
}

function firstMeaningfulLines(markdown: string, limit: number): string | undefined {
  const lines = markdown
    .split(/\r?\n/u)
    .map((line) => cleanText(line.replace(/^\s*(?:[-*]|\d+[.)])\s*/u, "")))
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("<!--"));
  const brief = lines.slice(0, limit).join("\n");
  return brief || undefined;
}

function isGapLike(text: string): boolean {
  return /not confirmed|not verified|not exhausted|unknown|unconfirmed|paid|login-only|requires|check|verify|не доказано|не подтвержден|не верифицирован|не (?:был[ао]? )?исчерпан|проверить|верифицировать|нужен|нужна|нужно/iu.test(
    text
  );
}

function normalizeUrl(url: string): string {
  return url.replace(/[)\].,;:]+$/gu, "").trim();
}

function cleanText(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}
