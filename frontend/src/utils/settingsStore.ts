import {
  DEFAULT_CARD_APPEARANCE,
  DEFAULT_CARD_BACKGROUND,
  DEFAULT_SETTINGS,
  type AppSettings,
  type BackgroundType,
  type BorderStyle,
  type ProfileSettings,
  type SettingsSection,
} from "../types/settings";

const STORAGE_KEY = "app.settings";
const WRITE_DEBOUNCE_MS = 200;

type AnyListener = () => void;

const BORDER_STYLES: BorderStyle[] = [
  "none",
  "solid",
  "dashed",
  "dotted",
  "double",
];

const BACKGROUND_TYPES: BackgroundType[] = ["none", "color", "image"];

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function readNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;

  return value >= min && value <= max ? value : fallback;
}

// Мелкие объекты настроек пересоздаются при каждой записи, поэтому сравнивать
// их нужно по полям первого уровня, а не по ссылке.
export function shallow<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (!isRecord(a) || !isRecord(b)) return false;

  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;

  return keys.every((key) => a[key] === b[key]);
}

// Профиль собирается из неизвестного JSON целиком: в хранилище могут лежать
// данные прошлых версий или битые значения, а потребители (backgroundToCss,
// cardTextToCss) рассчитывают на полный объект.
function parseProfile(raw: unknown): ProfileSettings {
  const source = asRecord(raw);
  const appearance = asRecord(source.cardAppearance);
  const background = asRecord(appearance.background);
  const border = asRecord(appearance.avatarBorder);

  return {
    avatar: readString(source.avatar),
    cardAppearance: {
      background: {
        type: readEnum(
          background.type,
          BACKGROUND_TYPES,
          DEFAULT_CARD_BACKGROUND.type,
        ),
        color: readString(background.color),
        image: readString(background.image),
        imageOpacity: readNumber(
          background.imageOpacity,
          0,
          1,
          DEFAULT_CARD_BACKGROUND.imageOpacity,
        ),
      },
      avatarBorder: {
        style: readEnum(
          border.style,
          BORDER_STYLES,
          DEFAULT_CARD_APPEARANCE.avatarBorder.style,
        ),
        color:
          readString(border.color) ??
          DEFAULT_CARD_APPEARANCE.avatarBorder.color,
        width: readNumber(
          border.width,
          0,
          20,
          DEFAULT_CARD_APPEARANCE.avatarBorder.width,
        ),
      },
      textColor: readString(appearance.textColor),
      textShadow: readBoolean(
        appearance.textShadow,
        DEFAULT_CARD_APPEARANCE.textShadow,
      ),
    },
  };
}

// Приведение неизвестных данных из хранилища к текущей схеме: известные поля
// читаются по именам с проверкой типов, неизвестные ключи просто теряются.
function normalize(raw: unknown): AppSettings {
  // Состояние обновляется только через setSection, который не мутирует
  // объекты, поэтому дефолты можно отдавать как есть.
  if (!isRecord(raw)) return DEFAULT_SETTINGS;

  const audio = asRecord(raw.audio);
  const pip = asRecord(raw.pip);

  return {
    audio: {
      inputDeviceId: readString(audio.inputDeviceId),
      noiseSuppression: readBoolean(
        audio.noiseSuppression,
        DEFAULT_SETTINGS.audio.noiseSuppression,
      ),
      echoCancellation: readBoolean(
        audio.echoCancellation,
        DEFAULT_SETTINGS.audio.echoCancellation,
      ),
      autoGainControl: readBoolean(
        audio.autoGainControl,
        DEFAULT_SETTINGS.audio.autoGainControl,
      ),
    },
    pip: {
      autoOpen: readBoolean(pip.autoOpen, DEFAULT_SETTINGS.pip.autoOpen),
    },
    profile: parseProfile(raw.profile),
  };
}

function readStorage(): AppSettings {
  if (typeof window === "undefined") return normalize(null);

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    return normalize(null);
  }
}

const initialSettings = readStorage();

// Состояние хранится по секциям — подписчики получают только свою секцию.
const sections: AppSettings = {
  audio: initialSettings.audio,
  pip: initialSettings.pip,
  profile: initialSettings.profile,
};

const listenersBySection: Record<SettingsSection, Set<AnyListener>> = {
  audio: new Set(),
  pip: new Set(),
  profile: new Set(),
};

let writeTimer: ReturnType<typeof setTimeout> | null = null;

// Снимок для localStorage: секции всегда собираются заново.
function snapshot(): AppSettings {
  return {
    audio: sections.audio,
    pip: sections.pip,
    profile: sections.profile,
  };
}

function writeStorage(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
  } catch {
    // Хранилище недоступно — игнорируем.
  }
}

// Отложенная запись, чтобы частые патчи не дёргали localStorage каждый раз.
function scheduleWrite(): void {
  if (writeTimer) clearTimeout(writeTimer);

  writeTimer = setTimeout(() => {
    writeTimer = null;
    writeStorage();
  }, WRITE_DEBOUNCE_MS);
}

function emit(section: SettingsSection): void {
  for (const listener of listenersBySection[section]) {
    listener();
  }
}

// Обновляет секции из нового снимка и возвращает те, что реально изменились.
function applySections(next: AppSettings): SettingsSection[] {
  const changed: SettingsSection[] = [];

  if (!shallow(next.audio, sections.audio)) {
    sections.audio = next.audio;
    changed.push("audio");
  }

  if (!shallow(next.pip, sections.pip)) {
    sections.pip = next.pip;
    changed.push("pip");
  }

  if (!shallow(next.profile, sections.profile)) {
    sections.profile = next.profile;
    changed.push("profile");
  }

  return changed;
}

export function get(): AppSettings {
  return snapshot();
}

// Точечное чтение секции — без пересборки снимка всего состояния.
export function getSection<K extends SettingsSection>(
  section: K,
): AppSettings[K] {
  return sections[section];
}

export function setSection<K extends SettingsSection>(
  section: K,
  patch: Partial<AppSettings[K]>,
): void {
  const next = { ...sections[section], ...patch };

  // Значения, равные текущим, не меняют состояние: иначе рассылка подписчикам
  // и лишняя запись в localStorage.
  if (shallow(next, sections[section])) return;

  sections[section] = next;

  scheduleWrite();
  emit(section);
}

export function subscribeTo(
  section: SettingsSection,
  listener: AnyListener,
): VoidFunction {
  const listeners = listenersBySection[section];
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

// Синхронизация между вкладками через событие storage.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;

    let parsed: unknown = null;
    try {
      parsed = event.newValue ? JSON.parse(event.newValue) : null;
    } catch {
      parsed = null;
    }

    for (const section of applySections(normalize(parsed))) {
      emit(section);
    }
  });
}
