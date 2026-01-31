import styled from "@emotion/styled";

interface AvatarProps {
  size?: number;
}

export const RelativeBlock = styled.div({
  position: "relative",
});

export const Avatar = styled.img<AvatarProps>(({ size }) => ({
  width: size ?? "100%",
  height: size ?? "100%",
  borderRadius: "50%",
  objectFit: "cover" as const,
}));

export const MutedImg = styled.img(({ theme }) => ({
  position: "absolute",
  bottom: 0,
  right: 0,
  borderRadius: "50%",
  backgroundColor: theme.colors.primary.light,
}));
