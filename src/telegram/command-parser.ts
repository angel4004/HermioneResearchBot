export type ResearchCommandParseResult =
  | { ok: true; question: string }
  | { ok: false; reason: "missing_question" };

export type ContinueCommandParseResult = { ok: true; focus?: string | undefined };

export function parseResearchCommand(text: string): ResearchCommandParseResult {
  const argument = parseCommandArgument(text, "research");
  if (!argument) {
    return { ok: false, reason: "missing_question" };
  }
  return { ok: true, question: argument };
}

export function parseContinueCommand(text: string): ContinueCommandParseResult {
  const focus = parseCommandArgument(text, "continue");
  return focus ? { ok: true, focus } : { ok: true, focus: undefined };
}

function parseCommandArgument(text: string, command: string): string | undefined {
  const match = text.match(new RegExp(`^/${command}(?:@[A-Za-z0-9_]+)?(?:\\s+([\\s\\S]*))?$`, "u"));
  const argument = match?.[1]?.trim();
  return argument || undefined;
}
