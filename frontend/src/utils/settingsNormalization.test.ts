import { describe, expect, it } from "vitest";

import {
  DEFAULT_CARD_APPEARANCE,
  DEFAULT_CARD_BACKGROUND,
  DEFAULT_SETTINGS,
} from "../types/settings";
import { normalizeSettings } from "./settingsNormalization";

describe("normalizeSettings", () => {
  it("null → DEFAULT_SETTINGS", () => {
    expect(normalizeSettings(null)).toBe(DEFAULT_SETTINGS);
  });

  it("undefined → DEFAULT_SETTINGS", () => {
    expect(normalizeSettings(undefined)).toBe(DEFAULT_SETTINGS);
  });

  it("пустой объект → равные DEFAULT_SETTINGS", () => {
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("строка → DEFAULT_SETTINGS (не record)", () => {
    expect(normalizeSettings("garbage")).toBe(DEFAULT_SETTINGS);
  });

  it("валидный объект → корректное приведение", () => {
    const raw = {
      audio: {
        inputDeviceId: "mic-1",
        noiseSuppression: true,
        echoCancellation: false,
        autoGainControl: true,
      },
      pip: { autoOpen: false },
      profile: {
        avatar: "data:image/png;base64,abc",
        cardAppearance: {
          background: {
            type: "color",
            color: "#ff0000",
            image: null,
            imageOpacity: 0.5,
          },
          avatarBorder: {
            style: "dashed",
            color: "#ffffff",
            width: 5,
          },
          textColor: "#000000",
          textShadow: true,
        },
      },
    };
    const result = normalizeSettings(raw);
    expect(result.audio.inputDeviceId).toBe("mic-1");
    expect(result.audio.noiseSuppression).toBe(true);
    expect(result.audio.echoCancellation).toBe(false);
    expect(result.audio.autoGainControl).toBe(true);
    expect(result.pip.autoOpen).toBe(false);
    expect(result.profile.avatar).toBe("data:image/png;base64,abc");
    expect(result.profile.cardAppearance.background.type).toBe("color");
    expect(result.profile.cardAppearance.background.color).toBe("#ff0000");
    expect(result.profile.cardAppearance.background.imageOpacity).toBe(0.5);
    expect(result.profile.cardAppearance.avatarBorder.style).toBe("dashed");
    expect(result.profile.cardAppearance.avatarBorder.color).toBe("#ffffff");
    expect(result.profile.cardAppearance.avatarBorder.width).toBe(5);
    expect(result.profile.cardAppearance.textColor).toBe("#000000");
    expect(result.profile.cardAppearance.textShadow).toBe(true);
  });

  it("неизвестные ключи просто теряются", () => {
    const raw = {
      audio: { inputDeviceId: "x", noiseSuppression: true, extra: 42 },
      pip: { autoOpen: false, unknown: true },
      profile: {
        avatar: "img.png",
        cardAppearance: { background: {}, avatarBorder: {}, extra: "drop" },
      },
    };
    const result = normalizeSettings(raw);
    expect(result.audio.inputDeviceId).toBe("x");
    expect(result.audio.noiseSuppression).toBe(true);
    expect(result.pip.autoOpen).toBe(false);
    expect(result.profile.avatar).toBe("img.png");
  });

  it("out-of-range imageOpacity → fallback", () => {
    const result = normalizeSettings({
      profile: {
        cardAppearance: { background: { type: "image", imageOpacity: 10 } },
      },
    });
    expect(result.profile.cardAppearance.background.imageOpacity).toBe(1);
  });

  it("невалидный enum → fallback", () => {
    const result = normalizeSettings({
      profile: {
        cardAppearance: {
          background: { type: "gradient" as unknown as "none" },
          avatarBorder: { style: "wavy" as unknown as "none" },
        },
      },
    });
    expect(result.profile.cardAppearance.background.type).toBe("none");
    expect(result.profile.cardAppearance.avatarBorder.style).toBe("none");
  });

  it("некорректные типы примитивов → fallback", () => {
    const result = normalizeSettings({
      audio: { noiseSuppression: "true" as unknown as boolean },
      profile: {
        cardAppearance: {
          background: { imageOpacity: "0.5" as unknown as number },
          avatarBorder: { width: "abc" as unknown as number },
        },
      },
    });
    expect(result.audio.noiseSuppression).toBe(
      DEFAULT_SETTINGS.audio.noiseSuppression,
    );
    expect(result.profile.cardAppearance.background.imageOpacity).toBe(
      DEFAULT_CARD_BACKGROUND.imageOpacity,
    );
    expect(result.profile.cardAppearance.avatarBorder.width).toBe(
      DEFAULT_CARD_APPEARANCE.avatarBorder.width,
    );
  });
});
