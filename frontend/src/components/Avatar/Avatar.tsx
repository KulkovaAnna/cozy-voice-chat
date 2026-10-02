import type { ButtonHTMLAttributes } from "react";

import defaultAvatar from "@cvc/assets/default_ava.jpg";

import * as Styles from "./Avatar.styles";

interface AvatarProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  src?: string;
  size?: number;
}

export const Avatar = ({ src, size }: AvatarProps) => {
  return (
    <Styles.Avatar
      src={src || defaultAvatar}
      size={size}
      onError={(e) => {
        (e.target as HTMLImageElement).src = defaultAvatar;
      }}
    />
  );
};
