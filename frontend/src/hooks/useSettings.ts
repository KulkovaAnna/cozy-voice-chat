import { useCallback, useSyncExternalStore } from "react";

import type {
  AppSettings,
  AudioSettings,
  PiPSettings,
} from "../types/settings";
import * as settingsStore from "../utils/settingsStore";

export function useSetting<T>(selector: (state: AppSettings) => T): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      settingsStore.subscribe(() => onStoreChange()),
    [],
  );

  const getSnapshot = useCallback(
    () => selector(settingsStore.get()),
    [selector],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSettings(): AppSettings {
  return useSetting((state) => state);
}

export function useSettingActions() {
  const setAudio = useCallback((patch: Partial<AudioSettings>) => {
    settingsStore.set(patch);
  }, []);

  const setInputDeviceId = useCallback((inputDeviceId: string | null) => {
    settingsStore.set({ inputDeviceId });
  }, []);

  const setPip = useCallback((patch: Partial<PiPSettings>) => {
    settingsStore.setPip(patch);
  }, []);

  return { setAudio, setInputDeviceId, setPip };
}
