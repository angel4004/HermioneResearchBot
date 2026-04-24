# HermioneResearchBot

HermioneResearchBot — отдельный Telegram-сервис для глубоких профессиональных web research-задач.

## Current Runtime

- Node.js + TypeScript.
- Telegram bot runtime: grammY.
- Research backend: neighboring Searcharvester HTTP service via `SEARCHARVESTER_URL`.
- Research quality gate: validates backend reports before sending them to Telegram.
- Auto-continuation: can start a follow-up backend job when a report stops too early.
- Restart resume: active Telegram jobs store chat metadata so delivery can continue after runtime restart.
- Final reports: `data/reports`.
- Session state: `data/sessions.json`.

## Start here

- `AGENTS.md` — главные инструкции для Codex в этом проекте.
- `DEPLOYMENT.md` — как деплоить Hermione и как не перепутать ее с Salamander/OpenClaw.
- `docs/ROADMAP.md` — зафиксированная продуктовая дорожная карта и результат саморевью плана.
- `docs/ARCHITECTURE.md` — текущая архитектура runtime.
- `docs/RESEARCH_POLICY.md` — research-only policy and report contract.
- `SOUL.md` — system behavior contract for Hermione.
- `HERMIONE_RESEARCH_BOT_CONTEXT.md` — переносимый продуктовый и архитектурный контекст.
- `REFERENCE_AGENT_CONTEXT.md` — подробный исходный agent-контекст.

## Local Quick Start

1. Install dependencies:

```bash
npm install
```

2. Prepare local env:

```bash
cp .env.example .env
```

3. Fill in local secrets and allowlist:

```env
TELEGRAM_BOT_TOKEN=
ALLOWED_TELEGRAM_USER_IDS=
SEARCHARVESTER_URL=http://127.0.0.1:8000
RESEARCH_QUALITY_GATE_ENABLED=true
RESEARCH_MAX_AUTO_CONTINUATIONS=4
TELEGRAM_FREE_TEXT_RESEARCH_ENABLED=true
```

4. Run checks:

```bash
npm run check
npm run build
npm test
```

5. Start bot locally:

```bash
npm run dev
```

Searcharvester must already be running as a neighboring HTTP service. Its code is not copied into this repository.

## Telegram Commands

- `/start` — show bot purpose and command list.
- `/research <question>` — start a research job.
- `/status` — show active or last completed job.
- `/cancel` — cancel active job locally and through backend when supported.
- `/continue` — continue from the last completed report and unresolved gaps.
- `/sources` — show sources extracted from the last completed report.
- `/brief` — show the stored brief and unresolved gaps from the last completed report.
- `/history` — show recent stored reports from `data/reports/index.json`.
- `/diagnostics` — show non-secret runtime diagnostics.
- `/settings` — show non-secret runtime limits.

Если `TELEGRAM_FREE_TEXT_RESEARCH_ENABLED=true`, обычное текстовое сообщение в Telegram тоже запускает research-задачу. Это основной UX для длинных исследовательских запросов; `/research` остается явной командой и fallback.

## Deploy

Деплой описан в `DEPLOYMENT.md`.

Критичное правило: Hermione может жить на том же сервере, что и Salamander, но должна иметь отдельные Git repository, server checkout, env, service name, logs, runtime state и smoke tests.

Не деплой Hermione в существующий Salamander/OpenClaw target:

```text
path: /opt/openclaw-paf-auditor
env: /opt/openclaw-paf-auditor/.env
service: openclaw-paf-auditor.service
```

Production target Hermione пока не подтвержден как факт. Рабочее предложение есть в `DEPLOYMENT.md`, но перед первым deploy его нужно подтвердить с Ильей.
