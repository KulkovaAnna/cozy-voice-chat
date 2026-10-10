import { ColorInput, Range, Select } from "@cvc/components";
import type { AvatarBorder, BorderStyle } from "@cvc/types";

import * as Styles from "./AvatarBorderEditor.styles";
import { Label } from "../Label";

const BORDER_STYLE_OPTIONS = [
  { value: "none", label: "Без рамки" },
  { value: "solid", label: "Сплошная" },
  { value: "dashed", label: "Штриховая" },
  { value: "dotted", label: "Точечная" },
  { value: "double", label: "Двойная" },
];

const MIN_WIDTH = 1;
const MAX_WIDTH = 10;

interface AvatarBorderEditorProps {
  value: AvatarBorder;
  onChange: (border: AvatarBorder) => void;
}

export function AvatarBorderEditor(props: AvatarBorderEditorProps) {
  const isBorderVisible = props.value.style !== "none";

  const changeStyle = (style: BorderStyle) => {
    props.onChange({ ...props.value, style });
  };

  const changeColor = (color: string) => {
    props.onChange({ ...props.value, color });
  };

  const changeWidth = (width: number) => {
    props.onChange({ ...props.value, width });
  };

  return (
    <Styles.Container>
      <Label>Рамка аватара</Label>
      <Styles.Row>
        <Select
          options={BORDER_STYLE_OPTIONS}
          value={props.value.style}
          onChange={(value) => changeStyle(value as BorderStyle)}
          aria-label="Стиль рамки аватара"
        />
        {isBorderVisible && (
          <>
            <ColorInput
              value={props.value.color}
              onChange={changeColor}
              aria-label="Цвет рамки аватара"
            />
            <Range
              min={MIN_WIDTH}
              max={MAX_WIDTH}
              step={1}
              value={props.value.width}
              onChange={changeWidth}
              aria-label="Толщина рамки аватара"
            />
            <Styles.WidthValue>{props.value.width}px</Styles.WidthValue>
          </>
        )}
      </Styles.Row>
    </Styles.Container>
  );
}
