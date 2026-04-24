import type { ResearchBackend } from "./backend.js";
import { ResearchBackendError } from "./errors.js";
import { buildResearchPrompt } from "./policy.js";
import type {
  ResearchJobHandle,
  ResearchJobSnapshot,
  ResearchJobStatus,
  ResearchSource,
  StartResearchInput
} from "./types.js";

type Fetch = typeof fetch;

export interface SearcharvesterClientOptions {
  baseUrl: string;
  fetchImpl?: Fetch | undefined;
  requestTimeoutMs?: number | undefined;
  researchTimeBudgetMs?: number | undefined;
}

export class SearcharvesterClient implements ResearchBackend {
  private readonly baseUrl: string;
  private readonly fetchImpl: Fetch;
  private readonly requestTimeoutMs: number;
  private readonly researchTimeBudgetMs: number;

  constructor(options: SearcharvesterClientOptions) {
    this.baseUrl = new URL(options.baseUrl).toString().replace(/\/$/u, "");
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
    this.researchTimeBudgetMs = options.researchTimeBudgetMs ?? 3_600_000;
  }

  async startResearch(input: StartResearchInput): Promise<ResearchJobHandle> {
    const payload = await this.requestJson<unknown>("/research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: buildResearchPrompt(input.question, {
          timeBudgetMs: this.researchTimeBudgetMs
        })
      })
    });
    const id = readStringField(payload, ["job_id", "jobId", "id"]);
    if (!id) {
      throw new ResearchBackendError("Searcharvester create-job response did not contain a job id");
    }
    return { id };
  }

  async getResearchJob(jobId: string): Promise<ResearchJobSnapshot> {
    const payload = await this.requestJson<unknown>(`/research/${encodeURIComponent(jobId)}`, {
      method: "GET"
    });

    return {
      id: readStringField(payload, ["job_id", "jobId", "id"]) ?? jobId,
      status: mapStatus(readStringField(payload, ["status"]) ?? "running"),
      phase: readStringField(payload, ["phase", "state", "stage"]),
      reportMarkdown: readStringField(payload, ["final_report", "report", "markdown"]) ?? readNestedReport(payload),
      errorMessage: readStringField(payload, ["error", "error_message", "message", "detail"]),
      sources: readSources(payload),
      unresolvedGaps: readStringArrayField(payload, ["unresolved_gaps", "unresolvedGaps", "gaps"])
    };
  }

  async cancelResearchJob(jobId: string): Promise<boolean> {
    const response = await this.request(`/research/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST"
    });

    if (response.status === 404 || response.status === 405 || response.status === 501) {
      return false;
    }

    if (!response.ok) {
      throw await toBackendError(response);
    }

    return true;
  }

  private async requestJson<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.request(path, init);
    if (!response.ok) {
      throw await toBackendError(response);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ResearchBackendError("Searcharvester returned invalid JSON");
    }
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      return await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new ResearchBackendError("Searcharvester request timed out", {
          userMessage: "Research backend request timed out."
        });
      }
      throw new ResearchBackendError(error instanceof Error ? error.message : "Searcharvester request failed");
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function toBackendError(response: Response): Promise<ResearchBackendError> {
  const detail = await readErrorDetail(response);
  return new ResearchBackendError(`Searcharvester request failed with ${response.status}: ${detail}`, {
    statusCode: response.status,
    userMessage: detail
  });
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as unknown;
    return readStringField(body, ["detail", "error", "message"]) ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

function mapStatus(status: string): ResearchJobStatus {
  const normalized = status.trim().toLowerCase();
  if (["queued", "pending", "created"].includes(normalized)) {
    return "queued";
  }
  if (["running", "processing", "in_progress", "started", "working"].includes(normalized)) {
    return "running";
  }
  if (["completed", "complete", "done", "success", "succeeded", "finished"].includes(normalized)) {
    return "completed";
  }
  if (["cancelled", "canceled"].includes(normalized)) {
    return "cancelled";
  }
  if (["failed", "error"].includes(normalized)) {
    return "failed";
  }
  return "running";
}

function readStringField(payload: unknown, keys: string[]): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function readStringArrayField(payload: unknown, keys: string[]): string[] | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  }
  return undefined;
}

function readNestedReport(payload: unknown): string | undefined {
  if (!isRecord(payload) || !isRecord(payload.result)) {
    return undefined;
  }
  return readStringField(payload.result, ["report", "markdown", "final_report"]);
}

function readSources(payload: unknown): ResearchSource[] | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }
  const value = payload.sources;
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map((item) => {
      if (typeof item === "string" && item.trim()) {
        return { url: item.trim() };
      }
      if (!isRecord(item) || typeof item.url !== "string" || !item.url.trim()) {
        return undefined;
      }
      const source: ResearchSource = { url: item.url.trim() };
      if (typeof item.title === "string" && item.title.trim()) {
        source.title = item.title.trim();
      }
      return source;
    })
    .filter((item): item is ResearchSource => item !== undefined);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
