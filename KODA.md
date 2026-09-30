# KODA.md — инструкционный контекст проекта

Этот файл описывает проект **Cozy Voice Chat** и служит справочным контекстом для дальнейшей работы над кодовой базой. Весь анализ и документ составлены на русском языке.

---

## Обзор проекта

**Cozy Voice Chat** — локальный P2P голосовой чат для созвонов по локальной сети (LAN). Голосовой трафик идёт напрямую между участниками через **WebRTC (PeerJS)**, что даёт минимальную задержку. Сигнализация и текстовый чат/обмен файлами обслуживаются собственным Node.js-сервером.

Ключевые возможности:

- Голосовые звонки 1-на-1 через P2P (WebRTC).
- Текстовый чат внутри звонка.
- Обмен файлами: файлы хранятся на машине хоста и удаляются после завершения звонка.
- Регулировка громкости собеседника, статусы mute / speaking.
- Демонстрация экрана (Screen Sharing).
- Кастомизация профиля (имя, аватар), тёмная и светлая темы, мобильный адаптив.
- HTTPS «из коробки» (нужен для Screen Sharing и PiP API).
- Базовая безопасность: rate limiting, CORS, helmet, валидация origins.

Проект — монорепозиторий из двух независимых приложений: `backend/` и `frontend/`. Корневой `package.json` содержит только метаданные (без workspace-скриптов).

Известные ограничения (из README):

- После смены имени/аватарки изменения не видны собеседнику до перезагрузки страницы (сигнал обновления профиля не реализован).
- Данные пользователя хранятся в `localStorage` браузера, на сервере не сохраняются.
- В разработке: виджет Picture-in-Picture с контролами звука.

---

## Технологический стек

### Frontend (`frontend/`)

- **React 19** + **TypeScript**
- **Vite 7** — сборщик и dev-сервер
- **PeerJS** — обёртка над WebRTC
- **Emotion** (`@emotion/react`, `@emotion/styled`) — стилизация (JSX-источник — `@emotion/react`)
- **react-hook-form**, **react-modal**, **react-toastify**
- **react-router** v7
- **ESLint 9** (flat config) + **Prettier**
- **eslint-plugin-boundaries** — контроль направления импортов между слоями (FSD-подобная архитектура)

### Backend (`backend/`)

- **Node.js** + **Express 5** — HTTP-сервер
- **ws** — WebSocket-сигнальный сервер (основной транспорт сигнализации)
- **PeerJS Server** — отдельный сервер WebRTC-сигнализации (запускается через `npx peerjs`)
- **multer** — загрузка файлов
- **helmet** + **cors** — безопасность
- **rate-limiter-flexible** — защита от флуда
- **winston** — логирование
- **TypeScript** (`tsc` собирает в `dist/`), **nodemon** + **ts-node** для dev
- **Vitest** + **Supertest** — тестирование (unit + интеграционные HTTP-тесты)

> Примечание: в `backend/package.json` присутствует `socket.io`, но основной транспорт сигнализации — нативный `ws`.

---

## Архитектура и структура

### Backend (`backend/src/`)

```
server.ts              # Класс VoiceChatServer: Express + http-сервер + маршруты + запуск
https-server.ts        # Наследник VoiceChatServer, поднимает HTTPS (SSL_KEY_PATH/SSL_CERT_PATH)
config/index.ts        # Конфигурация из .env (порт, безопасность, WebSocket)
constants/             # message-types.ts, error-codes.ts
models/                # Client, Call, CallOffer, Message, PersonalInfo
security/              # AuthMiddleware (CORS/auth/origins), RateLimiter
signaling-v2/          # SignalingServer, LobbyManager, CallManager
types/                 # Типы WS-сообщений
utils/                 # helpers.ts, event-bus.ts, adapters.ts
app/modules/
  file-manager/        # controller / routes / service / types (загрузка, скачивание, просмотр файлов)
public/                # Статическая страница-инструкция (index.html)
uploads/               # Каталоги для временных и итоговых файлов
```

Тесты (`backend/tests/`):

