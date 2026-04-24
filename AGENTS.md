# AGENTS.md

Обращайся к пользователю: Илья.

## Назначение проекта

Эта папка является отдельным Codex-проектом для `HermioneResearchBot`.

- local path: `C:\Users\ilya.suvorov\Projects\Work\TravelLine\HermioneResearchBot`;
- repository URL: `https://github.com/angel4004/HermioneResearchBot.git`;
- продуктовая роль: Telegram-сервис для глубоких профессиональных web research-задач;
- подробный продуктовый контекст: `HERMIONE_RESEARCH_BOT_CONTEXT.md`;
- подробные исходные agent-инструкции: `REFERENCE_AGENT_CONTEXT.md`;
- продуктовая дорожная карта и результат саморевью плана: `docs/ROADMAP.md`;
- deploy/runbook: `DEPLOYMENT.md`.

Гермиона не является PAF/CPO-аудитором, coding-агентом общего назначения или универсальным чат-ботом. Ее основной режим - исследование: план, поиск, чтение источников, проверка, контрдоказательства, вывод и отчет.

## Разделение Hermione и Salamander

Salamander - отдельный ИИ-агент/контур, который сравнивает оригинальный PAF и Git-состояние. Он может жить на том же сервере, что и Hermione, но это не делает их одним проектом.

У HermioneResearchBot и Salamander должны оставаться раздельными:

- Git repositories;
- локальные repositories/checkouts на сервере;
- рабочие папки в Codex;
- env-файлы;
- service/process names;
- deploy-команды;
- smoke tests;
- runtime state и outputs.

Не деплой Hermione поверх Salamander/OpenClaw runtime. Не используй Salamander как deployment target без конкретных технических параметров.

## Что известно про общий сервер

Из существующего Salamander/OpenClaw runbook известен общий production host:

- server: `95.140.154.13`;
- ssh user: `root`;
- существующий Salamander/OpenClaw path: `/opt/openclaw-paf-auditor`;
- существующий Salamander/OpenClaw env: `/opt/openclaw-paf-auditor/.env`;
- существующий Salamander/OpenClaw service: `openclaw-paf-auditor.service`.

Эти Salamander/OpenClaw path/env/service зарезервированы за существующим контуром. Не используй их для Hermione.

Для Hermione production target пока должен считаться незафиксированным, пока Илья явно не подтвердит:

- production path;
- env path;
- service name;
- способ доставки кода;
- smoke test.

Рабочее предложение по умолчанию, если Илья подтвердит: `/opt/hermione-research-bot`, `/opt/hermione-research-bot/.env`, `hermione-research-bot.service`. Не выдавай это за уже существующий факт.

## Архитектурное направление

Базовый инкремент:

- отдельный Git-репозиторий HermioneResearchBot;
- Telegram runtime в репозитории Hermione;
- `SOUL.md`/system prompt только для research-поведения;
- Searcharvester как соседний локальный HTTP-сервис;
- явный Hermione adapter/client для Searcharvester API;
- конфиг `SEARCHARVESTER_URL`;
- асинхронные Telegram-команды `/research`, `/status`, `/cancel`, `/continue`, `/settings`;
- отчеты в Telegram-friendly формате и/или markdown export.

Не копируй код Searcharvester внутрь Hermione на старте. Закрепляй Searcharvester через Docker image tag/digest, commit или отдельный checkout. Учитывай, что изученная версия Searcharvester запускает `hermes acp` как subprocess внутри контейнера `tavily-adapter`, а не как отдельный ephemeral container на задачу.

## Research contract

Для research-задач Hermione работает по принципу "сначала доказательства":

- не отвечать из памяти на исследовательские вопросы;
- сначала искать и читать источники;
- отделять факты, source-backed claims, интерпретации, допущения и рекомендации;
- намеренно искать контрдоказательства;
- важные числа, даты, имена и причинно-следственные утверждения проверять минимум через два независимых домена, если возможно;
- предпочитать первичные источники, официальную документацию, стандарты, filings, научные статьи и надежные публикации;
- явно показывать неопределенность и конфликты источников;
- не выполнять внешние write-действия;
- не собирать приватные или чувствительные персональные данные сверх легитимного публичного профессионального контекста.

## Git и файлы

- Эта папка может пока не быть Git-репозиторием. Не делай `git clone` поверх непустой папки.
- Если нужно подключить GitHub repo, сначала проверь содержимое папки и предложи безопасный путь: `git init`, `git remote add origin`, сверка файлов, pull/merge strategy.
- Не делай commit, push или PR без явного запроса Ильи.
- Не коммить `.env`, secrets, Telegram tokens, API keys, локальные сессии, job outputs и приватные research-отчеты.
- Не перетирай файлы `REFERENCE_AGENT_CONTEXT.md` и `HERMIONE_RESEARCH_BOT_CONTEXT.md`; они содержат переносимый контекст проекта.

## Проверки

Пока каркас кода может отсутствовать, поэтому проверки зависят от фактического стека. После появления Node/TypeScript runtime ожидаемые проверки:

```bash
npm run check
npm run build
npm test
```

Если проверка не запускалась, явно укажи причину и остаточный риск.

## Документация

Поддерживай разноуровневую документацию:

- `AGENTS.md` - краткие инструкции для Codex;
- `HERMIONE_RESEARCH_BOT_CONTEXT.md` - переносимый продуктовый и архитектурный контекст;
- `docs/ROADMAP.md` - продуктовая дорожная карта, phased scope и self-review плана;
- `DEPLOYMENT.md` - deploy/runbook и правила разделения с Salamander;
- будущий `README.md` - пользовательский и developer quick start;
- будущие `docs/ARCHITECTURE.md` и `docs/RESEARCH_POLICY.md` - подробные темы.

Не добавляй новые docs без причины, если существующий документ подходит.

## Общие правила работы

- Отвечай Илье на русском.
- Делай минимально достаточный diff.
- Не трогай unrelated files.
- Учитывай legacy и DevEx-принципы.
- Не выдумывай production topology, env, secrets или уже существующие сервисы.
- Если задача затрагивает auth, permissions, privacy/compliance, secrets, production dependencies или external write-действия, сначала запроси явное подтверждение Ильи.
