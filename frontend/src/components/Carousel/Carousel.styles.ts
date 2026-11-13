import type { Theme } from "@cvc/theme";
import styled from "@emotion/styled";

/** Общий вид круглых кнопок поверх затемнения */
const controlStyles = (theme: Theme) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  border: "none",
  borderRadius: theme.borderRadius.circle,
  color: theme.colors.primary.contrast,
  backgroundColor: "rgba(0, 0, 0, 0.45)",
  cursor: "pointer",
  transition: `${theme.transitions.fast} ease background-color`,
  "&:hover": {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.colors.primary.light}`,
    outlineOffset: 2,
  },
});

export const Overlay = styled.div(({ theme }) => ({
  position: "fixed",
  inset: 0,
  zIndex: theme.zIndex.modal + 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing.layout.small,
  boxSizing: "border-box",
  backgroundColor: "rgba(0, 0, 0, 0.85)",
}));

/** Сцена просмотра — примерно 80% экрана, на мобиле во весь экран */
export const Stage = styled.div(({ theme }) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "80vw",
  height: "80vh",
  maxWidth: "100%",
  maxHeight: "100%",
  padding: "0 48px",
  boxSizing: "border-box",

  [`@media screen and (max-width: ${theme.breakpoints.mobile})`]: {
    width: "100%",
    height: "100%",
    padding: 0,
  },
}));

export const Image = styled.img(({ theme }) => ({
  maxWidth: "100%",
  maxHeight: "100%",
  borderRadius: theme.borderRadius.medium,
  boxShadow: theme.shadows.large,
  objectFit: "contain",
  userSelect: "none",
}));

export const NavButton = styled.button<{ $side: "left" | "right" }>(
  ({ theme, $side }) => ({
    ...controlStyles(theme),
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 44,
    height: 44,
    [$side]: 4,
    "& svg": {
      width: 22,
      height: 22,
    },
  }),
);

export const CloseButton = styled.button(({ theme }) => ({
  ...controlStyles(theme),
  position: "absolute",
  top: theme.spacing.layout.small,
  right: theme.spacing.layout.small,
  width: 40,
  height: 40,
  "& svg": {
    width: 20,
    height: 20,
  },
}));

export const Counter = styled.span(({ theme }) => ({
  position: "absolute",
  bottom: 8,
  left: "50%",
  transform: "translateX(-50%)",
  padding: `4px ${theme.spacing.unit}px`,
  borderRadius: theme.borderRadius.circle,
  backgroundColor: "rgba(0, 0, 0, 0.55)",
  color: theme.colors.primary.contrast,
  fontSize: theme.typography.fontSize.sm,
  fontVariantNumeric: "tabular-nums",
  pointerEvents: "none",
}));
