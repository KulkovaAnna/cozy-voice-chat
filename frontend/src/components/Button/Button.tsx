import React from "react";
import * as Styled from "./Button.styled";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isPrimary?: boolean;
  children?: React.ReactNode;
}

export const Button = ({
  isPrimary = false,
  children,
  ...props
}: ButtonProps) => {
  return (
    <Styled.Button primary={isPrimary} {...props}>
      {children}
    </Styled.Button>
  );
};
