import React from "react";
import * as Styled from "./IconButton.styled";
import type { Icons } from "./constants";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: Icons;
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
