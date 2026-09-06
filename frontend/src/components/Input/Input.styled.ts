import { type CSSObject } from "@emotion/react";
import styled from "@emotion/styled";
import type { Theme } from "../../theme";

const getStyles = (theme: Theme): CSSObject => ({
  color: theme.colors.text.primary,
  backgroundColor: theme?.colors.background.default,
  outline: "none",
  border: `4px solid transparent`,
  borderRadius: "4px",
  padding: "8px",
  minWidth: "100px",
  width: "100%",
  maxWidth: "200px",
  minHeight: "45px",
  height: "45px",
  boxSizing: "border-box",
  transition: "0.2s ease all",
  "&:hover": {
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
});

export const Input = styled.input(({ theme }) => ({
  ...getStyles(theme),
}));

export const Textarea = styled.textarea(({ theme }) => ({
  ...getStyles(theme),
}));
