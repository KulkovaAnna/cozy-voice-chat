import styled from "@emotion/styled";

interface AvatarProps {
  size?: number;
}

export const Avatar = styled.img<AvatarProps>(({ size }) => ({
  width: size ?? "100%",
  height: size ?? "100%",
  borderRadius: "50%",
  objectFit: "cover" as const,
}));
