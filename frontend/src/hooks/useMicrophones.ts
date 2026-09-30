import { useCallback, useEffect, useState } from "react";

import {
  type AudioDevice,
  buildAudioConstraints,
  hasPermissionFromDevices,
  listAudioDevices,
} from "@cvc/utils";

export type MicrophonePermission = "unknown" | "granted" | "denied";

export interface UseMicrophonesResult {
  devices: AudioDevice[];
  hasPermission: boolean;
  permission: MicrophonePermission;
  refresh: () => Promise<void>;
  requestPermission: () => Promise<void>;
}

export function useMicrophones(
  selectedDeviceId: string | null,
): UseMicrophonesResult {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [permission, setPermission] = useState<MicrophonePermission>("unknown");

  const hasPermission = permission === "granted";

  const refresh = useCallback(async () => {
    const nextDevices = await listAudioDevices();

    setDevices(nextDevices);
    setPermission(hasPermissionFromDevices(nextDevices) ? "granted" : "denied");
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: buildAudioConstraints(selectedDeviceId ?? "default"),
      });

      stream.getTracks().forEach((track) => track.stop());
      await refresh();
    } catch {
      setPermission("denied");
    }
  }, [refresh, selectedDeviceId]);

  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      void listAudioDevices().then((nextDevices) => {
        if (cancelled) return;

        setDevices(nextDevices);
        setPermission(
          hasPermissionFromDevices(nextDevices) ? "granted" : "denied",
        );
      });
    };

    sync();

    const mediaDevices = navigator.mediaDevices;

    if (!mediaDevices?.addEventListener) {
      return () => {
        cancelled = true;
      };
    }

    mediaDevices.addEventListener("devicechange", sync);

    return () => {
      cancelled = true;
      mediaDevices.removeEventListener("devicechange", sync);
    };
  }, []);

  return { devices, hasPermission, permission, refresh, requestPermission };
}
