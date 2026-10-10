import styled from "@emotion/styled";

export const Input = styled.input(({ theme }) => ({
  width: 35,
  height: 35,
  padding: 2,
  border: `2px solid ${theme.colors.background.darker}`,
  borderRadius: theme.borderRadius.small,
  backgroundColor: theme.colors.background.default,
  cursor: "pointer",

  "&:disabled": {
    cursor: "not-allowed",
    opacity: 0.5,
  },
}));
