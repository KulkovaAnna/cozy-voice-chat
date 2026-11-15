import styled from "@emotion/styled";

export const Title = styled.h2({
  margin: 0,
  paddingBottom: "0.5rem",
});

export const ErrorBlock = styled.div(({ theme }) => ({
  display: "flex",
  flexFlow: "column",
  gap: theme.spacing.layout.small,
  width: "100%",
  boxSizing: "border-box",
  padding: theme.spacing.layout.small,
  border: `1px solid ${theme.colors.status.error}`,
  borderRadius: "4px",
}));

export const ErrorMessage = styled.p(({ theme }) => ({
  margin: 0,
  color: theme.colors.status.error,
  fontWeight: theme.typography.fontWeight.medium,
}));

export const ErrorHint = styled.p(({ theme }) => ({
  margin: 0,
  color: theme.colors.text.secondary,
  fontSize: theme.typography.fontSize.sm,
}));