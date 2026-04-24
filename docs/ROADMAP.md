# HermioneResearchBot Roadmap

Этот документ фиксирует продуктовую дорожную карту HermioneResearchBot после
саморевью плана. Это roadmap, а не детальный implementation plan. Перед
реализацией очередной фазы нужно писать отдельный file-level план и запускать
релевантные проверки.

## Status

- Дата фиксации: 2026-04-24.
- Git-репозиторий и baseline runtime созданы локально.
- Phase 0 + Phase 1 baseline реализованы локально.
- Дополнительно начат Phase 4 slice: Hermione-side research quality gate и auto-continuation.
- Дополнительно добавлен Telegram UX slice: обычное текстовое сообщение может
  запускать research-задачу, а auto-continuation сообщения стали
  пользовательскими, а не техническими.
- Дополнительно начат Phase 3 slice: active job хранит Telegram chat metadata,
  чтобы после restart Hermione могла продолжить polling и доставить результат.
- Дополнительно продолжен Phase 4 slice: финальные markdown-отчеты
  post-process-ятся в brief, sources и unresolved gaps; добавлены `/sources`
  и `/brief`.
- Дополнительно продолжен Phase 3 slice: добавлен `/diagnostics` с
  non-secret runtime state.
- Дополнительно начат Phase 6 slice: `data/reports/index.json` и `/history`.
- Commit, push, PR, remote deploy и restart требуют отдельного явного
  подтверждения Ильи.

## Self-review

### Что было хорошо в исходном плане

- План строится инкрементально: сначала безопасный baseline и рабочий Telegram
  product slice, затем production, reliability, research quality и backend
  independence.
- Hermione и Salamander/OpenClaw разделены не только словами, но и будущими
  runtime/deploy guards.
- Searcharvester остается заменяемым HTTP backend, а не частью кода Hermione.
- Результаты исследований принадлежат Hermione и сохраняются в ее `data/reports`.

### Что было уточнено после ревью

- Roadmap не должен смешиваться с implementation plan. Реализация каждой фазы
  должна иметь отдельный план с файлами, тестами и командами.
- Production target Hermione не считается фактом до явного подтверждения Ильи.
- Searcharvester под AGPL-3.0 не вендорится внутрь Hermione. Мы можем
  использовать его как отдельный сервис и брать архитектурные идеи, но не
  копировать код в репозиторий Hermione без отдельного решения.
- `data/` и `.env` должны быть запрещены к коммиту с первого bootstrap.
- В V1 Hermione не обязана иметь собственный LLM research engine. V1 управляет
  задачами, Telegram UX, хранением отчетов и вызывает Searcharvester через
  adapter.
- `/continue` в V1 может быть простым продолжением от последнего отчета и gaps.
  Более умная логика continuation относится к Research Quality Layer.

### Главные риски и как план их закрывает

- Риск перепутать Hermione и Salamander/OpenClaw: закрывается reserved targets,
  startup/deploy guards, отдельными env/service/state/logs и тестами.
- Риск AGPL-contamination: закрывается запретом vendor-копии Searcharvester в
  Hermione на старте.
- Риск потерять результаты исследований: закрывается тем, что Hermione
  сохраняет финальные отчеты бессрочно в `data/reports`.
- Риск застрять в большом scope: закрывается фазами и первым scope Phase 0 +
  Phase 1.

## Non-negotiable decisions

- Пользователь: Илья.
- Язык ответов Codex в этом проекте: русский.
- HermioneResearchBot - отдельный Telegram-сервис для глубоких web research-задач.
- Hermione не является PAF/CPO-аудитором, универсальным чат-ботом или coding
  агентом общего назначения.
- Salamander/OpenClaw - отдельный контур.
- Зарезервированные Salamander/OpenClaw targets:
  - path: `/opt/openclaw-paf-auditor`;
  - env: `/opt/openclaw-paf-auditor/.env`;
  - service: `openclaw-paf-auditor.service`.
- Hermione нельзя деплоить, запускать, писать state или rollback-ить через эти
  targets.
- Результаты исследований хранятся бессрочно в `data/reports`.
- `data/`, `.env`, токены, API keys, локальные sessions/state/job outputs и
  приватные research reports не коммитятся.
- Searcharvester не копируется внутрь Hermione на старте.
- Searcharvester подключается через `SEARCHARVESTER_URL` как соседний HTTP
  сервис.

## Architecture roles

### HermioneResearchBot

Hermione отвечает за продуктовый и пользовательский слой:

- Telegram UX;
- команды `/start`, `/research`, `/status`, `/cancel`, `/continue`,
  `/settings`;
