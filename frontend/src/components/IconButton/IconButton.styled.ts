import styled from "@emotion/styled";

interface IconButtonProps {
  variant?: "primary" | "secondary";
}

export const IconButton = styled.button<IconButtonProps>(
  ({ variant, theme }) => ({
    color: theme.colors.primary.contrast,
    backgroundColor:
      variant === "primary"
        ? theme?.colors.primary.main
        : theme?.colors.secondary.main,
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
