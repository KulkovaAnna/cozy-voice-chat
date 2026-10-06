import {
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  type AppSettings,
  type AudioSettings,
  type PiPSettings,
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

// Миграция по version: приводит старые/неполные данные к текущей схеме.
export function migrate(raw: AppSettings | null): AppSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SETTINGS };
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

  return {
    version: SETTINGS_VERSION,
    audio,
    pip,
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
