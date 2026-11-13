# KODA.md — инструкционный контекст проекта

Этот файл описывает проект **Cozy Voice Chat** и служит справочным контекстом для дальнейшей работы над кодовой базой. Весь анализ и документ составлены на русском языке.

---

## Обзор проекта

**Cozy Voice Chat** — локальный P2P голосовой чат для созвонов по локальной сети (LAN). Голосовой трафик идёт напрямую между участниками через **WebRTC (PeerJS)**, что даёт минимальную задержку. Сигнализация и текстовый чат/обмен файлами обслуживаются собственным Node.js-сервером.

Ключевые возможности:

- Голосовые звонки 1-на-1 через P2P (WebRTC).
- Текстовый чат внутри звонка.
- Обмен файлами: до 10 вложений в одном сообщении. Файлы хранятся на машине хоста и удаляются после завершения звонка. Добавить их можно тремя способами: перетащить в открытую панель чата, вставить из буфера обмена (`Ctrl+V`) или выбрать кнопкой 📎. Картинки показываются миниатюрами с полноэкранной галереей.
- Регулировка громкости собеседника, статусы mute / speaking.
- Демонстрация экрана (Screen Sharing).
- Picture-in-Picture оверлей: always-on-top окно (Document PiP API) с аватарами участников, подсветкой говорящего, кнопками мута и завершения звонка. Открывается автоматически при потере фокуса таба (mediaSession-действие `enterpictureinpicture`, Chrome/Edge 120+), закрывается при возврате на таб. Автопоявление можно отключить в настройках (вкладка «Интерфейс» панели настроек).
- Кастомизация профиля (имя, аватар), тёмная и светлая темы, мобильный адаптив.
- PWA: установка как приложение (манифест + service worker на Workbox через `vite-plugin-pwa`), отдельное окно без вкладок, офлайн-шелл, автообновление с тостом, системные уведомления о входящем звонке и значок непрочитанных сообщений. Web Push не используется — уведомления идут прямо со страницы по уже существующему WS-соединению.
- Кастомизация карточки пользователя: фон карточки в лобби и в звонке — цвет или картинка с регулируемой прозрачностью и размытием, стилизуемая рамка аватара (стиль/цвет/толщина) и оформление текста карточки (цвет, тень). Живое превью и мгновенная синхронизация с участниками.
- Живое обновление профиля: смена имени/аватара/карточки мгновенно рассылается участникам лобби и звонка (`lobby::update-profile` → `all::lobby::profile-updated` / `all::call::profile-updated`), без перезагрузки страницы.
- HTTPS «из коробки» (нужен для Screen Sharing и PiP API).
- Базовая безопасность: rate limiting (подключения + WS-сообщения), CORS, helmet, валидация origins.
- Graceful shutdown — корректное завершение с уведомлением всех участников и очисткой ресурсов по SIGINT/SIGTERM.
- Автоматическая очистка зависших клиентов при ошибках WebSocket.
- Защита от дублирования офферов — повторный звонок отклоняет предыдущий активный оффер инициатора.

Проект — монорепозиторий из двух независимых приложений: `backend/` и `frontend/`. Корневой `package.json` содержит только метаданные (без workspace-скриптов).

Известные ограничения (из README):

- Данные пользователя (имя, id) хранятся в `localStorage` браузера; аватар и фон карточки загружаются на сервер (папка `uploads/profile`) и хранятся на диске.
- PiP работает только в Chromium-браузерах (Document PiP API + mediaSession `enterpictureinpicture`, Chrome/Edge 120+); в Firefox/Safari окно не появится. При первом автооткрытии браузер может запросить разрешение.
- PWA привязано к origin с портом: установка на `https://<IP>:4173` и на `:5173` — это два разных приложения с раздельным `localStorage`. Нужен HTTPS и доверенный на клиентской машине mkcert CA. Офлайн доступна только оболочка: backend (`:8080`), файлы и музыка не кэшируются.

---

## Технологический стек

### Frontend (`frontend/`)

- **React 19** + **TypeScript**
- **Vite 7** — сборщик и dev-сервер
- **vite-plugin-pwa** — манифест + service worker (Workbox generateSW)
- **@fontsource-variable/nunito** — саморазмещаемый шрифт Nunito (latin + cyrillic + cyrillic-ext)
- **PeerJS** — обёртка над WebRTC
- **Emotion** (`@emotion/react`, `@emotion/styled`) — стилизация (JSX-источник — `@emotion/react`)
- **Zustand** — управление состоянием настроек (`settingsStore`) и несохранённых изменений (`unsavedChangesStore`)
- **react-hook-form**, **react-modal**, **react-toastify**
- **react-router** v7
- **ESLint 9** (flat config) + **Prettier**
- **Vitest** — unit-тесты чистых утилит (`utils/microphones`, `utils/settingsNormalization`, `utils/settingsStore`)
- **eslint-plugin-boundaries** — контроль направления импортов между слоями (FSD-подобная архитектура)

### Backend (`backend/`)

