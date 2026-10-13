import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "../types/settings";

// ── Мок localStorage ──────────────────────────────────────────────────
// Стор создаётся при импорте модуля (через persist), поэтому мок нужно
// установить ДО динамического import().
//
// Persist по умолчанию использует `window.localStorage`, поэтому мок
// должен содержать и `window`.

class MemoryStorage {
  private data = new Map<string, string>();

  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  clear() {
    this.data.clear();
  }
}

// ── Утилиты для загрузки свежего стора ─────────────────────────────────

type SettingsStoreModule = typeof import("./settingsStore");

async function loadStore(
  persistedState?: unknown,
): Promise<SettingsStoreModule> {
  const storage = new MemoryStorage();
  if (persistedState !== undefined) {
    storage.setItem(
      "app.settings",
      JSON.stringify({ state: persistedState, version: 0 }),
    );
  }
  // Persist использует `window.localStorage` (не bare `localStorage`)
  vi.stubGlobal("window", {
    localStorage: storage,
    addEventListener: vi.fn(),
  });
  vi.resetModules();

  const mod = (await import("./settingsStore")) as SettingsStoreModule;
  // гидратация persist — асинхронная цепочка Promise.resolve → .then × 4;
  // rehydrate() гарантированно дождётся завершения.
  await mod.useSettingsStore.persist.rehydrate();
  return mod;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.resetModules();
});

// ── getState() вне React ──────────────────────────────────────────────

describe("getState", () => {
  it("возвращает DEFAULT_SETTINGS по умолчанию", async () => {
    const mod = await loadStore();
    const state = mod.useSettingsStore.getState();
    expect(state.audio).toEqual(DEFAULT_SETTINGS.audio);
    expect(state.pip).toEqual(DEFAULT_SETTINGS.pip);
    expect(state.profile).toEqual(DEFAULT_SETTINGS.profile);
  });

  it("гидратирует из localStorage при наличии данных", async () => {
    const persisted = {
      audio: {
        inputDeviceId: "mic-custom",
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: false,
      },
      pip: { autoOpen: false },
      profile: {
        avatar: "data:avatar.png",
        cardAppearance: {
          background: {
            type: "color",
            color: "#aaaaaa",
            image: null,
            imageOpacity: 1,
          },
          avatarBorder: { style: "solid", color: "#ffffff", width: 3 },
          textColor: "#000000",
          textShadow: false,
        },
      },
    };
    const mod = await loadStore(persisted);
    const state = mod.useSettingsStore.getState();
    expect(state.audio.inputDeviceId).toBe("mic-custom");
    expect(state.audio.noiseSuppression).toBe(true);
    expect(state.pip.autoOpen).toBe(false);
    expect(state.profile.avatar).toBe("data:avatar.png");
  });
});

// ── Patch-семантика: без рассылки при равных значениях ────────────────
// Без guard'а на равные значения Zustand будет рассылать подписчикам
// при каждом setState, даже если данные не изменились.

describe("patch semantics", () => {
  it("setAudio: равное значение → новая ссылка (без guard)", async () => {
    const mod = await loadStore();
    const state = mod.useSettingsStore.getState();
    const before = state.audio;
    state.setAudio({ noiseSuppression: false });
    // Без shallowEqual guard — всегда новая ссылка
    expect(mod.useSettingsStore.getState().audio).not.toBe(before);
  });

  it("setAudio: различное значение → новые данные", async () => {
    const mod = await loadStore();
    const before = mod.useSettingsStore.getState().audio;
    mod.useSettingsStore.getState().setAudio({ noiseSuppression: true });
    expect(mod.useSettingsStore.getState().audio).not.toBe(before);
    expect(mod.useSettingsStore.getState().audio.noiseSuppression).toBe(true);
  });
});

// ── subscribe (нативный Zustand v5, без селекторов) ──────────────────

describe("subscribe", () => {
  it("notify при изменении audio", async () => {
    const mod = await loadStore();
    const listener = vi.fn();
    mod.useSettingsStore.subscribe(() => listener());
    mod.useSettingsStore.getState().setAudio({ noiseSuppression: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("отписка работает", async () => {
    const mod = await loadStore();
    const listener = vi.fn();
    const unsubscribe = mod.useSettingsStore.subscribe(() => listener());
    unsubscribe();
    mod.useSettingsStore.getState().setAudio({ noiseSuppression: true });
    expect(listener).not.toHaveBeenCalled();
  });
});

// ── UnsavedChangesStore ───────────────────────────────────────────────

describe("unsavedChangesStore", () => {
  // Загружаем чистый стор после сброса модулей
  async function loadUnsavedStore() {
    vi.resetModules();
    const mod = await import("./unsavedChangesStore");
    return mod;
  }

  it("register → hasUnsavedChanges", async () => {
    const mod = await loadUnsavedStore();
    expect(mod.hasUnsavedChanges()).toBe(false);
    mod.registerUnsavedChanges("feature", {
      hasUnsaved: () => true,
      save: () => {},
    });
    expect(mod.hasUnsavedChanges()).toBe(true);
  });

  it("unregister убирает из hasUnsavedChanges", async () => {
    const mod = await loadUnsavedStore();
    const unregister = mod.registerUnsavedChanges("feature", {
      hasUnsaved: () => true,
      save: () => {},
    });
    expect(mod.hasUnsavedChanges()).toBe(true);
    unregister();
    expect(mod.hasUnsavedChanges()).toBe(false);
  });

  it("getUnsavedChangesNames возвращает имена", async () => {
    const mod = await loadUnsavedStore();
    mod.registerUnsavedChanges("a", { hasUnsaved: () => true, save: () => {} });
    mod.registerUnsavedChanges("b", {
      hasUnsaved: () => false,
      save: () => {},
    });
    mod.registerUnsavedChanges("c", { hasUnsaved: () => true, save: () => {} });
    const names = mod.getUnsavedChangesNames();
    expect(names).toContain("a");
    expect(names).toContain("c");
    expect(names).not.toContain("b");
  });

  it("saveAllUnsavedChanges вызывает save", async () => {
    const mod = await loadUnsavedStore();
    const save1 = vi.fn().mockResolvedValue(undefined);
    const save2 = vi.fn().mockResolvedValue(undefined);
    mod.registerUnsavedChanges("dirty", {
      hasUnsaved: () => true,
      save: save1,
    });
    mod.registerUnsavedChanges("clean", {
      hasUnsaved: () => false,
      save: save2,
    });
    await mod.saveAllUnsavedChanges();
    expect(save1).toHaveBeenCalledTimes(1);
    expect(save2).not.toHaveBeenCalled();
  });
});
