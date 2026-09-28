import React from "react";
import * as Styled from "./Button.styled";

export type ButtonVariant = "primary" | "secondary" | string;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children?: React.ReactNode;
}

export const Button = ({ variant, children, ...props }: ButtonProps) => {
  return (
    <Styled.Button $variant={variant} {...props}>
      {children}
    </Styled.Button>
  );
};