```
tests/
  unit/
    file-manager.controller.test.ts  # Mock-тесты контроллера (uploadFile, downloadFile, viewFile)
    file-manager.service.test.ts     # unit-тесты сервиса с моками fs/uuid
    helpers.test.ts                  # validateIP, generateRoomCode/Id, omitDeep, getLocalIP
    event-bus.test.ts                # подписка/рассылка file:uploaded и file:deleted
    lobby-manager.test.ts            # addClient, офферы, поиск по ws/id/ip, removeMember, getStats
    call-manager.test.ts             # startCall/endCall, статусы участников, сообщения
    signaling-server.test.ts         # WS-протокол: join, call offer/accept/decline, mute, chat, screen sharing, disconnect
  integration/
    file-manager.routes.test.ts      # supertest: POST /files/upload, GET /files/download/:id, GET /files/view/:id
```

Конфигурация тестов: `backend/vitest.config.mts` (globals, environment: node, coverage: v8).

Архитектурные особенности:

- **Композиция в конструкторе** `VoiceChatServer`: создаются `LobbyManager`, `CallManager`, `FileManagerService`, `FileManagerController`, `FileManagerRoutes` и `SignalingServer`.
- **SignalingServer** — центральный обработчик WS-сообщений. Разбирает сообщения по `MESSAGE_TYPES` и вызывает обработчики лобби/звонка. Наследует event-bus: подписан на `file:uploaded` / `file:deleted` и рассылает уведомления в звонок.
- **LobbyManager** — управление участниками лобби и офферами звонков.
- **CallManager** — состояние активных звонков (участники, mute/speaking/online, screen sharing, сообщения).
- **Соглашения именования сообщений**: строковые типы вида `lobby::join`, `call::end`, `all::call::started`, `me::lobby-joined` (см. `constants/message-types.ts`).
- **HTTP-маршруты**: `GET /` (инструкция с IP), `GET /stats` (требует auth), `GET /health`, файловые маршруты под `/files` (`POST /upload`, `GET /download/:fileId`, `GET /view/:fileId`).
- **Безопасность**: helmet с отключённым CSP, CORS с валидацией origin по паттернам, rate limiting на подключения, ограничение размера WS-сообщения и числа клиентов.

### Frontend (`frontend/src/`)

```
main.tsx               # Точка входа: роутинг и монтирование приложения
app/                   # Слой app: App.tsx — композиция провайдеров
api/                   # config.ts (API_URLS), fetcher.ts
pages/                 # Слой pages: Root (роутинг), Login, Home, Call
widgets/               # Слой widgets: композиционные блоки
                       #   Header (ui: UserName, SettingsPanel), Lobby (ui: LobbyRow),
                       #   ControlPanel, TextChat, UserCard
features/              # Слой features: прикладные фичи
                       #   AcceptCallModal, WaitCallModal, CallButton, AvatarChanger,
                       #   EditableNickname, EnterUserNameForm
components/            # Слой components: презентационный UI-кит
                       #   Avatar, Button, Card, Column, Row, Input, Icons, Message,
                       #   SidePanel, Slider, ShareScreenVideo, ...
providers/             # Слой providers: AuthProvider, ChatNetworkProvider,
                       #   TextChatProvider, ThemeColorProvider
hooks/                 # Слой hooks: usePeer, useLocalStorage, useClickOutside, usePageVisibility
theme/                 # Слой theme: тема и GlobalStyles (Emotion)
types/                 # Слой types: общие типы
utils/                 # Слой utils: утилиты + класс-сервис SpeechDetection
assets/                # Статические ресурсы (изображения)
```

**Правило зависимостей слоёв** — импорт допускается **только «вниз»**:

```
app → pages → widgets → features → {components, providers} → hooks → api/utils/types/theme
```

| Слой         | Назначение                                   | Может импортировать                                   |
| ------------ | -------------------------------------------- | ----------------------------------------------------- |
| `app`        | Композиция провайдеров и роутинга            | всё, что ниже                                         |
| `pages`      | Страницы и роутинг                           | `widgets`, `features`, `components`, `providers`, низ |
| `widgets`    | Самостоятельные композиционные блоки страниц | `features`, `components`, `providers`, низ            |
| `features`   | Прикладные пользовательские сценарии         | `components`, `providers`, низ                        |
| `components` | Презентационный UI-кит (без бизнес-логики)   | `hooks`, `api/utils/types/theme`                      |
| `providers`  | Глобальное состояние и сетевой слой          | `hooks`, `api/utils/types/theme`                      |
| `hooks`      | Переиспользуемые хуки                        | `api/utils/types/theme`                               |
| низ          | `api`, `utils`, `types`, `theme`, `assets`   | друг друга                                            |

