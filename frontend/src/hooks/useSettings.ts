import type {
  AudioSettings,
  PiPSettings,
  ProfileSettings,
} from "../types/settings";
import { useSettingsStore } from "../utils/settingsStore";

export const useAudioSettings = (): AudioSettings =>
  useSettingsStore((s) => s.audio);

export const usePipSettings = (): PiPSettings => useSettingsStore((s) => s.pip);

export const useProfileSettings = (): ProfileSettings =>
  useSettingsStore((s) => s.profile);

export function useSettingActions() {
  return {
    setAudio: useSettingsStore((s) => s.setAudio),
    setInputDeviceId: useSettingsStore((s) => s.setInputDeviceId),
    setPip: useSettingsStore((s) => s.setPip),
    setProfile: useSettingsStore((s) => s.setProfile),
  };
}
