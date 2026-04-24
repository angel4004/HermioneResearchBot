import { describe, expect, it } from "vitest";

import {
  parseContinueCommand,
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
