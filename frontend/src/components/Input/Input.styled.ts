import styled from "@emotion/styled";

export const Input = styled.input(({ theme }) => ({
  color: theme.colors.primary.contrast,
  backgroundColor: theme?.colors.background.default,
  outline: "none",
  border: `4px solid transparent`,
  borderRadius: "4px",
  padding: "8px",
  minWidth: "100px",
  width: "100%",
  maxWidth: "200px",
  height: "45px",
  boxSizing: "border-box",
  "&:hover": {
    cursor: "pointer",
    backgroundColor: theme.colors.background.darker,
  },
  "&:focus": {
    borderColor: theme.colors.primary.main,
  },
  "&:is(:-internal-autofill-selected, :-webkit-autofill, :autofill)": {
    WebkitTextFillColor: theme.colors.primary.contrast,
    WebkitBoxShadow: `0 0 0 1000px ${theme?.colors.background.darker} inset !important`,
    borderColor: theme.colors.primary.dark,
  },
}));
