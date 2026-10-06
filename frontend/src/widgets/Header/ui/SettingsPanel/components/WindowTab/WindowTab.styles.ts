import styled from "@emotion/styled";

export const Block = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.unit,
  textAlign: "start",
}));

export const ToggleRow = styled.div(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing.layout.small,
}));

export const ToggleInfo = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.unit / 4,
}));

export const ToggleLabel = styled.span(({ theme }) => ({
  fontSize: theme.typography.fontSize.sm,
  fontWeight: 500,
}));

export const ToggleHint = styled.span(({ theme }) => ({
  fontSize: theme.typography.fontSize.xs,
  color: theme.colors.text.secondary,
}));
