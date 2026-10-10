import styled from "@emotion/styled";

export const Container = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.unit,
  textAlign: "start",
}));

export const Row = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.unit,
  flexWrap: "wrap",
}));

export const WidthValue = styled.span(({ theme }) => ({
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.text.secondary,
  minWidth: 34,
}));
