import styled from "@emotion/styled";

interface AvatarProps {
  size?: number;
  borderStyle?: string;
  borderColor?: string;
  borderWidth?: number;
}

export const Avatar = styled.img<AvatarProps>(
  ({ size, borderStyle, borderColor, borderWidth }) => ({
    width: size ?? "100%",
    height: size ?? "100%",
    borderRadius: "50%",
    objectFit: "cover" as const,
    boxSizing: "border-box" as const,
    ...(borderStyle && borderStyle !== "none" && (borderWidth ?? 0) > 0
      ? {
          borderStyle,
          borderColor: borderColor ?? "#ffffff",
          borderWidth,
        }
      : {}),
  }),
);
