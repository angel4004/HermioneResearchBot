# HermioneResearchBot Architecture

HermioneResearchBot is a separate Node.js + TypeScript Telegram runtime for web research.

## Runtime Boundaries

- Telegram UX lives in this repository.
- Searcharvester is a neighboring HTTP backend and is not vendored into this repository.
- Final reports belong to Hermione and are stored indefinitely in `data/reports`.
- Runtime session state is stored in `data/sessions.json` by default.
- Active research jobs may store Telegram chat id metadata so Hermione can deliver the final report after a runtime restart.
- `data/`, `.env`, tokens, sessions, job outputs and private reports must not be committed.

## Main Modules

- `src/config/*` loads and validates environment configuration.
- `src/guards/runtime-target.ts` blocks reserved Salamander/OpenClaw targets.
- `src/telegram/*` wires grammY commands, allowlist checks, parsing and chunking.
- `src/research/*` defines the backend contract, research policy prompt and Searcharvester HTTP adapter.
- `src/storage/*` persists session state and markdown reports.
- `src/jobs/*` owns the active-job lifecycle, polling, cancellation and timeout behavior.

## Job Flow

1. `/research <question>` or a plain text message validates the Telegram user through the allowlist.
2. Hermione creates a Searcharvester research job through `SEARCHARVESTER_URL`.
3. Before sending the question to the backend, Hermione wraps it with the research policy prompt from `src/research/policy.ts`.
4. Hermione stores active job metadata in the session store.
5. Polling reads backend status until completion, failure, cancellation or timeout.
6. The research quality gate checks completed markdown before user delivery.
7. If the report is incomplete and auto-continuations remain, Hermione starts a continuation job instead of sending a premature final answer.
8. Hermione post-processes final markdown into a brief, source list and unresolved gaps when the backend did not provide structured metadata.
9. Final markdown is saved to `REPORT_OUTPUT_DIR`.
10. The report is sent to Telegram in chunks when it is small enough for direct delivery.

## Restart Resume

On runtime startup, Hermione checks `data/sessions.json` for an active job with Telegram chat metadata.

- If such a job exists, Hermione sends a short resume notice to that chat.
- It then resumes polling the backend and delivers the final report or failure message.
- If an older active job has no chat metadata, Hermione leaves it visible through `/status` but does not guess where to send the result.

## Research Quality Gate

The first runtime quality gate is intentionally conservative. It blocks common premature endings before Telegram delivery:

- permission-to-continue phrasing such as "if you want, I can continue";
- reports that leave an obvious safe public-source pivot in `Caveats` or `Next action` instead of executing it;
- reports that have an `Evidence` section but no explicit source links;
- missing `Hypothesis ledger`;
- missing `Pivots executed`;
- missing `Evidence`;
- missing `Caveats`.

Config:

```env
RESEARCH_QUALITY_GATE_ENABLED=true
RESEARCH_MAX_AUTO_CONTINUATIONS=4
```

This is a Phase 4 slice implemented before production deploy because Telegram testing showed that prompt-only guidance was not enough.

## Telegram Free-Text Research

Hermione supports a command-first and free-text UX:

- `/research <question>` explicitly starts a job;
- a normal non-command text message also starts a job when `TELEGRAM_FREE_TEXT_RESEARCH_ENABLED=true`;
- command-like text that starts with `/` is not treated as free-text research.

This matches real Telegram testing, where long research prompts are usually sent as normal messages instead of command arguments.

## Report Post-Processing

Hermione analyzes completed markdown reports before storing job metadata:

- `## Verdict` or `## TL;DR` becomes the stored `reportBrief` when present.
- Markdown links and bare URLs become `sources`, deduplicated by URL.
- `## Caveats` and `## Next action` lines with unresolved language become `unresolvedGaps`.

Telegram commands:

- `/sources` sends the sources for the last completed report.
- `/brief` sends the stored brief and unresolved gaps for the last completed report.

## Report Index

`ReportStore` maintains `data/reports/index.json` alongside markdown reports.

- Each saved report adds or updates an index entry keyed by job id.
- `/history` reads the newest entries from this index.
- The index is runtime state under `data/` and must not be committed.

## Diagnostics

`/diagnostics` returns non-secret runtime state:

- app id and non-secret backend URL;
- quality gate and free-text settings;
- active job id/status/continuation count;
- last completed job id/status/source count/gap count/report path.

It intentionally does not print Telegram tokens, allowlisted user ids, env file content, or other secrets.

## Salamander/OpenClaw Separation

The following targets are reserved and blocked by runtime/deploy guards:

```text
path: /opt/openclaw-paf-auditor
env: /opt/openclaw-paf-auditor/.env
service: openclaw-paf-auditor.service
```

Production target values for Hermione are not facts until Ilya confirms them.
