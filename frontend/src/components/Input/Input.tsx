import type { InputHTMLAttributes } from "react";
import * as Styled from "./Input.styled";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = ({ ...props }: InputProps) => {
  return <Styled.Input {...props} />;
};
