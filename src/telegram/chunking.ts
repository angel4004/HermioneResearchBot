export function splitTelegramMessage(text: string, limit: number): string[] {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("Telegram chunk limit must be a positive integer");
  }

  if (text.length <= limit) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > limit) {
    const splitAt = findSplitIndex(remaining, limit);
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

function findSplitIndex(text: string, limit: number): number {
  const candidate = text.slice(0, limit + 1);
  const paragraphBreak = candidate.lastIndexOf("\n\n");
  if (paragraphBreak > 0) {
    return paragraphBreak;
  }

  const lineBreak = candidate.lastIndexOf("\n");
  if (lineBreak > 0) {
    return lineBreak;
  }

  const space = candidate.lastIndexOf(" ");
  if (space > 0) {
    return space;
  }

  return limit;
}