- allowlist пользователей;
- job/session state;
- limits, timeouts, cancellation и status;
- сохранение финальных отчетов в `data/reports`;
- Telegram-friendly delivery: chunks и/или markdown file;
- `SOUL.md` и research-only policy;
- runtime/deploy guards против Salamander/OpenClaw targets;
- logs, crash handling и понятные user-facing errors;
- adapter interface к research backend.

### Searcharvester

Searcharvester отвечает за поисково-читающий backend:

- поиск через SearXNG;
- извлечение страниц в markdown;
- long-running `/research` job;
- status/events/snapshot/final report;
- временные job/cache/runtime files внутри своего сервиса.

Hermione не должна считать Searcharvester постоянной частью своей кодовой базы.
Backend должен быть заменяемым через adapter.

## Phase 0 - Product Safety Baseline

Цель: исключить смешение Hermione и Salamander/OpenClaw до появления runtime.

- Проверить, что текущая папка не содержит `.git` или подключить Git безопасно
  через `git init` и `remote add origin` только после отдельного решения.
- Зафиксировать `APP_ID=hermione-research-bot`.
- Добавить `.gitignore`:
  - `.env`;
  - `data/`;
  - `node_modules/`;
  - `dist/`;
  - локальные cache/session/report файлы.
- Добавить `.env.example` с безопасными example values.
- Добавить config validation.
- Добавить startup guard:
  - fail, если working directory равен `/opt/openclaw-paf-auditor`;
  - fail, если env path равен `/opt/openclaw-paf-auditor/.env`;
  - fail, если service name равен `openclaw-paf-auditor.service`.
- Добавить тесты на reserved Salamander/OpenClaw targets.
- Зафиксировать storage policy: `data/reports` хранится бессрочно, `data/` не
  коммитится.

Результат: Hermione нельзя случайно направить в Salamander/OpenClaw target.

## Phase 1 - Product V1: Telegram Research Bot

Цель: первый полноценный рабочий продукт.

- Node.js + TypeScript runtime.
- grammY Telegram bot.
- `SOUL.md` и research-only policy.
- Commands:
  - `/start`;
  - `/research <question>`;
  - `/status`;
  - `/cancel`;
  - `/continue`;
  - `/settings`.
- Free-text UX:
  - обычное non-command сообщение запускает research-задачу, если включен
    `TELEGRAM_FREE_TEXT_RESEARCH_ENABLED`;
  - `/research` остается явной командой и fallback.
- Searcharvester HTTP adapter:
  - create research job;
  - poll status;
  - read final report;
  - map backend errors/timeouts to clear user-facing messages.
- Job/session storage:
  - active job;
  - last completed job;
  - original question;
  - report path;
  - unresolved gaps, если удалось извлечь;
  - used sources metadata, если backend отдает.
- Reports:
  - save final markdown to `data/reports/*.md`;
  - keep reports indefinitely;
  - send report to Telegram in chunks and/or as markdown file.
- Limits:
  - one active job by default;
  - configurable timeout;
  - configurable poll interval;
  - Telegram message chunk limit;
  - max report size for direct message delivery.
- Tests:
  - command parsing;
  - allowlist;
  - config validation;
  - reserved target guards;
  - Searcharvester client behavior;
  - report storage;
  - chunking;
  - job lifecycle: queued, running, completed, failed, cancelled, timeout.
- Docs:
  - README quick start;
  - architecture overview;
  - research policy;
  - deployment preflight.

Результат: можно запускать реальные web research-задачи из Telegram и получать
сохраненный отчет.

## Phase 2 - Production Deployment

Цель: безопасно поставить Hermione на тот же сервер, не смешав с Salamander.

Перед этой фазой Илья должен явно подтвердить:

- production path;
- env path;
- service name;
- Git remote и branch;
- способ доставки кода;
- runtime version;
- Searcharvester URL и способ запуска соседнего сервиса;
- smoke test.

Рабочее предложение по умолчанию, не факт:

```text
path: /opt/hermione-research-bot
env: /opt/hermione-research-bot/.env
service: hermione-research-bot.service
branch: main
```

Работы фазы:

- Подготовить отдельный server checkout.
- Подготовить отдельный `.env` вне Git.
- Подготовить systemd unit для Hermione.
- Настроить отдельные logs, runtime state и report storage.
- Настроить Searcharvester как соседний сервис:
  - отдельный path;
  - отдельные volumes;
  - pinned version;
  - local-only URL;
  - resource limits;
  - restart policy.
- Выполнить smoke:
  - `/start`;
  - `/research коротко сравни 2-3 надежных источника о текущем состоянии SearXNG как self-hosted метапоиска`;
  - `/status`;
  - проверить отчет в `data/reports`.

Результат: Hermione работает на production-сервере как отдельный сервис рядом с
Salamander.

