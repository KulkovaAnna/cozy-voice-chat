import * as Styled from "./Avatar.styled";

interface AvatarProps {
  src: string;
}

export const Avatar = ({ src }: AvatarProps) => {
  return <Styled.Avatar src={src} />;
};
