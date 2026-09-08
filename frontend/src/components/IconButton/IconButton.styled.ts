import styled from "@emotion/styled";
import type { ButtonVariant } from "./IconButton";
import type { Theme } from "../../theme";

const getColor = (variant: ButtonVariant = "primary", theme: Theme) => {
  switch (variant) {
    case "error":
      return {
        main: theme.colors.status.error,
        hover: theme.colors.status.error,
      };
    case "primary":
    case "secondary":
      return {
        main: theme.colors[variant].main,
        hover: theme.colors[variant].dark,
      };
  }
};

interface IconButtonProps {
  variant?: ButtonVariant;
}

export const IconButton = styled.button<IconButtonProps>(
  ({ variant, theme }) => ({
    color: theme.colors.primary.contrast,
    backgroundColor: getColor(variant, theme).main,
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
      backgroundColor: getColor(variant, theme).hover,
    },
    "&:disabled": {
      opacity: 0.5,
    },
  }),
);
