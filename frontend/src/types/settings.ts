export const SETTINGS_VERSION = 3 as const;

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

export interface AppSettings {
  version: number;
  audio: AudioSettings;
  pip: PiPSettings;
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
};

// Типизированные пути доступа к настройкам (для селекторов/патчей).
export type SettingsPath =
  `audio.${keyof AudioSettings}` | `pip.${keyof PiPSettings}`;

export type SettingsValue<P extends SettingsPath> = P extends `audio.${infer K}`
  ? K extends keyof AudioSettings
    ? AudioSettings[K]
    : never
  : P extends `pip.${infer K}`
    ? K extends keyof PiPSettings
      ? PiPSettings[K]
      : never
    : never;

export type SettingsPatch = {
  audio?: Partial<AudioSettings>;
  pip?: Partial<PiPSettings>;
};
