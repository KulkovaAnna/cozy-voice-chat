import type { ButtonHTMLAttributes } from "react";
import * as Styled from "./Avatar.styled";
import defaultAvatar from "../../assets/default_ava.jpg";
import mutedIcon from "../../assets/mic_off.svg";

interface AvatarProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isMuted?: boolean;
  src: string;
  size?: number;
}

export const Avatar = ({ src, size, isMuted }: AvatarProps) => {
  return (
    <Styled.RelativeBlock>
      <Styled.Avatar
        src={src ?? defaultAvatar}
        size={size}
        onError={(e) => {
          (e.target as HTMLImageElement).src = defaultAvatar;
        }}
      />
      {!isMuted || <Styled.MutedImg src={mutedIcon} />}
    </Styled.RelativeBlock>
  );
};
