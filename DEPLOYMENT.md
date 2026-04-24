# HermioneResearchBot Deployment

Этот документ фиксирует правила деплоя HermioneResearchBot, чтобы не смешать ее с Salamander/OpenClaw контуром.

## Критичное разделение

HermioneResearchBot и Salamander живут как отдельные проекты.

Даже если они размещаются на одном сервере, у них должны быть разные:

- Git repositories;
- server checkouts;
- env-файлы;
- service/process names;
- runtime state;
- logs;
- smoke tests.

Salamander - ИИ-агент/контур сравнения оригинального PAF и Git-состояния. HermioneResearchBot - Telegram-сервис для глубоких web research-задач.

## Known Shared Server Context

Из существующего Salamander/OpenClaw runbook известен общий host:

```text
server: 95.140.154.13
ssh user: root
```

Зарезервировано за существующим Salamander/OpenClaw контуром:

```text
path: /opt/openclaw-paf-auditor
env: /opt/openclaw-paf-auditor/.env
service: openclaw-paf-auditor.service
```

Не деплой HermioneResearchBot в эти path/env/service без явного решения Ильи изменить существующий Salamander/OpenClaw runtime.

## Hermione Production Target

Пока не подтверждено Ильей как факт.

Перед первым deploy нужно получить или подтвердить:

- production path;
- env path;
- service name;
- Git remote и branch;
- способ доставки кода;
- Node/runtime version;
- Searcharvester URL и способ запуска соседнего сервиса;
- smoke test.

Рабочее предложение по умолчанию, только после подтверждения Ильи:

```text
path: /opt/hermione-research-bot
env: /opt/hermione-research-bot/.env
service: hermione-research-bot.service
branch: main
```

## Preflight Before Remote Changes

Перед любым remote write-действием:

1. Получить явное подтверждение Ильи на deploy/restart.
2. Проверить, что текущий локальный проект - HermioneResearchBot, а не Salamander/OpenClaw.
3. Проверить, что target path не равен `/opt/openclaw-paf-auditor`.
4. Проверить, что service name не равен `openclaw-paf-auditor.service`.
5. Проверить, что Git remote указывает на `https://github.com/angel4004/HermioneResearchBot.git`.
6. Проверить, что `.env` не коммитится и хранится только на сервере/secret storage.
7. Проверить доступность Searcharvester или явно зафиксировать, что он еще не подключен.

Локальный guard для проверки target:

```bash
HERMIONE_WORKING_DIRECTORY=/opt/hermione-research-bot \
HERMIONE_ENV_PATH=/opt/hermione-research-bot/.env \
HERMIONE_SERVICE_NAME=hermione-research-bot.service \
TELEGRAM_BOT_TOKEN=placeholder \
ALLOWED_TELEGRAM_USER_IDS=1 \
SEARCHARVESTER_URL=http://127.0.0.1:8000 \
npm run validate:deploy-target
```

Reserved Salamander/OpenClaw values must fail this preflight:

```text
HERMIONE_WORKING_DIRECTORY=/opt/openclaw-paf-auditor
HERMIONE_ENV_PATH=/opt/openclaw-paf-auditor/.env
HERMIONE_SERVICE_NAME=openclaw-paf-auditor.service
```

## Deploy With Git

Использовать только если production checkout уже является Git-репозиторием HermioneResearchBot с настроенным `origin`.

Шаблон команд. Перед выполнением заменить placeholders на подтвержденные значения:

```bash
ssh root@95.140.154.13
cd /opt/hermione-research-bot
git fetch origin main
git pull --ff-only origin main
npm install
npm run build
systemctl --user restart hermione-research-bot.service
systemctl --user status hermione-research-bot.service --no-pager
journalctl --user -u hermione-research-bot.service -n 80 --no-pager
```

Если production dependencies и lockfile уже стабилизированы, можно заменить `npm install` на `npm ci`, но только после проверки package manager policy проекта.

## Deploy Without Git

