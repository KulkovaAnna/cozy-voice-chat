import styled from "@emotion/styled";

export const Label = styled.h5(({ theme }) => ({
  fontSize: theme.typography.fontSize.md,
  fontWeight: theme.typography.fontWeight.bold,
  color: theme.colors.text.primary,
}));
