export const SETTINGS_VERSION = 4 as const;

export interface AudioSettings {
  // Выбранное устройство ввода (микрофон). null — автовыбор браузера.
  inputDeviceId: string | null;
  // Подавление фонового шума (noiseSuppression).
  noiseSuppression: boolean;
  // Подавление эха (echoCancellation).
  echoCancellation: boolean;
  // Автоматическая регулировка усиления (autoGainControl).
  autoGainControl: boolean;
}

export interface PiPSettings {
  // Автоматически открывать PiP-окно при потере фокуса таба (mediaSession
  // "enterpictureinpicture"). false — PiP-окно никогда не появится без клика.
  autoOpen: boolean;
}

// ─── Кастомизация карточки пользователя ────────────────────────────

// Стиль рамки аватара.
export type BorderStyle = "none" | "solid" | "dashed" | "dotted" | "double";

// Рамка аватара: стиль, цвет и толщина (px).
export interface AvatarBorder {
  style: BorderStyle;
  color: string;
  width: number;
}

// Тип фона карточки: без фона / однотонный / картинка.
export type BackgroundType = "none" | "color" | "image";

// Фон карточки пользователя.
export interface CardBackground {
  type: BackgroundType;
  // Цвет фона (CSS-цвет), используется при type === "color".
  color: string | null;
  // Картинка фона (URL файла), используется при type === "image".
  image: string | null;
  // Прозрачность картинки фона: 1 — полностью непрозрачная, 0 — невидимая.
  // Используется только при type === "image".
  imageOpacity: number;
}

// Внешний вид карточек пользователя (лобби и звонок).
export interface CardAppearance {
  // Фон карточки в лобби.
  background: CardBackground;
  // Рамка аватара.
  avatarBorder: AvatarBorder;
  // Цвет текста внутри карточки (CSS-цвет). null — цвет из темы.
  textColor: string | null;
  // true — включать тень у текста внутри карточки.
  textShadow: boolean;
}

// Настройки профиля пользователя (аватар + кастомизация карточки).
export interface ProfileSettings {
  // Аватар пользователя (data URL или URL файла на сервере). null — нет аватара.
  avatar: string | null;
  // Внешний вид карточек пользователя.
  cardAppearance: CardAppearance;
}

export const DEFAULT_CARD_BACKGROUND: CardBackground = {
  type: "none",
  color: null,
  image: null,
  imageOpacity: 1,
};

export const DEFAULT_CARD_APPEARANCE: CardAppearance = {
  background: { ...DEFAULT_CARD_BACKGROUND },
  avatarBorder: { style: "none", color: "#ffffff", width: 2 },
  textColor: null,
  textShadow: false,
};

export interface AppSettings {
  version: number;
  audio: AudioSettings;
  pip: PiPSettings;
  profile: ProfileSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: SETTINGS_VERSION,
  audio: {
    inputDeviceId: null,
    noiseSuppression: false,
    echoCancellation: true,
    autoGainControl: false,
  },
  pip: {
    autoOpen: true,
  },
  profile: {
    avatar: null,
    cardAppearance: {
      ...DEFAULT_CARD_APPEARANCE,
      background: { ...DEFAULT_CARD_BACKGROUND },
    },
  },
};

// Типизированные пути доступа к настройкам (для селекторов/патчей).
export type SettingsPath =
  | `audio.${keyof AudioSettings}`
  | `pip.${keyof PiPSettings}`
  | `profile.${keyof ProfileSettings}`;

export type SettingsValue<P extends SettingsPath> = P extends `audio.${infer K}`
  ? K extends keyof AudioSettings
    ? AudioSettings[K]
    : never
  : P extends `pip.${infer K}`
    ? K extends keyof PiPSettings
      ? PiPSettings[K]
      : never
    : P extends `profile.${infer K}`
      ? K extends keyof ProfileSettings
        ? ProfileSettings[K]
        : never
      : never;

export type SettingsPatch = {
  audio?: Partial<AudioSettings>;
  pip?: Partial<PiPSettings>;
  profile?: Partial<ProfileSettings>;
};
