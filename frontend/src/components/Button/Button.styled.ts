import styled from "@emotion/styled";

interface ButtonProps {
  primary: boolean;
}

export const Button = styled.button<ButtonProps>(({ theme, primary }) => ({
  color: theme.colors.primary.contrast,
  backgroundColor: primary
    ? theme?.colors.primary.main
    : theme.colors.secondary.main,
  border: `4px solid transparent`,
  borderRadius: "4px",
  padding: "8px",
  minWidth: "100px",
  width: "100%",
  maxWidth: "200px",
  height: "45px",
  "&:hover": {
    cursor: "pointer",
    backgroundColor: primary
      ? theme.colors.primary.dark
      : theme.colors.secondary.dark,
  },
}));
