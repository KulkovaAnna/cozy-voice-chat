import styled from "@emotion/styled";

interface AvatarProps {
  size: number;
}

export const Header = styled.div(({ theme }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  zIndex: 10000,
  display: "flex",
  flexFlow: "row",
  backgroundColor: theme.colors.background.card,
  justifyContent: "space-between",
  gap: "2rem",
  padding: "0.5rem 1rem",
  width: "100%",
  boxSizing: "border-box",
  boxShadow: `0px 2px 16px ${theme.colors.primary.main},
  0px 4px 16px ${theme.colors.secondary.main}`,
}));

export const RightPanel = styled.div(() => ({
  display: "flex",
  flexFlow: "row",
  justifyContent: "right",
  alignItems: "center",
  width: "fit-content",
  gap: "1rem",
}));

export const InvisibleButton = styled.button<AvatarProps>(
  ({ size, theme }) => ({
    width: `${size}px`,
    height: `${size}px`,
    background: "none",
    border: "none",
    borderRadius: "50%",
    backgroundColor: theme.colors.secondary.main,
    "&:hover": {
      cursor: "pointer",
    },
  }),
);
