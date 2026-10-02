import React from "react";
import * as Styles from "./Button.styles";

export type ButtonVariant = "primary" | "secondary" | string;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children?: React.ReactNode;
}

export const Button = (props: ButtonProps) => {
  const { variant, children, ...rest } = props;
  return (
    <Styles.Button $variant={variant} {...rest}>
      {children}
    </Styles.Button>
  );
};
