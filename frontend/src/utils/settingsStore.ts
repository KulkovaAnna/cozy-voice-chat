import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_SETTINGS, type AppSettings } from "../types/settings";
import { normalizeSettings } from "./settingsNormalization";

type SettingsState = AppSettings & {
  setAudio: (patch: Partial<AppSettings["audio"]>) => void;
  setInputDeviceId: (inputDeviceId: string | null) => void;
  setPip: (patch: Partial<AppSettings["pip"]>) => void;
  setProfile: (patch: Partial<AppSettings["profile"]>) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setAudio(patch) {
        set((state) => ({ audio: { ...state.audio, ...patch } }));
      },

      setInputDeviceId(inputDeviceId) {
        set((state) => {
          if (state.audio.inputDeviceId === inputDeviceId) return state;
          return { audio: { ...state.audio, inputDeviceId } };
        });
      },

      setPip(patch) {
        set((state) => ({ pip: { ...state.pip, ...patch } }));
      },

      setProfile(patch) {
        set((state) => ({ profile: { ...state.profile, ...patch } }));
      },
    }),
    {
      name: "app.settings",
      partialize: (state) => ({
        audio: state.audio,
        pip: state.pip,
        profile: state.profile,
      }),
      merge(persisted, current) {
        const normalized = normalizeSettings(persisted);
        return { ...current, ...normalized };
      },
    },
  ),
);

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== "app.settings") return;

    let parsed: unknown = null;
    try {
      parsed = event.newValue ? JSON.parse(event.newValue) : null;
    } catch {
      parsed = null;
    }

    useSettingsStore.setState(normalizeSettings(parsed));
  });
}
