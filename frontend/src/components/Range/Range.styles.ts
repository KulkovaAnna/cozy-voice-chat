import styled from "@emotion/styled";

export const Input = styled.input(({ theme }) => ({
  flex: 1,
  minWidth: 100,
  maxWidth: 200,
  accentColor: theme.colors.primary.main,
  cursor: "pointer",

  "&:disabled": {
    cursor: "not-allowed",
    opacity: 0.5,
  },
}));