- **Node.js** + **Express 5** — HTTP-сервер
- **ws** — WebSocket-сигнальный сервер (основной транспорт сигнализации)
- **PeerJS Server** — отдельный сервер WebRTC-сигнализации (запускается через `yarn ps:start`)
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
models/                # Client, Call, CallOffer, Message, PersonalInfo (имя, аватар, cardAppearance)
security/              # AuthMiddleware (CORS/auth/origins), RateLimiter
signaling-v2/          # SignalingServer, LobbyManager, CallManager
types/                 # Типы WS-сообщений (IncomingWsMessage, PersonalInfoData с cardAppearance)
utils/                 # helpers.ts, adapters.ts
app/modules/
  file-manager/        # controller / routes / service / types (пакетная загрузка вложений, скачивание, просмотр, файлы профиля)
  music-player/        # yt-dlp.ts (поиск бинарника, isPlaylistUrl, fetchPlaylistTracks, fetchTrackInfo), service (синглтон очереди), routes (stream/state), types (MusicQueueItem, queue/queueIndex)
public/                # Статическая страница-инструкция (index.html)
uploads/               # chat/ (файлы звонков, чистятся после звонка) и profile/ (аватары/фоны, постоянные)
```

Тесты (`backend/tests/`):

```
tests/
  unit/
    file-manager.controller.test.ts  # Mock-тесты контроллера (uploadAttachments, downloadFile, viewFile)
    file-manager.service.test.ts     # unit-тесты сервиса с моками fs/uuid (вложения чата, claim/rollback, файлы профиля + персистентность метаданных в JSON)
    helpers.test.ts                  # validateIP, generateRoomCode/Id, omitDeep, getLocalIP
    lobby-manager.test.ts            # addClient (в т.ч. preferredId), офферы, поиск по ws/id/ip, removeMember, getStats, cardAppearance, clearStaleClients
    call-manager.test.ts             # startCall/endCall, статусы участников, сообщения, getAllCalls
    signaling-server.test.ts         # WS-протокол: join, call offer/accept/decline, mute, chat (с вложениями), screen sharing, disconnect, rate limiting, duplicate offer protection, releaseConnection
  integration/
    file-manager.routes.test.ts      # supertest: POST /files/attachments, GET /files/download/:id, GET /files/view/:id
