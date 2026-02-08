import React, { type JSX } from "react";
import * as Styled from "./IconButton.styled";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: JSX.Element;
  variant?: "primary" | "secondary";
}

export const IconButton = ({
  icon,
  variant = "primary",
  ...props
}: IconButtonProps) => {
  return (
    <Styled.IconButton variant={variant} {...props}>
      {icon}
    </Styled.IconButton>
  );
};
