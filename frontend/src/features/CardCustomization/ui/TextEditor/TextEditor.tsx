import { ColorInput, Toggle } from "@cvc/components";
import type { CardAppearance } from "@cvc/types";

import * as Styles from "./TextEditor.styles";
import { Label } from "../Label";
import { useTheme } from "@emotion/react";

export type CardTextSettings = Pick<CardAppearance, "textColor" | "textShadow">;

interface TextEditorProps {
  value: CardTextSettings;
  onChange: (settings: CardTextSettings) => void;
}

export function TextEditor(props: TextEditorProps) {
  const theme = useTheme();
  const changeColor = (textColor: string) => {
    props.onChange({ ...props.value, textColor });
  };

  const changeShadow = (textShadow: boolean) => {
    props.onChange({ ...props.value, textShadow });
  };

  return (
    <Styles.Container>
      <Label>Текст карточки</Label>

      <Styles.Row>
        <Styles.RowLabel>Цвет текста</Styles.RowLabel>

        <ColorInput
          value={props.value.textColor ?? theme.colors.text.primary}
          onChange={changeColor}
          aria-label="Цвет текста карточки"
        />
      </Styles.Row>

      <Styles.Row>
        <Styles.RowLabel>Тень текста</Styles.RowLabel>
        <Toggle
          checked={props.value.textShadow}
          onChange={changeShadow}
          label=""
        />
      </Styles.Row>
    </Styles.Container>
  );
}