- Между **срезами одного слоя** (`pages/*`, `widgets/*`, `features/*`) импорты запрещены — взаимодействие идёт через публичный API среза (`index.ts`).
- `index.ts` слоя/среза — публичный API: ему разрешён реэкспорт своих срезов.
- Правило проверяется ESLint-плагином `eslint-plugin-boundaries` (см. `frontend/eslint.config.js`).

Архитектурные особенности:

- **Провайдеры-композиция** в `app/App.tsx`: `ThemeColorProvider` → `AuthProvider` → `ChatNetworkProvider`.
- **ChatNetworkProvider** — ядро сетевого слоя. Объединяет хуки (`useChatLobby`, `useChatCall`, `useChatMessages`, `useChatScreenShare`, `useChatSignaling`, `useChatMessageRouter`, `useSpeechDetection`) и `usePeer`, управляет WebSocket-соединением и раздаёт состояние/методы через `ChatNetworkContext`.
- **usePeer** — обёртка над PeerJS: инициализация, звонок пользователю, завершение звонка, mute, screen sharing.
- **Алиас импортов**: `@cvc/*` → `./src/*` (настроен в `vite.config.ts` и `tsconfig.app.json`).
- **Профиль пользователя** хранится в `localStorage` (AuthProvider + `useLocalStorage`).

---

## Сборка и запуск

### Требования

- Node.js 18+, npm 9+
- Компьютеры в одной локальной сети

### Установка

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Переменные окружения

```bash
# backend
cp env.example .env

# frontend
cp env.example .env
```

- Обязательно укажите свой локальный IP в `VITE_HOST_IP` (например, `192.168.31.231`). Узнать IP: `ipconfig` (Windows), `ifconfig` / `ip a` (Linux/macOS).
- Для HTTPS-режима укажите пути `SSL_KEY_PATH` и `SSL_CERT_PATH` (и в backend, и в frontend).

### Запуск (3 терминала)

```bash
# Терминал 1 — Backend (HTTP или HTTPS)
cd backend
npm run start          # HTTP
npm run start:ssl      # HTTPS

# Терминал 2 — PeerJS сервер
cd frontend
npm run peerServer:start

# Терминал 3 — Frontend (Vite dev server)
cd frontend
npm run dev
```

### Ключевые команды

**Backend (`backend/package.json`):**

| Команда                 | Действие                                               |
| ----------------------- | ------------------------------------------------------ |
| `npm run build`         | Компиляция TypeScript в `dist/` (`tsc`)                |
| `npm run start`         | Запуск собранного HTTP-сервера (`node dist/server.js`) |
| `npm run start:ssl`     | Запуск HTTPS-сервера (`node dist/https-server.js`)     |
| `npm run dev`           | Dev-режим HTTP (nodemon + ts-node)                     |
| `npm run dev:ssl`       | Dev-режим HTTPS (nodemon + ts-node)                    |
| `npm test`              | Разовый запуск тестов (`vitest run`)                   |
| `npm run test:watch`    | Тесты в watch-режиме (`vitest`)                        |
| `npm run test:coverage` | Тесты с покрытием (`vitest run --coverage`)            |

**Frontend (`frontend/package.json`):**

| Команда                    | Действие                                                      |
| -------------------------- | ------------------------------------------------------------- |
| `npm run dev`              | Vite dev-сервер с `--host` (HTTPS, порт 5173)                 |
| `npm run build`            | `tsc -b && vite build`                                        |
| `npm run preview`          | Предпросмотр сборки (`vite preview --host`)                   |
| `npm run lint`             | Запуск ESLint                                                 |
| `npm run peerServer:start` | PeerJS-сервер на порту 9000 с SSL-сертификатами из `../cert/` |

> Vite-конфиг читает `SSL_KEY_PATH` / `SSL_CERT_PATH` из env и поднимает HTTPS на `0.0.0.0:5173`. Если файлы сертификатов отсутствуют — dev-сервер не стартует.

### HTTPS и SSL-сертификаты (mkcert)

1. Установить mkcert (`choco install mkcert` / `brew install mkcert`).
2. `mkcert -install` (создать локальный CA).
3. В корне проекта создать `cert/` и сгенерировать сертификат под свой IP: `mkcert 192.168.31.231` → появятся `*.pem` и `*-key.pem`.
4. Прописать пути в `.env` (backend и frontend).
5. Опционально: установить корневой CA mkcert (`mkcert -CAROOT`) в доверенные на клиентских машинах.

