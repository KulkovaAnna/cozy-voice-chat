import styled from "@emotion/styled";

interface CardProps {
  hasGlow?: boolean;
}

export const Card = styled.div<CardProps>(({ hasGlow, theme }) => ({
  display: "flex",
  flexFlow: "row",
  alignItems: "center",
  color: theme.colors.text.primary,
  backgroundColor: theme?.colors.background.card,
  border: `4px solid transparent`,
  borderRadius: "4px",
  padding: "16px",
  minWidth: "100px",
  boxSizing: "border-box",
  boxShadow: hasGlow
    ? `2px 2px 4px 1px ${theme.colors.primary.main},
  -2px -2px 4px 1px ${theme.colors.secondary.main}`
    : "none",
}));
