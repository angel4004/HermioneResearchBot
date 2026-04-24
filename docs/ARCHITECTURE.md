# HermioneResearchBot Architecture

HermioneResearchBot is a separate Node.js + TypeScript Telegram runtime for web research.

## Runtime Boundaries

- Telegram UX lives in this repository.
- Searcharvester is a neighboring HTTP backend and is not vendored into this repository.
- Final reports belong to Hermione and are stored indefinitely in `data/reports`.
- Runtime session state is stored in `data/sessions.json` by default.
- `data/`, `.env`, tokens, sessions, job outputs and private reports must not be committed.

## Main Modules

- `src/config/*` loads and validates environment configuration.
- `src/guards/runtime-target.ts` blocks reserved Salamander/OpenClaw targets.
- `src/telegram/*` wires grammY commands, allowlist checks, parsing and chunking.
- `src/research/*` defines the backend contract, research policy prompt and Searcharvester HTTP adapter.
- `src/storage/*` persists session state and markdown reports.
- `src/jobs/*` owns the active-job lifecycle, polling, cancellation and timeout behavior.

## Job Flow

1. `/research <question>` validates the Telegram user through the allowlist.
2. Hermione creates a Searcharvester research job through `SEARCHARVESTER_URL`.
3. Before sending the question to the backend, Hermione wraps it with the research policy prompt from `src/research/policy.ts`.
4. Hermione stores active job metadata in the session store.
5. Polling reads backend status until completion, failure, cancellation or timeout.
6. Final markdown is saved to `REPORT_OUTPUT_DIR`.
7. The report is sent to Telegram in chunks when it is small enough for direct delivery.

## Salamander/OpenClaw Separation

The following targets are reserved and blocked by runtime/deploy guards:

```text
path: /opt/openclaw-paf-auditor
env: /opt/openclaw-paf-auditor/.env
service: openclaw-paf-auditor.service
```

Production target values for Hermione are not facts until Ilya confirms them.