Альтернатива для PeerJS — проксирование через Vite (см. `vite.config.js` → `proxy`), тогда отдельный SSL для порта 9000 не нужен.

### Переменные окружения

**Backend:**

| Переменная                | По умолчанию                                            | Описание                         |
| ------------------------- | ------------------------------------------------------- | -------------------------------- |
| `PORT`                    | `8080`                                                  | Порт HTTP/HTTPS                  |
| `NODE_ENV`                | `development`                                           | Режим работы                     |
| `HOST`                    | `0.0.0.0`                                               | Хост прослушивания               |
| `ALLOWED_ORIGINS`         | `http://localhost:*,http://192.168.*,https://192.168.*` | Разрешённые origins              |
| `REQUIRE_AUTH`            | `false`                                                 | Требовать авторизацию            |
| `AUTH_TOKEN`              | `local_default_token`                                   | Токен админских эндпоинтов       |
| `MAX_CONNECTIONS_PER_IP`  | `5`                                                     | Лимит подключений с одного IP    |
| `RATE_LIMIT_WINDOW_MS`    | `60000`                                                 | Окно rate limiting               |
| `RATE_LIMIT_MAX_REQUESTS` | `100`                                                   | Макс. запросов в окне            |
| `MAX_MESSAGE_SIZE`        | `16384`                                                 | Макс. размер WS-сообщения (байт) |
| `HEARTBEAT_INTERVAL`      | `30000`                                                 | Интервал heartbeat               |
| `MAX_CLIENTS`             | `100`                                                   | Макс. одновременных клиентов     |
| `SSL_KEY_PATH`            | —                                                       | Путь к SSL-ключу                 |
| `SSL_CERT_PATH`           | —                                                       | Путь к SSL-сертификату           |

**Frontend:**

| Переменная       | Пример                           | Описание                    |
| ---------------- | -------------------------------- | --------------------------- |
| `VITE_HOST_IP`   | `192.168.31.231`                 | IP хоста в локальной сети   |
| `VITE_PORT`      | `8080`                           | Порт backend                |
| `VITE_PEER_PORT` | `9000`                           | Порт PeerJS                 |
| `VITE_SSL`       | `true`                           | Использовать HTTPS          |
| `SSL_KEY_PATH`   | `../cert/192.168.31.231-key.pem` | Путь к SSL-ключу (для Vite) |
| `SSL_CERT_PATH`  | `../cert/192.168.31.231.pem`     | Путь к SSL-сертификату      |

---

## Правила разработки

### Стиль кода

- **Prettier** настроен отдельно для каждого приложения:
  - `backend/.prettierrc`: `singleQuote: true`, `trailingComma: "all"`, `semi: true`.
  - `frontend/.prettierrc`: `singleQuote: false` (двойные кавычки).
- **Backend**: CommonJS-модули (`"module": "commonjs"`), строгий режим TS, `noFallthroughCasesInSwitch: true`. Импорты без алиасов, относительные пути.
- **Frontend**: ESM (`"type": "module"`), `verbatimModuleSyntax: true`, `noUnusedLocals`/`noUnusedParameters` включены, строгий режим TS. Импорты через алиас `@cvc/*`. `type`-импорты оформляются явно (`import type { ... }`).
- Имена файлов: компоненты и модули — PascalCase для классов/компонентов, kebab-case с суффиксом роли для backend-модулей (`*.controller.ts`, `*.routes.ts`, `*.service.ts`, `*.types.ts`), camelCase для хуков (`useXxx.ts`).
- Структура frontend: слои `app → pages → widgets → features → components/providers → hooks → api/utils/types/theme`; фичи выносятся в `features/<Name>/`, композиционные блоки страниц — в `widgets/<Name>/`, презентационный UI — в `components/<Name>/`, переиспользуемые хуки — в `hooks/`, глобальное состояние — в `providers/`. Импорт разрешён только «вниз»; между срезами одного слоя — только через `index.ts`. Нарушения ловит `eslint-plugin-boundaries`.

### Тестирование

