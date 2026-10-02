import React, { type JSX } from "react";
import * as Styles from "./IconButton.styles";

export type ButtonVariant = "primary" | "secondary" | "error";
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: JSX.Element;
  variant?: ButtonVariant;
}

export const IconButton = ({
  icon,
  variant = "primary",
  ...props
}: IconButtonProps) => {
  return (
    <Styles.IconButton variant={variant} {...props}>
      {icon}
    </Styles.IconButton>
  );
};