## Phase 3 - Reliability and Operations

Цель: чтобы бот жил долго и падения были понятны.

- Graceful shutdown.
- Resume active jobs after restart. Первый slice реализован локально:
  active job хранит Telegram chat id, startup runtime возобновляет polling и
  доставку результата, если chat id доступен.
- Stuck-job detection.
- Retry policy for temporary backend failures.
- Crash/error reports.
- Structured logs.
- Healthcheck endpoint or CLI health command.
- Disk usage visibility for `data/reports`.
- Manual cleanup/export scripts.
- Backup recommendation for reports.
- Rate limits and max parallel jobs.
- Admin-only diagnostics command.
  Первый локальный slice реализован как allowlist-protected `/diagnostics`
  без вывода secrets.

Результат: сервис можно сопровождать без ручного копания в случайных логах.

## Phase 4 - Research Quality Layer

Цель: улучшить качество результатов, а не только транспорт.

- Hermione-side quality gate над отчетом:
  - блокировать преждевременные "если хочешь, продолжу";
  - требовать `Hypothesis ledger`, `Pivots executed`, `Evidence`, `Caveats`;
  - автоматически запускать continuation job до лимита `RESEARCH_MAX_AUTO_CONTINUATIONS`;
  - отправлять пользователю progress update вместо permission-вопроса.
- Hermione post-processing над отчетом:
  - проверить наличие sources;
  - выделить TL;DR;
  - выделить unresolved gaps;
  - нормализовать формат.
- `/continue` строит следующий цикл из gaps и уже использованных sources.
- `/sources` показывает использованные источники. Первый slice реализован
  локально для последнего завершенного отчета.
- `/brief` отправляет summary. Первый slice реализован локально для последнего
  завершенного отчета и unresolved gaps.
- Confidence и uncertainty форматируются единообразно.
- Source quality policy:
  - primary sources предпочтительнее;
  - минимум два независимых домена для важных фактов, если возможно;
  - конфликт источников явно виден.

Результат: Hermione становится не только оболочкой над backend, а research-агентом
с собственным качественным контрактом.

## Phase 5 - Backend Independence

Цель: не зависеть навсегда от Searcharvester.

- Ввести внутренний интерфейс `ResearchBackend`.
- Реализовать `SearcharvesterBackend`.
- Добавить mock/local backend для тестов.
- Позже добавить альтернативный backend:
  - OpenAI Responses/Agents-based;
  - свой search/extract pipeline;
  - другой hosted/self-hosted research engine.
- Сравнить качество backend-ов на одинаковых benchmark-вопросах.

Результат: Searcharvester можно заменить без переписывания Telegram/runtime слоя.

## Phase 6 - Knowledge and Report Management

Цель: превратить отчеты в удобный архив.

- `/export` для markdown.
- `/history` последних исследований. Первый slice реализован локально.
- `/report <id>` повторно отправляет отчет.
- Индекс отчетов в `data/reports/index.json` или SQLite. Первый slice
  реализован как `data/reports/index.json`.
- Tags/title/slug для отчетов.
- Поиск по локальным отчетам.
- Продолжение исследования от конкретного прошлого отчета.

Результат: исследования не просто лежат файлами, а становятся личной базой
решений.

## Phase 7 - Multi-user / Team Mode

Только если понадобится.

- Несколько пользователей.
- Роли: owner/admin/user.
- Per-user quotas.
- Per-user report namespaces.
- Privacy boundaries.
- Shared reports.
- Audit log.

Результат: из личного бота можно сделать командный инструмент, но это отдельное
решение из-за privacy/permissions.

## Phase 8 - Security / Compliance Hardening

Нужно до любого корпоративного или публичного сценария.

- Secrets management.
- File permissions.
- Redaction sensitive data in logs.
- Auth/TLS/rate limiting для любых HTTP endpoints, если появятся.
- License review Searcharvester/AGPL.
- Dependency scanning.
- Update policy.
- Incident runbook.

Результат: Hermione можно безопаснее использовать не только как личный серверный
бот.

## First implementation handoff

Следующий чат должен начинать не со всего roadmap, а с Phase 0 + Phase 1.

Минимальный ожидаемый порядок:

1. Проверить `AGENTS.md`, `README.md`, `DEPLOYMENT.md`, этот roadmap и текущие
   файлы.
2. Проверить, является ли папка Git-репозиторием.
3. Если Git еще не подключен, предложить безопасный способ bootstrap.
4. Написать file-level implementation plan для Phase 0 + Phase 1.
5. После подтверждения Ильи реализовать runtime, tests и docs.
6. Не делать commit, push, PR, remote deploy или restart без отдельного явного
   подтверждения Ильи.