- **Backend** покрыт автотестами на **Vitest** + **Supertest** (конфиг — `backend/vitest.config.mts`, скрипты `npm test`, `npm run test:watch`, `npm run test:coverage`).
- Тесты лежат в `backend/tests/` и делятся на два слоя:
  - `tests/unit/` — unit-тесты модулей: `FileManagerController`, `FileManagerService`, `Helpers`, `EventBus`, `LobbyManager`, `CallManager`, `SignalingServer` (WS-протокол эмулируется мок-сокетами без реального сервера).
  - `tests/integration/` — HTTP-интеграционные тесты маршрутов file-manager через supertest (реальный Express-роутер, мок сервиса).
- Внешние зависимости в unit-тестах мокируются: `fs`, `uuid`, `ws`, `config`, `AuthMiddleware`, `RateLimiter`, `event-bus` — через `vi.mock` / `vi.hoisted`.
- **Frontend** тестов пока нет; проверка качества ограничена линтером (`npm run lint`, включая `eslint-plugin-boundaries`) и сборкой TypeScript (`npm run build`).
- TODO: при добавлении функциональности в frontend рассмотреть введение тестов (Vitest + Testing Library).

### Практики и конвенции

- Логика backend разделена по слоям: `controller → service → routes` для файлового модуля; сигнализация — в `signaling-v2`.
- Связь frontend ↔ backend по WebSocket идёт через строковые типы сообщений из `MESSAGE_TYPES`; при добавлении новых событий тип нужно регистрировать и в backend, и в frontend.
- Комментарии и пользовательские сообщения в backend на русском языке — придерживайтесь этого в соответствующих файлах.
- Коммиты и любые git-мутации выполняются только по явному запросу.

# Правило для AI-агента: Windows + PowerShell

Скопируй это в системный промпт / правила агента:

---

## Окружение

Ты работаешь на **Windows**. Твоя оболочка — **Windows PowerShell 5.1** (или PowerShell 7, если явно указано иное). Никаких Unix-оболочек, никакого bash, никакого WSL — если пользователь явно не попросил.

## Запрещено использовать

- **`&&` и `||` для цепочки команд** — в PS 5.1 их нет. Используй `;` (последовательно) или `if ($?) { ... }`. В PS 7+ `&&` работает, но **по умолчанию считай, что у тебя 5.1**, если не проверено иначе.
- **Unix-утилиты**: `ls -la`, `cat`, `grep`, `sed`, `awk`, `touch`, `rm -rf`, `cp`, `mv`, `which`, `head`, `tail`, `find`, `chmod`, `sudo`, `curl` (в смысле unix-curl), `wget`.
- **Прямые слеши `/` в путях** — используй `\` или `Join-Path`.
- **`export VAR=...`** — используй `$env:VAR = "..."`.

## Используй вместо них

| Unix           | PowerShell                                    |
| -------------- | --------------------------------------------- |
| `ls -la`       | `Get-ChildItem -Force`                        |
| `cat file`     | `Get-Content file`                            |
| `grep pat`     | `Select-String pat`                           |
| `touch f`      | `New-Item f -ItemType File`                   |
| `rm -rf dir`   | `Remove-Item dir -Recurse -Force`             |
| `cp`           | `Copy-Item`                                   |
| `mv`           | `Move-Item`                                   |
| `which x`      | `Get-Command x`                               |
| `head`         | `Get-Content f -TotalCount 10`                |
| `tail`         | `Get-Content f -Tail 10`                      |
| `curl url`     | `Invoke-WebRequest url` / `Invoke-RestMethod` |
| `export X=1`   | `$env:X = "1"`                                |
| `cmd1 && cmd2` | `cmd1; if ($?) { cmd2 }`                      |

## Обязательная процедура перед каждой командой

1. **Мысленно произнеси: «Это Windows PowerShell».** Синтаксис — PS, не bash.
2. Проверь команду на запрещённые конструкции из списка выше.
3. Если сомневаешься — используй явный **cmdlet** (`Get-`, `Set-`, `New-`, `Remove-`, `Invoke-`), а не алиас.
4. Для цепочки — `;` или `if ($?) { }`, не `&&`.

## Если команда упала

Не повторяй её с вариациями. Прочитай ошибку, определи, PS ли это синтаксис, и перепиши в PS-стиле. Не тратить токены на перебор bash-команд в PS.

---

Хочешь — могу сделать ещё короче (в одну строку для вставки в `system`), или на английском, если твой агент лучше понимает en.
