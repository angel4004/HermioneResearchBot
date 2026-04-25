import { describe, expect, it, vi } from "vitest";

import { SearcharvesterClient } from "../../src/research/searcharvester-client.js";
import { ResearchBackendError } from "../../src/research/errors.js";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init
  });
}

describe("SearcharvesterClient", () => {
  it("creates a research job", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ job_id: "job-1" }));
    const client = new SearcharvesterClient({
      baseUrl: "http://127.0.0.1:8000",
      fetchImpl,
      researchTimeBudgetMs: 3_600_000
    });

    await expect(client.startResearch({ question: "What changed in SearXNG?" })).resolves.toEqual({
      id: "job-1"
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/research",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("What changed in SearXNG?")
      })
    );
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    const requestBody = JSON.parse(calls[0]?.[1].body as string) as { query: string };
    expect(requestBody.query).toContain("Official UBO/KYC research is allowed");
    expect(requestBody.query).toContain("no private personal contact details");
    expect(requestBody.query).toContain("Budget 60 min");
    expect(requestBody.query.length).toBeLessThanOrEqual(2000);
  });

  it("maps completed backend status and report fields", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        job_id: "job-1",
        status: "done",
        final_report: "# Report",
        sources: [{ url: "https://example.com", title: "Example" }],
        unresolved_gaps: ["fresh benchmarks"]
      })
    );
    const client = new SearcharvesterClient({
      baseUrl: "http://127.0.0.1:8000/",
      fetchImpl
    });

    await expect(client.getResearchJob("job-1")).resolves.toEqual({
      id: "job-1",
      status: "completed",
      phase: undefined,
      reportMarkdown: "# Report",
      errorMessage: undefined,
      sources: [{ url: "https://example.com", title: "Example" }],
      unresolvedGaps: ["fresh benchmarks"]
    });
  });

  it("maps non-2xx responses to backend errors", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ detail: "backend failed" }, { status: 500 }));
    const client = new SearcharvesterClient({
      baseUrl: "http://127.0.0.1:8000",
      fetchImpl
    });

    await expect(client.startResearch({ question: "x" })).rejects.toThrow(ResearchBackendError);
    await expect(client.startResearch({ question: "x" })).rejects.toThrow(/backend failed/);
  });

  it("rejects malformed create-job responses", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ status: "queued" }));
    const client = new SearcharvesterClient({
      baseUrl: "http://127.0.0.1:8000",
      fetchImpl
    });

    await expect(client.startResearch({ question: "x" })).rejects.toThrow(/job id/);
  });
});
