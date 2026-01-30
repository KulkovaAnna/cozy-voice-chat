import type { ButtonHTMLAttributes } from "react";
import * as Styled from "./Avatar.styled";
import defaultAvatar from "../../assets/default_ava.jpg";

interface AvatarProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  src: string;
  size?: number;
}

export const Avatar = ({ src, size }: AvatarProps) => {
  return (
    <Styled.Avatar
      src={src ?? defaultAvatar}
      size={size}
      onError={(e) => {
        (e.target as HTMLImageElement).src = defaultAvatar;
      }}
    />
  );
};