```

Конфигурация тестов: `backend/vitest.config.mts` (globals, environment: node, coverage: v8).

Архитектурные особенности:

- **Композиция в конструкторе** `VoiceChatServer`: создаются `LobbyManager`, `CallManager`, `FileManagerService`, `FileManagerController`, `FileManagerRoutes` и `SignalingServer`.
- **SignalingServer** — центральный обработчик WS-сообщений. Разбирает сообщения по `MESSAGE_TYPES` и диспетчеризует через реестр `messageHandlers` (тип сообщения → функция-обработчик), реализованный в `signaling-v2/message-handlers.ts`. Отдельных событий о файлах нет: вложения приходят вместе с сообщением (`call::send-message` → `all::call::new-message`).
- **LobbyManager** — управление участниками лобби и офферами звонков. Включая обновление профиля (`updatePersonalInfo`): нормализует имя/аватар/`cardAppearance` через `PersonalInfo`, ограничивает длину имени (50 символов) и аватара (1 МБ), для карточки — `imageOpacity` приводит к диапазону 0..1, `backgroundBlur` — диапазон 0..20px, `textColor` — не длиннее 64 символов (иначе `null`), `textShadow` — только boolean. `addClient` принимает опциональный `preferredId` — прежний id клиента, который сервер сохраняет при переподключении (если он ещё свободен).
- **CallManager** — состояние активных звонков (участники, mute/speaking/online, screen sharing, сообщения).
- **Соглашения именования сообщений**: строковые типы вида `lobby::join`, `call::end`, `all::call::started`, `me::lobby-joined` (см. `constants/message-types.ts`).
- **HTTP-маршруты**: `GET /` (инструкция с IP), `GET /stats` (требует auth), `GET /health`, файловые маршруты под `/files` (`POST /attachments`, `GET /download/:fileId`, `GET /view/:fileId`) и маршруты файлов профиля (`POST /profile/avatar`, `GET /profile/:fileId`, `DELETE /profile/:fileId`; лимит 1 МБ, только изображения). Метаданные файлов профиля персистятся в `uploads/profile/metadata.json` — загружаются при старте сервиса, сохраняются при каждом upload/delete.
- **Мультивложения чата**: `POST /files/attachments` (`multer.array('files', MAX_ATTACHMENTS)`, до 10 файлов) принимает `callId` и `clientId` и возвращает `{ files: FileAttachment[] }` (id, имя, размер). `FileManagerService` хранит метаданные в памяти (`Map<fileId, FileMetadata>` с полями `size`/`claimed`), `uploadAttachments()` сохраняет пачку и откатывает уже записанные файлы при ошибке, `claimAttachments(ids, senderId, callId)` валидирует весь список до мутации и помечает файлы `claimed` (повторное прикрепление → 409, чужой файл → 403, битый id → 400/404). Отправитель ищется по `clientId` через `getMemberById` с перекрёстной проверкой IP (фолбэк — `getMemberByIp`, т.к. по IP не различить две вкладки). `SignalingServer.handleSendCallMessage` (async) закрепляет файлы и передаёт `FileAttachment[]` в `CallManager.addMessage`; слэш-команды с вложениями обрабатываются как обычный текст. `downloadFile` не удаляет файл после отдачи (скачать могут оба участника) — очистка только `cleanDownloads()` при завершении звонка.
- **Безопасность**: helmet с отключённым CSP, CORS с валидацией origin по паттернам, rate limiting на подключения и WS-сообщения (429 при превышении), освобождение слота подключения при disconnect (`releaseConnection`), ограничение размера WS-сообщения и числа клиентов.
- **Graceful shutdown**: `SignalingServer.shutdown()` — broadcast `CALL_ENDED` всем звонкам, закрытие wss; `VoiceChatServer.stop()` — вызывает `shutdown`, закрывает HTTP-сервер, обрабатывает SIGINT/SIGTERM.
- **Очистка зависших клиентов**: `LobbyManager.clearStaleClients()` — удаляет клиентов с `ws.readyState !== OPEN`; вызывается из `ws.on('error')` в `SignalingServer`.
- **Защита от дублирования офферов**: `handleInitiateCall` проверяет `getOfferByMemberId(initiator.id)` — если есть активный оффер, отправляет `CALL_OFFER_DECLINED` предыдущему получателю и удаляет оффер перед созданием нового.
- **Слэш-команды**: `signaling-v2/slash-commands.ts` содержит `SlashCommandRegistry` — реестр с методами `register`, `execute`, `search(query, page, limit)`. При получении текстового сообщения, начинающегося с `/`, `SignalingServer.handleSendCallMessage` перехватывает его, вызывает `execute` и отправляет результат **только инициатору команды** (через `sendToClient(ws, ...)`), а не всем в чате. Ответ помечается `isSystem: true`. HTTP-эндпоинт `GET /slash-commands?q=&page=&limit=` возвращает пагинированный результат поиска для автодополнения.
- **Индикатор выполнения слэш-команд**: перед `await this.slashCommands.execute(...)` сервер шлёт инициатору `me::command-status {status:"started"}`, промежуточные стадии — через callback `report(text)` (третий параметр в `CommandHandler`), в `finally` — `{status:"done"}`. При падении команды ошибка доходит в чат как системное сообщение.
- **Музыкальный плеер** (`app/modules/music-player/`) — общая очередь воспроизведения для всех участников звонка:
  - `yt-dlp.ts` — `resolveYtdlpPath()` ищет бинарник (`YT_DLP_PATH` → `process.cwd()` → подъём вверх от `__dirname`, поэтому работает и в `src` при dev, и в `dist` после сборки) и кэширует результат; `fetchTrackInfo(url)` вызывает `yt-dlp -f bestaudio[ext=m4a]/bestaudio/best --no-playlist --skip-download --user-agent <UA> --print "%(title)s␁%(uploader)s␁%(duration)s␁%(url)s"` и возвращает метаданные + **прямую ссылку на поток** (`NA` трактуется как `null`). `fetchPlaylistTracks(url, limit=50)` вызывает `yt-dlp --flat-playlist --playlist-items 1-50 --dump-single-json` — без скачивания форматов, только метаданные. `isPlaylistUrl(url)` распознаёт YouTube playlist (`?list=`), SoundCloud `/sets/`. `YTDLP_USER_AGENT` обязателен: YouTube проверяет связку UA + подпись URL.
  - `music-player.types.ts` — `MusicQueueItem` (алиас `MusicTrack`), `MusicState` расширена полями `queue: MusicQueueItem[]` и `queueIndex: number`.
  - `music-player.service.ts` — синглтон с внутренней очередью: `startQueue(tracks, startIndex)` ставит очередь (обрезаем до `MAX_QUEUE_SIZE = 50`, усекаем названия до 120 символов), `next()` / `prev()` / `jumpTo(index)` переключают трек, `stop()` чистит очередь. Прямые ссылки кэшируются по индексу (`Map<index, directUrl>`) — получаем лениво, при не-2xx сбрасываем только свой индекс. `startTrack(payload)` — обёртка над `startQueue([track])` для обратной совместимости.
  - `music-player.routes.ts` — `GET /music/stream`: отдаёт `#directUrl` текущего индекса очереди (лениво через `resolveDirectUrl`), пробрасывает клиентский `Range`, отвечает `206` + `Content-Range`. `resolveDirectUrl` — обёртка над `fetchTrackInfo` с дедупликацией параллельных запросов (`pendingRequests: Map<videoUrl, Promise>`): оба участника, нажавшие ▶ одновременно, получают один вызов yt-dlp и одну и ту же подпись URL. При не-`ok` ответе источника сбрасывается кэш только текущего индекса и делается один внутренний retry со свежей ссылкой (`cached`-флаг); тело неудачного ответа отменяется через `body.cancel()`. При `206` `Content-Length` не отдаётся — upstream сообщает общий размер файла, а не фрагмента, и браузер ждёт лишние байты.
  - WS-протокол: `call::music-play|pause|stop|start|next|prev` → broadcast `all::call::music-state-changed` с полной очередью и `queueIndex`. `next`/`prev` принимают `expectedIndex` для защиты от гонок: если очередь уже сдвинулась (оба нажали одновременно), запрос игнорируется и клиенту возвращается актуальное состояние. После `/play` состояние рассылается автоматически. При завершении звонка `stop()`.
  - `SlashCommands/commands.ts`: `/play` автоматически распознаёт плейлист. Для плейлиста — `fetchPlaylistTracks` → `startQueue`, ответ одной строкой: `🎵 Название · N треков из M · hh:mm:ss · Нажмите ▶`. Для одиночного видео — `fetchTrackInfo` → `startTrack`.

