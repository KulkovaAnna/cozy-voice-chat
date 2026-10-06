import { Toggle } from "@cvc/components";
import { useSettingActions, useSettings } from "@cvc/hooks";
import { usePiP } from "@cvc/providers";

import { Section } from "../Section";
import * as Styles from "./WindowTab.styles";

export const WindowTab = () => {
  const { autoOpen } = useSettings().pip;
  const { setPip } = useSettingActions();
  const { isSupported, close } = usePiP();

  const handleChange = (checked: boolean) => {
    setPip({ autoOpen: checked });
    // При отключении закрываем уже открытое окно, чтобы настройка
    // подействовала сразу, а не после перезагрузки.
    if (!checked) close();
  };

  return (
    <Styles.Block>
      <Section title="PiP-окно">
        <Styles.ToggleRow>
          <Styles.ToggleInfo>
            <Styles.ToggleLabel>
              Автоматическое появление окна
            </Styles.ToggleLabel>
            <Styles.ToggleHint>
              {isSupported
                ? "PiP-окно откроется само, когда вы переключитесь на другой таб во время звонка."
                : "Ваш браузер не поддерживает Document Picture-in-Picture"}
            </Styles.ToggleHint>
          </Styles.ToggleInfo>
          <Toggle
            checked={autoOpen}
            onChange={handleChange}
            disabled={!isSupported}
            label=""
          />
        </Styles.ToggleRow>
      </Section>
    </Styles.Block>
  );
};
