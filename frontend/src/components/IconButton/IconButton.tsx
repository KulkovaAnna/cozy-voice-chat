import React from "react";
import * as Styled from "./IconButton.styled";
import type { Icons } from "./constants";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: Icons;
}

export const IconButton = ({ icon, ...props }: IconButtonProps) => {
  return <Styled.IconButton {...props}>{icon}</Styled.IconButton>;
};
