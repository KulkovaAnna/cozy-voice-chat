export interface SelectBaseOption {
  value: string;
  label: string;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectBaseOption[];
}

export type SelectOption = SelectBaseOption | SelectOptionGroup;

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}
