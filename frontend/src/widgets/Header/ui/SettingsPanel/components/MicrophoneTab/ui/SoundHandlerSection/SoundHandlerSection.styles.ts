import styled from "@emotion/styled";

export const ToggleRow = styled.div(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing.unit,
  padding: `${theme.spacing.unit / 2}px 0`,
}));

export const ToggleLabel = styled.span(({ theme }) => ({
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.text.primary,
  flex: 1,
}));
