import styled from "@emotion/styled";

export const Container = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.unit / 2,
  paddingTop: theme.spacing.unit,
  textAlign: "start",
}));

export const Title = styled.h4(({ theme }) => ({
  fontSize: theme.typography.fontSize.xs,
  color: theme.colors.text.secondary,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: theme.spacing.unit,
}));
