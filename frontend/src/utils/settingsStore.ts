import {
  DEFAULT_CARD_APPEARANCE,
  DEFAULT_CARD_BACKGROUND,
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  type AppSettings,
  type AudioSettings,
  type AvatarBorder,
  type BackgroundType,
  type BorderStyle,
  type CardAppearance,
  type CardBackground,
  type PiPSettings,
  type ProfileSettings,
} from "../types/settings";

const STORAGE_KEY = "app.settings";
const WRITE_DEBOUNCE_MS = 200;

type Listener = (state: AppSettings) => void;

function readStorage(): AppSettings | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppSettings) : null;
  } catch {
    return null;
  }
}

const BORDER_STYLES: BorderStyle[] = [
  "none",
  "solid",
  "dashed",
  "dotted",
  "double",
];

const BACKGROUND_TYPES: BackgroundType[] = ["none", "color", "image"];

function migrateBackground(raw: CardBackground | undefined): CardBackground {
  const type = BACKGROUND_TYPES.includes(raw?.type as BackgroundType)
    ? (raw!.type as BackgroundType)
    : DEFAULT_CARD_BACKGROUND.type;

  return {
    type,
    color: typeof raw?.color === "string" ? raw.color : null,
    image: typeof raw?.image === "string" ? raw.image : null,
    imageOpacity:
      typeof raw?.imageOpacity === "number" &&
      Number.isFinite(raw.imageOpacity) &&
      raw.imageOpacity >= 0 &&
      raw.imageOpacity <= 1
        ? raw.imageOpacity
        : DEFAULT_CARD_BACKGROUND.imageOpacity,
  };
}

function migrateBorder(raw: AvatarBorder | undefined): AvatarBorder {
  return {
    style: BORDER_STYLES.includes(raw?.style as BorderStyle)
      ? (raw!.style as BorderStyle)
      : DEFAULT_CARD_APPEARANCE.avatarBorder.style,
    color:
      typeof raw?.color === "string"
        ? raw.color
        : DEFAULT_CARD_APPEARANCE.avatarBorder.color,
    width:
      typeof raw?.width === "number" && raw.width >= 0 && raw.width <= 20
        ? raw.width
        : DEFAULT_CARD_APPEARANCE.avatarBorder.width,
  };
}

function migrateCardAppearance(
  raw: CardAppearance | undefined,
): CardAppearance {
  return {
    background: migrateBackground(raw?.background),
    avatarBorder: migrateBorder(raw?.avatarBorder),
    textColor: typeof raw?.textColor === "string" ? raw.textColor : null,
    textShadow:
      typeof raw?.textShadow === "boolean"
        ? raw.textShadow
        : DEFAULT_CARD_APPEARANCE.textShadow,
  };
}

function migrateProfile(raw: ProfileSettings | undefined): ProfileSettings {
  return {
    avatar: typeof raw?.avatar === "string" ? raw.avatar : null,
    cardAppearance: migrateCardAppearance(raw?.cardAppearance),
  };
}

// Миграция аватара со схемы v3: раньше аватар хранился в localStorage
// в объекте "user" (AuthProvider), теперь — в настройках профиля.
function migrateLegacyAvatar(profile: ProfileSettings): ProfileSettings {
  if (profile.avatar !== null) return profile;
  if (typeof window === "undefined") return profile;

  try {
    const rawUser = window.localStorage.getItem("user");
    if (!rawUser) return profile;

    const user = JSON.parse(rawUser) as { avatar?: unknown };
    if (typeof user.avatar === "string" && user.avatar.length > 0) {
      return { ...profile, avatar: user.avatar };
    }
  } catch {
    // Повреждённые данные — игнорируем.
  }

  return profile;
}

// Миграция по version: приводит старые/неполные данные к текущей схеме.
export function migrate(raw: AppSettings | null): AppSettings {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_SETTINGS,
      profile: migrateLegacyAvatar({ ...DEFAULT_SETTINGS.profile }),
    };
  }

  const audio: AudioSettings = {
    inputDeviceId:
      typeof raw.audio?.inputDeviceId === "string"
        ? raw.audio.inputDeviceId
        : null,
    noiseSuppression:
      typeof raw.audio?.noiseSuppression === "boolean"
        ? raw.audio.noiseSuppression
        : DEFAULT_SETTINGS.audio.noiseSuppression,
    echoCancellation:
      typeof raw.audio?.echoCancellation === "boolean"
        ? raw.audio.echoCancellation
        : DEFAULT_SETTINGS.audio.echoCancellation,
    autoGainControl:
      typeof raw.audio?.autoGainControl === "boolean"
        ? raw.audio.autoGainControl
        : DEFAULT_SETTINGS.audio.autoGainControl,
  };

  const pip: PiPSettings = {
    autoOpen:
      typeof raw.pip?.autoOpen === "boolean"
        ? raw.pip.autoOpen
        : DEFAULT_SETTINGS.pip.autoOpen,
  };

  const profile = migrateLegacyAvatar(migrateProfile(raw.profile));

  return {
    version: SETTINGS_VERSION,
    audio,
    pip,
    profile,
  };
}

let state: AppSettings = migrate(readStorage());
const listeners = new Set<Listener>();

let writeTimer: ReturnType<typeof setTimeout> | null = null;

function persist(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Хранилище недоступно — игнорируем.
  }
}

// Отложенная запись, чтобы частые патчи не дёргали localStorage каждый раз.
function schedulePersist(): void {
  if (writeTimer) clearTimeout(writeTimer);

  writeTimer = setTimeout(() => {
    writeTimer = null;
    persist();
  }, WRITE_DEBOUNCE_MS);
}

function emit(): void {
  for (const listener of listeners) {
    listener(state);
  }
}

export function get(): AppSettings {
  return state;
}

export function set(patch: Partial<AudioSettings>): void {
  state = {
    ...state,
    audio: { ...state.audio, ...patch },
  };

  schedulePersist();
  emit();
}

export function setPip(patch: Partial<PiPSettings>): void {
  state = {
    ...state,
    pip: { ...state.pip, ...patch },
  };

  schedulePersist();
  emit();
}

export function setProfile(patch: Partial<ProfileSettings>): void {
  state = {
    ...state,
    profile: { ...state.profile, ...patch },
  };

  schedulePersist();
  emit();
}

export function subscribe(listener: Listener): VoidFunction {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

// Синхронизация между вкладками через событие storage.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;

    let raw: AppSettings | null = null;
    try {
      raw = event.newValue ? (JSON.parse(event.newValue) as AppSettings) : null;
    } catch {
      raw = null;
    }

    state = migrate(raw);
    emit();
  });
}
