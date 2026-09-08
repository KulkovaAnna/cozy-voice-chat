import styled from "@emotion/styled";
import type { ButtonVariant } from "./IconButton";
import type { Theme } from "../../theme";

const getColor = (variant: ButtonVariant = "primary", theme: Theme) => {
  switch (variant) {
    case "error":
      return theme.colors.status.error;
    case "primary":
    case "secondary":
      return theme.colors[variant].main;
    default:
      return theme.colors.primary.main;
  }
};

interface IconButtonProps {
  variant?: ButtonVariant;
}

export const IconButton = styled.button<IconButtonProps>(
  ({ variant, theme }) => ({
    color: theme.colors.primary.contrast,
    backgroundColor: getColor(variant, theme),
    border: "none",
    borderRadius: "4px",
    minWidth: "45px",
    maxWidth: "200px",
    height: "45px",
    fontSize: "1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "0.2s ease all",
    "&:not(:disabled):hover": {
      cursor: "pointer",
      backgroundColor:
        variant === "primary"
          ? theme?.colors.primary.dark
          : theme?.colors.secondary.dark,
    },
    "&:disabled": {
      opacity: 0.5,
    },
  }),
);
