import styled from "@emotion/styled";

export const Hint = styled.p(({ theme }) => ({
  margin: 0,
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.text.secondary,
}));

export const Actions = styled.div(({ theme }) => ({
  display: "flex",
  gap: theme.spacing.unit,
  flexWrap: "wrap",
}));
