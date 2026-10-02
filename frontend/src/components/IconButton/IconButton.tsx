import React, { type JSX } from "react";
import * as Styles from "./IconButton.styles";

export type ButtonVariant = "primary" | "secondary" | "error";
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: JSX.Element;
  variant?: ButtonVariant;
}

export const IconButton = (props: IconButtonProps) => {
  const { icon, variant = "primary", ...rest } = props;
  return (
    <Styles.IconButton variant={variant} {...rest}>
      {icon}
    </Styles.IconButton>
  );
};
