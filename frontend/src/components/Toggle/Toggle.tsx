import {
  ToggleContainer,
  HiddenInput,
  Track,
  Thumb,
  Label,
} from "./Toggle.styles";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export function Toggle(props: ToggleProps) {
  const { checked, onChange, label, disabled, id } = props;

  return (
    <ToggleContainer disabled={disabled}>
      {label && <Label>{label}</Label>}
      <HiddenInput
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <Track checked={checked}>
        <Thumb checked={checked} />
      </Track>
    </ToggleContainer>
  );
}
