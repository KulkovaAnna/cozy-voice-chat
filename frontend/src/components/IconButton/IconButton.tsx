import React from "react";
import * as Styled from "./IconButton.styled";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  variant?: "primary" | "secondary";
}

export const IconButton = ({
  icon,
  variant = "primary",
  ...props
}: IconButtonProps) => {
  return (
    <Styled.IconButton variant={variant} {...props}>
      <img src={icon} />
    </Styled.IconButton>
  );
};
