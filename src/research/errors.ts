export class ResearchBackendError extends Error {
  readonly statusCode?: number | undefined;
  readonly userMessage: string;

  constructor(message: string, options: { statusCode?: number | undefined; userMessage?: string | undefined } = {}) {
    super(message);
    this.name = "ResearchBackendError";
    this.statusCode = options.statusCode;
    this.userMessage = options.userMessage ?? "Research backend failed. Check logs for details.";
  }
}
