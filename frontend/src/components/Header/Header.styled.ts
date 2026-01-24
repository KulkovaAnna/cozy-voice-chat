import styled from "@emotion/styled";

export const Header = styled.div(({ theme }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  zIndex: 10000,
  display: "flex",
  flexFlow: "row",
  backgroundColor: theme.colors.background.card,
  justifyContent: "space-between",
  gap: "2rem",
  padding: "8px",
  width: "100%",
  boxSizing: "border-box",
  boxShadow: `0px 2px 16px ${theme.colors.primary.main},
  0px 4px 16px ${theme.colors.secondary.main}`,
}));
