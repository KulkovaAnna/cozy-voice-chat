import { describe, expect, it, vi } from "vitest";

import {
  buildAudioConstraints,
  getAudioDevices,
  getPreferredDevice,
  hasPermissionFromDevices,
  isDeviceAvailable,
  isDeviceIdValid,
  listAudioDevices,
} from "./microphones";

import type { AudioDevice } from "./types";

const AUDIO_INPUT: MediaDeviceInfo = {
  deviceId: "mic-1",
  groupId: "group-1",
  kind: "audioinput",
  label: "Microphone",
  toJSON: () => ({}),
};

const VIRTUAL_INPUT: MediaDeviceInfo = {
  deviceId: "virtual-1",
  groupId: "group-2",
  kind: "audioinput",
  label: "Virtual Cable Input",
  toJSON: () => ({}),
};

const AUDIO_OUTPUT: MediaDeviceInfo = {
  deviceId: "speaker-1",
  groupId: "group-3",
  kind: "audiooutput",
  label: "Speaker",
  toJSON: () => ({}),
};

function mockMediaDevices(devices: MediaDeviceInfo[]) {
  const stop = vi.fn();

  const mediaDevices = {
    enumerateDevices: vi.fn().mockResolvedValue(devices),
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop }],
    }),
  };

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { mediaDevices },
  });

  return { mediaDevices, stop };
}

describe("getAudioDevices", () => {
  it("returns only audioinput devices and stops the permission stream", async () => {
    const { stop } = mockMediaDevices([
      AUDIO_INPUT,
      AUDIO_OUTPUT,
      VIRTUAL_INPUT,
    ]);

    const devices = await getAudioDevices();

    expect(devices).toEqual([
      { deviceId: "mic-1", kind: "audioinput", label: "Microphone" },
      {
        deviceId: "virtual-1",
        kind: "audioinput",
        label: "Virtual Cable Input",
      },
    ]);
    expect(stop).toHaveBeenCalledTimes(1);
  });
});

describe("buildAudioConstraints", () => {
  it("returns plain constraints for the default device", () => {
    expect(buildAudioConstraints("default")).toEqual({
      autoGainControl: false,
      echoCancellation: true,
      noiseSuppression: false,
    });
  });

  it("pins the exact deviceId for a concrete device", () => {
    expect(buildAudioConstraints("mic-1")).toEqual({
      autoGainControl: false,
      deviceId: { exact: "mic-1" },
      echoCancellation: true,
      noiseSuppression: false,
    });
  });
});

describe("getPreferredDevice", () => {
  it("prefers a virtual device over the first one", () => {
    const devices: AudioDevice[] = [
      { deviceId: "mic-1", kind: "audioinput", label: "Microphone" },
      {
        deviceId: "virtual-1",
        kind: "audioinput",
        label: "Virtual Cable Input",
      },
    ];

    expect(getPreferredDevice(devices)?.deviceId).toBe("virtual-1");
  });

  it("skips devices with an empty deviceId", () => {
    const devices: AudioDevice[] = [
      { deviceId: "", kind: "audioinput", label: "" },
      { deviceId: "mic-1", kind: "audioinput", label: "Microphone" },
    ];

    expect(getPreferredDevice(devices)?.deviceId).toBe("mic-1");
  });

  it("returns null when there are no usable devices", () => {
    expect(getPreferredDevice([])).toBeNull();
  });
});

describe("isDeviceAvailable", () => {
  const devices: AudioDevice[] = [
    { deviceId: "mic-1", kind: "audioinput", label: "Microphone" },
  ];

  it("treats null and default as always available", () => {
    expect(isDeviceAvailable(devices, null)).toBe(true);
    expect(isDeviceAvailable(devices, "default")).toBe(true);
  });

  it("checks a concrete deviceId against the list", () => {
    expect(isDeviceAvailable(devices, "mic-1")).toBe(true);
    expect(isDeviceAvailable(devices, "mic-2")).toBe(false);
  });
});

describe("isDeviceIdValid", () => {
  it("accepts null, default and non-empty ids", () => {
    expect(isDeviceIdValid(null)).toBe(true);
    expect(isDeviceIdValid("default")).toBe(true);
    expect(isDeviceIdValid("mic-1")).toBe(true);
    expect(isDeviceIdValid("")).toBe(false);
  });
});

describe("listAudioDevices", () => {
  it("enumerates without requesting permission via getUserMedia", async () => {
    const { mediaDevices } = mockMediaDevices([AUDIO_INPUT, AUDIO_OUTPUT]);

    const devices = await listAudioDevices();

    expect(devices).toEqual([
      { deviceId: "mic-1", kind: "audioinput", label: "Microphone" },
    ]);
    expect(mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });
});

describe("hasPermissionFromDevices", () => {
  it("is false when every deviceId is empty", () => {
    expect(
      hasPermissionFromDevices([
        { deviceId: "", kind: "audioinput", label: "" },
      ]),
    ).toBe(false);
  });

  it("is true when at least one deviceId is present", () => {
    expect(
      hasPermissionFromDevices([
        { deviceId: "mic-1", kind: "audioinput", label: "Microphone" },
      ]),
    ).toBe(true);
  });
});
