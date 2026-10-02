import styled from "@emotion/styled";

export const Row = styled.div<{ $withScroll?: boolean }>(({ $withScroll }) => ({
  display: "flex",
  flexFlow: "row",
  alignItems: "center",
  width: "100%",
  gap: "0.5rem",
  overflowX: $withScroll ? "auto" : "hidden",
}));
