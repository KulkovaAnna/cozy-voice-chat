import { useMicrophones, useSettingActions, useSettings } from "@cvc/hooks";

import { Delimiter } from "@cvc/components";
import { Section } from "../Section";
import * as Styles from "./MicrophoneTab.styles";
import { MicSelectSection, SoundHandlerSection } from "./ui";

export const MicrophoneTab = () => {
  const { inputDeviceId, noiseSuppression, echoCancellation, autoGainControl } =
    useSettings().audio;
  const { setInputDeviceId, setAudio } = useSettingActions();
  const { devices, permission, requestPermission } =
    useMicrophones(inputDeviceId);

  return (
    <Styles.Block>
      <Section title="Устройство записи звука">
        <MicSelectSection
          devices={devices}
          inputDeviceId={inputDeviceId}
          onChange={setInputDeviceId}
          permission={permission}
          onRequestPermission={requestPermission}
        />
      </Section>

      <Delimiter />

      <Section title="Обработка звука">
        <SoundHandlerSection
          autoGainControl={autoGainControl}
          echoCancellation={echoCancellation}
          noiseSuppression={noiseSuppression}
          onChange={setAudio}
        />
      </Section>
    </Styles.Block>
  );
};
