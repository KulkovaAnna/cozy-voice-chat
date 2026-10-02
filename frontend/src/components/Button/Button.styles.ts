import { darken } from "@cvc/theme/utils";
import styled from "@emotion/styled";
import type { ButtonVariant } from "./Button";

interface ButtonProps {
  $variant?: ButtonVariant;
}

export const Button = styled.button<ButtonProps>(({ theme, $variant }) => {
  const bgColor =
    $variant === "primary"
      ? theme.colors.primary.main
      : $variant === "secondary"
        ? theme.colors.secondary.main
        : $variant || theme.colors.primary.main;

  return {
    color: theme.colors.primary.contrast,
    backgroundColor: bgColor,
    border: `4px solid transparent`,
    borderRadius: "4px",
    padding: "8px",
    minWidth: "100px",
    width: "100%",
    maxWidth: "200px",
    height: "45px",
    transition: theme.transitions.normal,
    "&:hover": {
      cursor: "pointer",
      backgroundColor: darken(bgColor, 0.3),
    },
  };
});
