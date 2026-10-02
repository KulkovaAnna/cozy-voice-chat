import React from "react";
import * as Styles from "./Button.styles";

export type ButtonVariant = "primary" | "secondary" | string;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children?: React.ReactNode;
}

export const Button = ({ variant, children, ...props }: ButtonProps) => {
  return (
    <Styles.Button $variant={variant} {...props}>
      {children}
    </Styles.Button>
  );
};