### Frontend (`frontend/src/`)

```
main.tsx               # Точка входа: роутинг и монтирование приложения
app/                   # Слой app: App.tsx — композиция провайдеров
api/                   # config.ts (API_URLS), fetcher.ts, profileFiles.ts (загрузка/удаление файлов профиля)
pages/                 # Слой pages: Root (роутинг), Login, Home, Call
widgets/               # Слой widgets: композиционные блоки
                       #   Header (ui: UserName, SettingsPanel), Lobby (ui: LobbyRow),
                       #   ControlPanel, TextChat, UserCard, PiPWidget
features/              # Слой features: прикладные фичи
                        #   AcceptCallModal, WaitCallModal, CallButton, CardCustomization,
                        #   EditableNickname, EnterUserNameForm, EmojiPicker, MusicPlayer,
                        #   PwaInstall
components/            # Слой components: презентационный UI-кит
                        #   Avatar, Button, Card, Carousel, Column, Row, Input, Icons,
                        #   Message, SidePanel, Slider, Range, ColorInput, Select, Toggle,
                        #   ShareScreenVideo, ...
providers/             # Слой providers: AuthProvider, ChatNetworkProvider,
                       #   TextChatProvider, ThemeColorProvider, PiPProvider
hooks/                 # Слой hooks: usePeer, useLocalStorage, useClickOutside,
                       #   usePageVisibility, useDocumentPictureInPicture, useSettings,
                       #   useMicrophones, useDefaultDeviceName, useUnsavedChangesGuard,
                       #   usePwaInstall, usePwaUpdate
theme/                 # Слой theme: тема и GlobalStyles (Emotion)
types/                 # Слой types: общие типы (clientTypes, serverTypes, settings)
utils/                 # Слой utils: adapters, attachments (drag-n-drop и вставка файлов
                       #   из буфера), cardAppearance, fileToBase64,
                       #   settingsStore (Zustand), settingsNormalization, unsavedChangesStore (Zustand),
                       #   microphones (устройства ввода и MediaTrackConstraints), SpeechDetection,
                       #   notifications (Notification API + setAppBadge)
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

- **Провайдеры-композиция** в `app/App.tsx`: `ThemeColorProvider` → `AuthProvider` → `ChatNetworkProvider` → `PiPProvider`.
- **ChatNetworkProvider** — ядро сетевого слоя. Объединяет хуки (`useChatLobby`, `useChatCall`, `useChatMessages`, `useChatScreenShare`, `useChatSignaling`, `useChatMessageRouter`, `useSpeechDetection`) и `usePeer`, управляет WebSocket-соединением и раздаёт состояние/методы через `ChatNetworkContext`.
- **usePeer** — обёртка над PeerJS: инициализация, звонок пользователю, завершение звонка, mute, screen sharing.
- **Aliас импортов**: `@cvc/*` → `./src/*` (настроен в `vite.config.ts` и `tsconfig.app.json`).
- **Профиль пользователя** (имя, id) хранится в `localStorage` (AuthProvider + `useLocalStorage`). Аватар и внешний вид карточки вынесены в настройки (`settingsStore.profile`), т.к. аватар больше не часть объекта пользователя.
- **Живое обновление профиля** — при изменении имени (`user.name`) или профиля из `settingsStore` (`avatar`, `cardAppearance`) после входа в лобби `ChatNetworkProvider` автоматически отправляет `lobby::update-profile` (эффект с дедупликацией через `lastSentProfileRef`: первое срабатывание после получения `id` только фиксирует профиль, т.к. он уже отправлен при `lobby::join`). Сервер обновляет `personalInfo` клиента и рассылает `all::lobby::profile-updated` (всем в лобби, с `lobbyInfo`) и `all::call::profile-updated` (участникам звонка, с `callInfo`), если клиент в звонке. Роутер направляет первое в `handleLobbyJoined` (обновление списка лобби), второе — в `handleCallProfileUpdated` (обновление `callInfo` с проверкой совпадения `callId`). Метод `updateProfile` также проброшен через `ChatNetworkContext`.
- **Кастомизация карточки пользователя** — фича `features/CardCustomization` (секция «Карточка пользователя» во вкладке «Кастомизация»). Состоит из `CardPreview` (превью лобби- и call-карточки с hover-подсветкой и тултипами; аватар в превью кликабелен для загрузки), `BackgroundPicker` (фон: без фона / цвет / картинка + ползунки «Прозрачность» картинки и «Размытие фона»), `AvatarBorderEditor` (стиль/цвет/толщина рамки аватара), `TextEditor` (переключатели «Цвет текста» + ColorInput и «Тень текста») и самой `CardCustomization` (draft в локальном state, кнопка «Сохранить»). Типы — `CardAppearance`/`CardBackground`/`AvatarBorder` в `types/settings.ts`; утилиты `resolveCardBackground`/`backgroundToCss`/`cardTextToCss` и объект `cardImageLayerStyles` в `utils/cardAppearance.ts`. Ползунки и выбор цвета используют переиспользуемые `components/Range` (обёртка над `input[type="range"]` с типизированным `onChange(value: number)`) и `components/ColorInput` — локальные `styled.input` в фиче запрещены. Фон: цвет — фон самого элемента, картинка — слоем `::before` (`cardImageLayerStyles`) через CSS-переменные `--cvc-card-image`/`--cvc-card-image-opacity`/`--cvc-card-blur`, что даёт прозрачность и размытие картинки без затемнения содержимого карточки. Стили текста применяются ТОЛЬКО к тексту внутри карточки — инлайн-стилями из `cardTextToCss` (имя и «Это ты» в `widgets/Lobby/ui/LobbyRow`, имя в `widgets/UserCard`, превью в `CardPreview`), без глобальных CSS-правил. Рамка — через проп `Avatar` (`border`).
- **Слэш-команды в текстовом чате**: `features/CommandSuggest` — всплывающее окно автодополнения при вводе `/`. Чистая функция `computeSlashState(text)` в `features/CommandSuggest/slashState.ts` определяет активен ли слэш-префикс (слэш в начале строки или после пробела, без пробела после него — URL и уже набранные команды не считаются). Сразу после ввода `/` без дебаунса отправляется `GET /slash-commands?q=&page=1&limit=3` (первые 3 команды), при дальнейшем вводе — debounced (200 мс) запрос с `q` и `limit=5`. `reqIdRef` отбрасывает устаревшие ответы. Выбор команды заменяет весь слэш-префикс целиком (`handleCommandSelect` в `widgets/TextChat` ищет начало токена, а не вставляет по курсору). Ответы бота (системные сообщения) видны только инициатору команды.
- **Хранение файлов профиля** — картинки фона и аватар загружаются по HTTP (`POST /files/profile/avatar`, лимит 1 МБ, только изображения) и хранятся в `uploads/profile/` постоянно (не чистятся после звонка, в отличие от `uploads/chat/`). В WS-сообщениях передаётся только URL файла (WS-сообщения ограничены 16 КБ и не переносят base64). Клиентские хелперы — `api/profileFiles.ts` (`uploadProfileFile`, `deleteProfileFile`). Старый файл удаляется при замене.
- **Мультивложения в чате** — `widgets/TextChat` + `utils/attachments.ts`. В сообщении может быть до `MAX_ATTACHMENT_FILES = 10` файлов (`files: File[]`); `appendAttachments(current, incoming, limit)` добавляет новые файлы, игнорирует дубли по `name:size:lastModified` и возвращает `{ files, rejected }` — при переполнении чат показывает тост, поэтому повторный выбор/перетаскивание не заменяет, а дополняет список. `uploadAttachments(files)` в `TextChatContext` типизирован как `Promise<Attachment[] | null>`: `TextChatProvider` собирает `FormData` (`files` × N + `callId` + `clientId` из `useAuth`) и шлёт `POST /files/attachments`, возвращая `null` при отсутствии звонка или ошибке — тогда вложения остаются в списке (можно повторить), а текст не отправляется. После успешной загрузки `TextChat` вызывает `sendTextMessage(text, attachmentIds)`; `CommandSuggest` скрывается, пока в списке есть файлы. Drag-n-drop обрабатывается только на `Styles.Container` открытой панели (без window-слушателей): `isFileDrag` проверяет наличие `Files` в `dataTransfer.types`, поэтому перетаскивание текста и ссылок не перехватывается; `dragDepthRef` считает глубину `dragenter`/`dragleave`, чтобы подсветка не мигала на дочерних элементах; `DropOverlay` — `position: absolute; pointer-events: none` поверх панели. Вставка — `document`-слушатель `paste`, активный только при `textChatIsOpen`; файлы из буфера (`extractClipboardFiles`) переименовываются `namePastedFile` (`image.png`/`blob` → `Pasted image 20261113225427.png`), `preventDefault` вызывается только когда файлы действительно есть. Папки (`size === 0` и пустой `type`) отбрасываются. Список — `Styles.AttachmentList` со строкой `Styles.AttachmentRow` на файл и кнопкой `×` (`CloseIcon`); `<input type="file" multiple>` сбрасывает значение после выбора, чтобы те же файлы можно было выбрать повторно. В сообщении (`components/Message`) вложения рендерятся из массива: картинки — через `/files/view/:id`, остальные — `FileInfo` со ссылкой на `/files/download/:id`. Отображение картинок: одна картинка — кликабельное превью (`PreviewButton`/`PreviewImage`, до 200px по высоте), две и более — сетка квадратных миниатюр `ImageGrid`/`ThumbButton`/`ThumbImage` (`72px`, на `breakpoints.mobile` — `64px`, `object-fit: cover`); число колонок равно числу картинок, но не больше трёх (`$columns`), лишние переносятся на новую строку. Клик открывает `components/Carousel` — полноэкранную галерею (сцена `80vw × 80vh`, на мобиле во весь экран): круговые стрелки, счётчик «2 / 5», управление `←`/`→`/`Esc`, закрытие по клику на затемнение, блокировка прокрутки `document.body`. Галерея рендерится порталом в `document.body` (у `SidePanel` есть `transform`, который ломал бы `position: fixed`), навигация — через чистую `wrapIndex` из `utils/carousel`. Чтобы сетка не растягивала пузырь, у `Container`/`MessageBody`/`MessageBubble` задан `max-width: 100%`.
- **Музыкальный плеер** (`features/MusicPlayer/`) — полоска плеера над полем ввода чата:
  - `useMusicPlayer.ts` — подписывается на window-событие `music::state-changed` (его диспатчит `ChatNetworkProvider.handleMusicStateChanged` из роутера WS), хранит `MusicState`, управляет скрытым `<audio>`: при `playing` ставит `src = ${API_URL}/music/stream` (только для нового трека — `lastLoadedUrl`), вызывает `play()`, при `paused`/`idle` — `pause()` и сброс источника. `isBuffering` определяется событиями самого элемента (`loadstart`/`waiting` → true, `playing`/`pause`/`emptied` → false) — `setState` внутри `useEffect` запрещён линтером `react-hooks`. Используется callback-ref для `<audio>`: когда плеер в `idle` полоска размонтирует `<audio>`, и эффекты с обработчиками (`ended`, `timeupdate`, `waiting`) переподписываются при появлении элемента — это гарантирует надёжный автопереход. `skipToNext` защищён от повторного вызова на один трек (`skipSentRef`). При ошибке потока клиент делает автоматический retry (до 2 попыток), сервер уже сбросил кэш протухшей ссылки.
  - Методы `playMusic`/`pauseMusic`/`stopMusic` объявлены в `ChatNetworkProvider` (через `callHook.callInfoRef`, чтобы не зависеть от state) и доступны из `ChatNetworkContext`; они шлют `call::music-play|pause|stop`. Кнопки делают оптимистичный локальный `setState` + ждут broadcast от сервера.
  - `ui/MusicPlayer.tsx` рендерится только при `status !== 'idle'`: ▶/⏸, «исполнитель — название», `🔗 источник`, ✕ стоп. Компонент подключён в `widgets/TextChat` **над** `Styles.FormPanel`.
  - Типы `MusicTrackInfo`/`MusicState` — в `types/serverTypes.ts` (в `clientTypes.ts` дубли не заводим, barrel `types/index.ts` реэкспортирует оба файла).
  - **Очередь треков** — `MusicState.queue` и `queueIndex` приходят от сервера. Кнопки `⏮`/`⏭` шлют `call::music-next`/`call::music-prev` с `expectedIndex` (защита от гонок: если очередь сдвинулась, запрос игнорируется). При `ended` на `<audio>` хук вызывает `nextMusic(queueIndex)` — автопереход. Счётчик `«3 / 50»` раскрывает трек-лист (`position: absolute` над полоской, `max-height: 240px`). Автопереход работает через три механизма: основной — событие `ended` браузера; фолбэк через `timeupdate` — если `currentTime` достиг `duration - 0.5` с (срабатывает один раз на трек благодаря `skipSentRef`); фолбэк для стримов без метаданных (`duration === Infinity`) — таймер на `waiting`: если `currentTime` не меняется 5 секунд, трек считается оконченным.
  - **Индикатор выполнения команды** — `commandStatus: CommandStatus | null` в `ChatNetworkContext`; `me::command-status` (started/running/done) роутится в `handleCommandStatus`. В `TextChat` над полем ввода показывается `Styles.CommandStatusLine` (18px, `position: absolute; bottom: 100%` — не влияет на layout). Спиннер на кнопке Send. Страховочный таймаут 90 с (`COMMAND_TIMEOUT_MS`). При завершении звонка `handleCallEnded` сбрасывает статус.
- **Picture-in-Picture (PiP)** — реализован на трёх частях:
  - `hooks/useDocumentPictureInPicture.ts` — обёртка над Document Picture-in-Picture API: `open`/`openAuto`/`close`, копирование `<style>`/`<link>` из `<head>` основного документа в окно PiP и их синхронизация через `MutationObserver` (Emotion инжектит правила лениво). `openAuto` помечает окно «автооткрытым» — такое окно автоматически закрывается при возврате фокуса/видимости таба (слушатели `focus`/`blur` окна + `usePageVisibility`).
  - `providers/PiPProvider` — контекст `{ isSupported, isOpen, pipWindow, open, openAuto, close }`; на время активного звонка регистрирует mediaSession-действие `enterpictureinpicture`, которое браузер само вызывает при переключении с таба (открытие без user-жеста; Chrome 120+, условие — активный захват микрофона через `getUserMedia`). Читает `settings.pip.autoOpen` и пропускает регистрацию действия, если пользователь отключил автопоявление.
  - `widgets/PiPWidget` — рендерится на странице `Call`, контент монтируется через `createPortal` в `pipWindow.document.body` (портал сохраняет все контексты). Показывает аватары участников с подсветкой говорящего и бейджем mute, кнопки мута и завершения звонка; закрывает окно при завершении звонка.
  - Важные нюансы: `onClick`-обработчики внутри портала работают штатно (React 19 корректно пробрасывает события через порталы в другой document); кнопка завершения звонка вызывается обёрткой `() => endCall()` — прямой `onClick={endCall}` передал бы React-событие первым аргументом в `endCall(nextCallInfo?: CallInfo)` и сломал `callId`.
- **PWA** — генерируется `vite-plugin-pwa` (generateSW + Workbox):
  - `frontend/vite.config.ts`: `VitePWA` плагин генерирует `dist/sw.js` и `dist/manifest.webmanifest`. Прекещ 27 файлов (JS/CSS/HTML, шрифты Nunito, иконки, аудио, jpg из assets). `globPatterns: "**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff2,mp3,gif}"`. `navigateFallback: "index.html"` — офлайн-шелл через `NavigationRoute`. `registerType: "autoUpdate"` — новая версия ставится и активируется автоматически; `onNeedReload` перехватывается в `features/PwaInstall` и показывает тост «Доступна новая версия» с кнопкой «Обновить» (чтобы не оборвать идущий звонок).
  - `public/icons/`: `icon-192.png` (192x192, `purpose: "any"`), `icon-512.png` (512x512, `purpose: "any"` + `purpose: "maskable"`).
  - `public/index.html`: `lang="ru"`, `theme-color` meta, `apple-touch-icon` (iOS). `<link rel="manifest">` инжектит плагин автоматически.
  - `features/PwaInstall/ui/PwaInstall.tsx`: хуки `usePwaInstall` (перехват `beforeinstallprompt` → кнопка «Установить» в шапке) + `usePwaUpdate` (`useRegisterSW` из `virtual:pwa-register/react` → тост обновления). В dev-режиме (`devOptions.enabled: false`) `useRegisterSW` возвращает заглушку — `yarn dev` не меняется.
  - `utils/notifications.ts`: `notifyIncomingCall(name)` — системное уведомление при входящем звонке; `setAppBadge(count)` / `clearAppBadge()` — счётчик непрочитанных на значке приложения. Вызываются из `ChatNetworkProvider` при `me::call-offer` и при приёме сообщений в фоновой вкладке.
  - Web Push не используется — уведомления идут прямо со страницы по уже существующему WS-соединению. Push-сервис противоречит идее «никакого облака» и не работает без интернета.
  - Шрифты: `@fontsource-variable/nunito` — саморазмещаемый variable font (latin + cyrillic + cyrillic-ext, веса 200–900, один файл `.woff2` на подмножество). Подключается в `main.tsx` как `import '@fontsource-variable/nunito/index.css'`. Google Fonts удалены из `index.html`.
- **Настройки приложения (`AppSettings`)** — хранятся в `localStorage` (`app.settings`) через Zustand-стор `utils/settingsStore.ts` (`useSettingsStore`). Секции: `audio` (устройство ввода, noiseSuppression, echoCancellation, autoGainControl), `pip` (`autoOpen` — автопоявление PiP-окна), `profile` (`avatar` — аватар, `cardAppearance` — внешний вид карточек). Панель настроек в хедере: вкладки «Профиль», «Кастомизация» (тема + карточка пользователя), «Интерфейс» (PiP), «Микрофон». Типы в `types/settings.ts`, действия — `useSettingActions()` из `hooks/useSettings.ts` (включая `setAudio`/`setPip`/`setProfile`/`setInputDeviceId`). Стор использует middleware `persist` (сериализация в `localStorage` с `partialize` по секциям). Точечные подписки — нативные селекторы Zustand (`useSettingsStore((s) => s.audio)`). Императивное чтение — `useSettingsStore.getState()`. Cross-tab синхронизация через событие `storage` + `useSettingsStore.setState(normalizeSettings(parsed))`.
  - Валидация из хранилища — чистая функция `normalizeSettings(raw)` в `utils/settingsNormalization.ts` (без привязки к стору): известные поля читаются по именам с проверкой типов, неизвестные ключи теряются. Профиль собирается `parseProfile()` — вложенность (`profile` → `cardAppearance` → `background`/`avatarBorder`) раскрывается через `asRecord()`; примитивы читаются хелперами `readString`/`readBoolean`/`readEnum`/`readNumber` (последний валидирует диапазон). Миграций между версиями схемы нет: `v3 → v4` (перенос аватара из объекта `user`) применена, объект `user` в `localStorage` больше не читается.
- **Стор несохранённых изменений** — `utils/unsavedChangesStore.ts` на Zustand: `useUnsavedChangesStore` (Map охранников + `register`/`unregister`). Публичный API — императивные обёртки `registerUnsavedChanges`/`hasUnsavedChanges`/`getUnsavedChangesNames`/`saveAllUnsavedChanges`, потребители (`SettingsPanel`, `useUnsavedChangesGuard`) не менялись. Баррель `utils/index.ts` реэкспортирует только эти функции — сам Zustand-стор доступен по прямому пути `@cvc/utils/unsavedChangesStore`.

---

## Сборка и запуск

> ⚠️ **Пакетный менеджер — yarn**. Все команды ниже подразумевают `yarn` (вместо `npm`).

### Требования

- Node.js 18+
- Yarn 4+
- Компьютеры в одной локальной сети

### Установка

```bash
# Backend
cd backend
yarn install

# Frontend
cd ../frontend
yarn install
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
yarn start          # HTTP
yarn start:ssl      # HTTPS

# Терминал 2 — PeerJS сервер
cd frontend
yarn ps:start

# Терминал 3 — Frontend (Vite dev server)
cd frontend
yarn dev
```

### Ключевые команды

**Backend (`backend/package.json`):**

| Команда              | Действие                                               |
| -------------------- | ------------------------------------------------------ |
| `yarn build`         | Компиляция TypeScript в `dist/` (`tsc`)                |
| `yarn start`         | Запуск собранного HTTP-сервера (`node dist/server.js`) |
| `yarn start:ssl`     | Запуск HTTPS-сервера (`node dist/https-server.js`)     |
| `yarn dev`           | Dev-режим HTTP (nodemon + ts-node)                     |
| `yarn dev:ssl`       | Dev-режим HTTPS (nodemon + ts-node)                    |
| `yarn test`          | Разовый запуск тестов (`vitest run`)                   |
| `yarn test:watch`    | Тесты в watch-режиме (`vitest`)                        |
| `yarn test:coverage` | Тесты с покрытием (`vitest run --coverage`)            |

**Frontend (`frontend/package.json`):**

| Команда           | Действие                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `yarn dev`        | Vite dev-сервер с `--host` (HTTPS, порт 5173)                                             |
| `yarn build`      | `tsc -b && vite build` (генерирует `dist/sw.js` и `dist/manifest.webmanifest`)            |
| `yarn preview`    | Предпросмотр сборки (`vite preview --host`) — canonical-адрес для установки PWA (`:4173`) |
| `yarn lint`       | Запуск ESLint                                                                             |
| `yarn test`       | Unit-тесты фронтенда (`vitest run`)                                                       |
| `yarn test:watch` | Тесты фронтенда в watch-режиме                                                            |
| `yarn ps:start`   | PeerJS-сервер на порту 9000 с SSL-сертификатами из `../cert/`                             |

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
- **Стили компонентов (`*.styles.ts`) импортируются только через `import * as Styles from "./X.styles"`** — единый канонический алиас `Styles` для всех файлов; любые другие алиасы (`Styled`, `S` и т. п.) запрещены. В JSX стили используются как `Styles.Container`, `Styles.Icon` и т. д.
- **Пропсы React-компонентов не деструктурируются в объявлении функции** — компонент всегда принимает единый параметр `props` с сохранением типа, а обращение к полям идёт через `props.xxx`. Пример: `function Comp(props: CompProps) { return <>{props.p1}</>; }`, а **не** `function Comp({ p1 }: CompProps)`. Это правило касается только объявлений React-компонентов; колбэки Emotion `styled(...)(({ theme }) => …)` в `*.styles.tsx`, кастомные хуки и обычные функции (в т. ч. локальные колбэки `map`/обработчиков) под правило не подпадают. Дефолтные значения и rest-пропсы при необходимости выносятся в тело компонента: `const { variant = "primary", children, ...rest } = props;`.

### Тестирование

- **Backend** покрыт автотестами на **Vitest** + **Supertest** (конфиг — `backend/vitest.config.mts`, скрипты `yarn test`, `yarn test:watch`, `yarn test:coverage`).
- Тесты лежат в `backend/tests/` и делятся на два слоя:
  - `tests/unit/` — unit-тесты модулей: `FileManagerController`, `FileManagerService`, `Helpers`, `LobbyManager`, `CallManager`, `SignalingServer` (WS-протокол эмулируется мок-сокетами без реального сервера).
  - `tests/integration/` — HTTP-интеграционные тесты маршрутов file-manager через supertest (реальный Express-роутер, мок сервиса).
- Внешние зависимости в unit-тестах мокируются: `fs`, `uuid`, `ws`, `config`, `AuthMiddleware`, `RateLimiter` — через `vi.mock` / `vi.hoisted`.
- **Frontend** unit-тесты на **Vitest** (`frontend/package.json`: `yarn test`, `yarn test:watch`) — покрыты чистые утилиты `utils/microphones` (нормализация устройств, `isDefault`, `defaultDeviceName`, `buildAudioConstraints`, `isDeviceAvailable`), `utils/settingsNormalization` (валидация настроек из `localStorage`: null/garbage → defaults, round-trip, out-of-range, unknown enum, nested profile parsing), `utils/settingsStore` (Zustand: getState, гидратация из localStorage, патч-семантика, нативная подписка без React, registration/unregistration guard'ов) и `features/CommandSuggest/slashState` (`computeSlashState`: голый `/`, частичный ввод, URL, завершённая команда). Также покрыт `utils/attachments` (`isFileDrag`, `extractDroppedFiles`, `extractClipboardFiles`, `namePastedFile`, `appendAttachments`: drag текста vs файла, откат на `.files`, фильтрация папок, расширение по MIME, стабильное имя скриншота, накопление вложений и лимит 10) и `utils/carousel` (`wrapIndex`: значения в диапазоне, круговая навигация в обе стороны, пустой список). Остальная часть фронта пока проверяется только линтером и сборкой.

### Практики и конвенции

- **Пакетный менеджер — yarn (classic v1).** Все команды установки и запуска скриптов выполняются через `yarn` (`yarn install`, `yarn dev`, `yarn build`, `yarn lint`, …). `npm` не использовать: он не создаёт `yarn.lock` и может тянуть другие версии зависимостей.
- Логика backend разделена по слоям: `controller → service → routes` для файлового модуля; сигнализация — в `signaling-v2`.
- Связь frontend ↔ backend по WebSocket идёт через строковые типы сообщений из `MESSAGE_TYPES`; при добавлении новых событий тип нужно регистрировать и в backend, и в frontend.
- Комментарии и пользовательские сообщения в backend на русском языке — придерживайтесь этого в соответствующих файлах.
- Коммиты и любые git-мутации выполняются только по явному запросу.

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
