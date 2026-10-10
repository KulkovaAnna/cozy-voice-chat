import * as Styles from "./ColorInput.styles";

interface ColorInputProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

export function ColorInput(props: ColorInputProps) {
  const { value, onChange, disabled = false, "aria-label": ariaLabel } = props;

  return (
    <Styles.Input
      type="color"
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
