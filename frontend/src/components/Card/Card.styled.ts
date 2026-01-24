import styled from "@emotion/styled";

export const Card = styled.div(({ theme }) => ({
  display: "flex",
  flexFlow: "row",
  color: theme.colors.primary.contrast,
  backgroundColor: theme?.colors.background.card,
  border: `4px solid transparent`,
  borderRadius: "4px",
  padding: "16px",
  minWidth: "100px",
  boxSizing: "border-box",
  boxShadow: `2px 8px 32px ${theme.colors.primary.main},
  -2px -8px 32px ${theme.colors.secondary.main}`,
}));
