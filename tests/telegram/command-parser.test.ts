import { describe, expect, it } from "vitest";

import {
  parseContinueCommand,
  parseFreeTextResearchQuestion,
  parseResearchCommand
} from "../../src/telegram/command-parser.js";

describe("parseResearchCommand", () => {
  it("extracts the question from /research", () => {
    expect(parseResearchCommand("/research compare SearXNG and Tavily")).toEqual({
      ok: true,
      question: "compare SearXNG and Tavily"
    });
  });

  it("supports Telegram bot mentions", () => {
    expect(parseResearchCommand("/research@HermioneBot   find primary sources")).toEqual({
      ok: true,
      question: "find primary sources"
    });
  });

  it("rejects an empty research question", () => {
    expect(parseResearchCommand("/research   ")).toEqual({
      ok: false,
      reason: "missing_question"
    });
  });
});

describe("parseContinueCommand", () => {
  it("allows /continue without extra focus", () => {
    expect(parseContinueCommand("/continue")).toEqual({
      ok: true,
      focus: undefined
    });
  });

  it("extracts optional focus from /continue", () => {
    expect(parseContinueCommand("/continue focus on license risk")).toEqual({
      ok: true,
      focus: "focus on license risk"
    });
  });
});

describe("parseFreeTextResearchQuestion", () => {
  it("treats normal Telegram text as a research question", () => {
    expect(parseFreeTextResearchQuestion("Найди публичные связи между TravelLine и Exely")).toEqual({
      ok: true,
      question: "Найди публичные связи между TravelLine и Exely"
    });
  });

  it("trims multiline free-text research questions", () => {
    expect(parseFreeTextResearchQuestion("  Найди связи\n1. https://a.example\n2. https://b.example  ")).toEqual({
      ok: true,
      question: "Найди связи\n1. https://a.example\n2. https://b.example"
    });
  });

  it("does not treat commands or empty text as free-text research", () => {
    expect(parseFreeTextResearchQuestion("/status")).toEqual({
      ok: false,
      reason: "not_free_text"
    });
    expect(parseFreeTextResearchQuestion("   ")).toEqual({
      ok: false,
      reason: "not_free_text"
    });
  });
});
