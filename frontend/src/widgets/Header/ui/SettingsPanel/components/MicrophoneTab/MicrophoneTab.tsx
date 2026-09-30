import { Button, Select } from "@cvc/components";
import { useMicrophones, useSettingActions, useSettings } from "@cvc/hooks";

import * as Styles from "./MicrophoneTab.styles";

export const MicrophoneTab = () => {
  const selectedId = useSettings().audio.inputDeviceId;
  const { setInputDeviceId } = useSettingActions();
  const { devices, permission, requestPermission } = useMicrophones(selectedId);

  return (
    <Styles.Block>
      <Styles.Hint>
        {permission === "denied"
          ? "Нет доступа к микрофону. Разрешите доступ в браузере, чтобы выбрать устройство."
          : "Выберите устройство, которое будет использоваться в голосовом чате"}
      </Styles.Hint>

      <Select
        value={selectedId ?? "auto"}
        onChange={setInputDeviceId}
        disabled={devices.length === 0}
        aria-label="Микрофон"
        options={
          devices.length === 0
            ? [{ value: "default", label: "Устройства не найдены" }]
            : [
                { value: "auto", label: "Автовыбор (системный микрофон)" },
                ...devices.map((device) => ({
                  value: device.deviceId,
                  label:
                    device.label || `Микрофон ${device.deviceId.slice(0, 6)}`,
                })),
              ]
        }
      />

      {permission !== "granted" && (
        <Styles.Actions>
          <Button variant="secondary" onClick={requestPermission}>
            Разрешить доступ
          </Button>
        </Styles.Actions>
      )}
    </Styles.Block>
  );
};
