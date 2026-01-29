import styled from "@emotion/styled";

export const ControlPanel = styled.div(({ theme }) => ({
  position: "fixed",
  bottom: "2rem",
  display: "flex",
  flexFlow: "row",
  backgroundColor: theme.colors.background.card,
  border: "none",
  borderRadius: "6px",
  justifyContent: "center",
  alignItems: "center",
  gap: "1rem",
  padding: "1rem 2rem",
  height: "100%",
  maxHeight: "70px",
  width: "fit-content",
  boxSizing: "border-box",
}));
