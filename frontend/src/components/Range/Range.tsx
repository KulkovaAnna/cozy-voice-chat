import * as Styles from "./Range.styles";

interface RangeProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  "aria-label"?: string;
}

export function Range(props: RangeProps) {
  const {
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    "aria-label": ariaLabel,
  } = props;

  return (
    <Styles.Input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}
