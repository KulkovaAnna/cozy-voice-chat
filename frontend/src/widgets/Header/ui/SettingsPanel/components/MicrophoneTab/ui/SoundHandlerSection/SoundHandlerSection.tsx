import { Toggle } from "@cvc/components";
import * as Styles from "./SoundHandlerSection.styles";
import type { AudioSettings } from "@cvc/types/settings";

interface SoundHandlerSectionProps {
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  onChange: (patch: Partial<AudioSettings>) => void;
}

export function SoundHandlerSection(props: SoundHandlerSectionProps) {
  return (
    <>
      <Styles.ToggleRow>
        <Styles.ToggleLabel>Шумоподавление</Styles.ToggleLabel>
        <Toggle
          checked={props.noiseSuppression}
          onChange={(checked) => props.onChange({ noiseSuppression: checked })}
          label=""
        />
      </Styles.ToggleRow>

      <Styles.ToggleRow>
        <Styles.ToggleLabel>Подавление эха</Styles.ToggleLabel>
        <Toggle
          checked={props.echoCancellation}
          onChange={(checked) => props.onChange({ echoCancellation: checked })}
          label=""
        />
      </Styles.ToggleRow>

      <Styles.ToggleRow>
        <Styles.ToggleLabel>Автоусиление</Styles.ToggleLabel>
        <Toggle
          checked={props.autoGainControl}
          onChange={(checked) => props.onChange({ autoGainControl: checked })}
          label=""
        />
      </Styles.ToggleRow>
    </>
  );
}
