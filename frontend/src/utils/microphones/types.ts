export interface AudioDevice {
  deviceId: string;
  kind: MediaDeviceKind;
  label: string;
  // Устройство, которое браузер берёт, когда ничего не выбрано (системный дефолт).
  isDefault: boolean;
}
