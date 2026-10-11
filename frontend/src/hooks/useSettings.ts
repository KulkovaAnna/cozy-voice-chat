import { useCallback, useRef, useSyncExternalStore } from "react";

import type {
  AppSettings,
  AudioSettings,
  PiPSettings,
  ProfileSettings,
  SettingsSection,
} from "../types/settings";
import {
  getSection,
  setSection,
  shallow,
  subscribeTo,
} from "../utils/settingsStore";

// Секция читается целиком и сравнивается по полям: объект секции пересоздаётся
// при каждой записи, сравнение по ссылке давало бы перерисовку на любое изменение.
function useSection<K extends SettingsSection>(section: K): AppSettings[K] {
  const latest = useRef<AppSettings[K]>(getSection(section));

  const getSnapshot = useCallback((): AppSettings[K] => {
    const next = getSection(section);

    if (shallow(latest.current, next)) {
      return latest.current;
    }

    latest.current = next;
    return next;
  }, [section]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeTo(section, onStoreChange),
    [section],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const useAudioSettings = (): AudioSettings => useSection("audio");
export const usePipSettings = (): PiPSettings => useSection("pip");
export const useProfileSettings = (): ProfileSettings => useSection("profile");

export function useSettingActions() {
  const setAudio = useCallback((patch: Partial<AudioSettings>) => {
    setSection("audio", patch);
  }, []);

  const setInputDeviceId = useCallback((inputDeviceId: string | null) => {
    setSection("audio", { inputDeviceId });
  }, []);

  const setPip = useCallback((patch: Partial<PiPSettings>) => {
    setSection("pip", patch);
  }, []);

  const setProfile = useCallback((patch: Partial<ProfileSettings>) => {
    setSection("profile", patch);
  }, []);

  return { setAudio, setInputDeviceId, setPip, setProfile };
}