Использовать только для начального bootstrap или если Git checkout на сервере еще не готов.

Не копировать на сервер:

- `.env`;
- `node_modules/`;
- `dist/`;
- локальные sessions/state;
- job outputs;
- private research reports;
- editor/cache files.

После синхронизации:

```bash
ssh root@95.140.154.13
cd /opt/hermione-research-bot
npm install
npm run build
systemctl --user restart hermione-research-bot.service
systemctl --user status hermione-research-bot.service --no-pager
journalctl --user -u hermione-research-bot.service -n 80 --no-pager
```

## Expected Environment

Точный список env нужно держать в `.env.example` после появления runtime. Базово ожидаются:

```env
TELEGRAM_BOT_TOKEN=
ALLOWED_TELEGRAM_USER_IDS=
HERMIONE_ENV_PATH=/opt/hermione-research-bot/.env
HERMIONE_SERVICE_NAME=hermione-research-bot.service
SESSION_FILE_PATH=data/sessions.json
SEARCHARVESTER_URL=http://127.0.0.1:8000
RESEARCH_DEFAULT_TIMEOUT_SECONDS=3600
RESEARCH_POLL_INTERVAL_SECONDS=5
RESEARCH_MAX_PARALLEL_JOBS=1
RESEARCH_QUALITY_GATE_ENABLED=true
RESEARCH_MAX_AUTO_CONTINUATIONS=4
TELEGRAM_FREE_TEXT_RESEARCH_ENABLED=true
TELEGRAM_MESSAGE_CHUNK_LIMIT=3900
TELEGRAM_MAX_DIRECT_REPORT_CHARS=12000
REPORT_OUTPUT_DIR=data/reports
```

Если используются OpenAI-compatible модели или иной model backend, секреты должны жить только в `.env`/secret storage и не попадать в Git.

## Report Storage

Финальные research-отчеты Hermione хранит бессрочно в `data/reports`.

`data/` не должен попадать в Git. В эту директорию также не должны коммититься:

- sessions;
- job state;
- source snapshots;
- локальные research outputs;
- приватные отчеты.

Searcharvester может иметь собственные временные job/cache/runtime файлы, но они не являются основным архивом пользовательских исследований Hermione.

## Searcharvester Dependency

Searcharvester должен быть соседним сервисом, а не vendor-копией внутри Hermione.

Перед production use нужно явно закрепить:

- Docker image tag/digest, commit checkout или fork;
- exposed local URL;
- resource limits;
- timeout policy;
- logging;
- restart policy;
- auth/TLS/rate limiting, если сервис будет доступен не только локально.

Не описывай Searcharvester как полноценную per-task sandbox-изоляцию без новой проверки реализации.

## Smoke Test

После restart проверить:

```text
/start
/research коротко сравни 2-3 надежных источника о текущем состоянии SearXNG как self-hosted метапоиска
/status
```

Ожидаемый результат:

- бот быстро подтверждает прием research-задачи;
- Telegram polling не блокируется;
- `/status` показывает активную фазу;
- финальный ответ отделяет выводы от evidence;
- в отчете есть ссылки на источники;
- ошибки Searcharvester/модели явно видны в логах и понятны пользователю.

## Rollback

До стабилизации production процесса использовать простой rollback:

```bash
ssh root@95.140.154.13
cd /opt/hermione-research-bot
git log --oneline -n 5
git checkout <known-good-commit>
npm install
npm run build
systemctl --user restart hermione-research-bot.service
journalctl --user -u hermione-research-bot.service -n 80 --no-pager
```

Не использовать rollback-команды против `/opt/openclaw-paf-auditor`, если задача относится к Hermione.

## Not Yet Decided

- Точный production path Hermione.
- Точное имя systemd unit.
- Нужен ли `npm ci` вместо `npm install`.
- Как именно закреплять Searcharvester: image digest, commit checkout или fork.
- Нужен ли отдельный user вместо `root`.
- Формат хранения long-running job state.
