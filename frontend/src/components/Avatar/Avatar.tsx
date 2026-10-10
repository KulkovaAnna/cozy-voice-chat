import type { ImgHTMLAttributes } from "react";

import defaultAvatar from "@cvc/assets/default_ava.jpg";

import * as Styles from "./Avatar.styles";

interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  size?: number;
  border?: {
    style: string;
    color: string;
    width: number;
  };
}

export const Avatar = (props: AvatarProps) => {
  const { src, size, border, ...rest } = props;

  return (
    <Styles.Avatar
      src={src || defaultAvatar}
      size={size}
      borderStyle={border?.style}
      borderColor={border?.color}
      borderWidth={border?.width}
      onError={(e) => {
        (e.target as HTMLImageElement).src = defaultAvatar;
      }}
      {...rest}
    />
  );
};
