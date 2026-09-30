export const SETTINGS_VERSION = 1 as const;

export interface AudioSettings {
  // Выбранное устройство ввода (микрофон). null — автовыбор браузера.
  inputDeviceId: string | null;
}

export interface AppSettings {
  version: number;
  audio: AudioSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: SETTINGS_VERSION,
  audio: {
    inputDeviceId: null,
  },
};

// Типизированные пути доступа к настройкам (для селекторов/патчей).
export type SettingsPath = `audio.${keyof AudioSettings}`;

export type SettingsValue<P extends SettingsPath> =
  P extends `audio.${infer K}`
    ? K extends keyof AudioSettings
      ? AudioSettings[K]
      : never
    : never;

export type SettingsPatch = {
  audio?: Partial<AudioSettings>;
};
