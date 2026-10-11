import { useMemo } from "react";

import { type AudioDevice, defaultDeviceName } from "@cvc/utils";

// Имя устройства, которое браузер использует, когда ничего не выбрано.
export function useDefaultDeviceName(devices: AudioDevice[]): string | null {
  return useMemo(() => defaultDeviceName(devices), [devices]);
}
