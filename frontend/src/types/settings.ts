export const SETTINGS_VERSION = 2 as const;

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

export interface AppSettings {
  version: number;
  audio: AudioSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: SETTINGS_VERSION,
  audio: {
    inputDeviceId: null,
    noiseSuppression: false,
    echoCancellation: true,
    autoGainControl: false,
  },
};

// Типизированные пути доступа к настройкам (для селекторов/патчей).
export type SettingsPath = `audio.${keyof AudioSettings}`;

export type SettingsValue<P extends SettingsPath> = P extends `audio.${infer K}`
  ? K extends keyof AudioSettings
    ? AudioSettings[K]
    : never
  : never;

export type SettingsPatch = {
  audio?: Partial<AudioSettings>;
};
