import {
  DEFAULT_CARD_APPEARANCE,
  DEFAULT_CARD_BACKGROUND,
  DEFAULT_SETTINGS,
  type AppSettings,
  type BackgroundType,
  type BorderStyle,
  type ProfileSettings,
} from "../types/settings";

// ── Вспомогательные утилиты для парсинга ──────────────────────────────

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

// ── Схемы валидации ──────────────────────────────────────────────────

const BORDER_STYLES: BorderStyle[] = [
  "none",
  "solid",
  "dashed",
  "dotted",
  "double",
];

const BACKGROUND_TYPES: BackgroundType[] = ["none", "color", "image"];

// ── Парсинг профиля ──────────────────────────────────────────────────

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

// ── Нормализация настроек ────────────────────────────────────────────

/**
 * Приведение неизвестных данных из хранилища к текущей схеме:
 * известные поля читаются по именам с проверкой типов,
 * неизвестные ключи просто теряются.
 */
export function normalizeSettings(raw: unknown): AppSettings {
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
