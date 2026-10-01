import { Button, Select } from "@cvc/components";
import type { MicrophonePermission } from "@cvc/hooks";
import type { AudioDevice } from "@cvc/utils";
import * as Styles from "./MicSelectSection.styles";

interface MicSelectSectionProps {
  inputDeviceId: string | null;
  permission: MicrophonePermission;
  devices: AudioDevice[];
  onChange: (deviceId: string) => void;
  onRequestPermission: () => void;
}

export function MicSelectSection(props: MicSelectSectionProps) {
  return (
    <>
      <Styles.Hint>
        {props.permission === "denied"
          ? "Нет доступа к микрофону. Разрешите доступ в браузере, чтобы выбрать устройство."
          : "Выберите устройство, которое будет использоваться в голосовом чате"}
      </Styles.Hint>

      <Select
        value={props.inputDeviceId ?? "default"}
        onChange={props.onChange}
        disabled={props.devices.length === 0}
        aria-label="Микрофон"
        options={
          props.devices.length === 0
            ? [{ value: "default", label: "Устройства не найдены" }]
            : [
                ...props.devices.map((device) => ({
                  value: device.deviceId,
                  label:
                    device.label || `Микрофон ${device.deviceId.slice(0, 6)}`,
                })),
              ]
        }
      />

      {props.permission !== "granted" && (
        <Styles.Actions>
          <Button variant="secondary" onClick={props.onRequestPermission}>
            Разрешить доступ
          </Button>
        </Styles.Actions>
      )}
    </>
  );
}
