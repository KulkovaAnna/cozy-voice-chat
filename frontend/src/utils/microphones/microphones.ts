import type { AudioDevice } from "./types";

export const DEFAULT_DEVICE_ID = "default";

function normalizeDevice(raw: MediaDeviceInfo): AudioDevice {
  return {
    deviceId: raw.deviceId,
    kind: raw.kind,
    label: raw.label,
  };
}

function isAudioInput(device: MediaDeviceInfo): boolean {
  return device.kind === "audioinput";
}

function isVirtualDevice(device: AudioDevice): boolean {
  const label = device.label.toLowerCase();

  return (
    label.includes("virtual") ||
    label.includes("cable") ||
    label.includes("split") ||
    label.includes("mask")
  );
}

export function isDeviceIdValid(deviceId: string | null): boolean {
  return (
    deviceId === null || deviceId === DEFAULT_DEVICE_ID || deviceId.length > 0
  );
}

export async function getAudioDevices(): Promise<AudioDevice[]> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  stream.getTracks().forEach((track) => track.stop());

  const devices = await navigator.mediaDevices.enumerateDevices();

  return devices.filter(isAudioInput).map(normalizeDevice);
}

export async function listAudioDevices(): Promise<AudioDevice[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();

  return devices.filter(isAudioInput).map(normalizeDevice);
}

export function hasPermissionFromDevices(devices: AudioDevice[]): boolean {
  return devices.some((device) => device.deviceId.length > 0);
}

export async function playMicrophoneTest(
  deviceId: string,
  durationMs = 1200,
): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: buildAudioConstraints(deviceId),
  });

  try {
    const blob = await recordSample(stream, durationMs);

    if (!blob.size) return;

    await playBlob(blob);
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

function recordSample(stream: MediaStream, durationMs: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = (event) =>
      reject(event.error ?? new Error("record failed"));
    recorder.onstop = () =>
      resolve(new Blob(chunks, { type: recorder.mimeType }));

    recorder.start();
    setTimeout(() => recorder.stop(), durationMs);
  });
}

async function playBlob(blob: Blob): Promise<void> {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const context = new AudioCtx();
  const buffer = await context.decodeAudioData(await blob.arrayBuffer());
  const source = context.createBufferSource();

  source.buffer = buffer;
  source.connect(context.destination);
  source.onended = () => void context.close();
  source.start();
}

export function buildAudioConstraints(deviceId: string): MediaTrackConstraints {
  if (deviceId === DEFAULT_DEVICE_ID) {
    return {
      // TODO: на будущее, когда будем добавлять настройки шумодава
      // autoGainControl: false,
      // echoCancellation: true,
      // noiseSuppression: false,
    };
  }

  return {
    // TODO: на будущее, когда будем добавлять настройки шумодава
    // autoGainControl: false,
    // deviceId: { exact: deviceId },
    // echoCancellation: true,
    // noiseSuppression: false,
  };
}

export function getPreferredDevice(devices: AudioDevice[]): AudioDevice | null {
  const validDevices = devices.filter((device) => device.deviceId.length > 0);

  return validDevices.find(isVirtualDevice) ?? validDevices[0] ?? null;
}

export function isDeviceAvailable(
  devices: AudioDevice[],
  deviceId: string | null,
): boolean {
  if (deviceId === null || deviceId === DEFAULT_DEVICE_ID) {
    return true;
  }

  return devices.some((device) => device.deviceId === deviceId);
}
