import * as Styles from "./Toggle.styles";

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
    <Styles.ToggleContainer disabled={disabled}>
      {label && <Styles.Label>{label}</Styles.Label>}
      <Styles.HiddenInput
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <Styles.Track checked={checked}>
        <Styles.Thumb checked={checked} />
      </Styles.Track>
    </Styles.ToggleContainer>
  );
}
