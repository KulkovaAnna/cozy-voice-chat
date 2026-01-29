import type { ButtonHTMLAttributes } from "react";
import * as Styled from "./Avatar.styled";

interface AvatarProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  src: string;
  size?: number;
}

export const Avatar = ({ src, size }: AvatarProps) => {
  return <Styled.Avatar src={src} size={size} />;
};
