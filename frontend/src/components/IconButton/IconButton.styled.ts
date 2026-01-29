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
    padding: "8px",
    minWidth: "45px",
    maxWidth: "200px",
    height: "45px",
    fontSize: "1rem",
    "&:hover": {
      cursor: "pointer",
      backgroundColor:
        variant === "primary"
          ? theme?.colors.primary.dark
          : theme?.colors.secondary.dark,
    },
  }),
);
