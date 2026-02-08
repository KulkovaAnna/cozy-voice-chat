import styled from "@emotion/styled";
import { Card } from "../Card";

export const Container = styled(Card)(({ theme }) => ({
  position: "relative",
  border: `2px solid ${theme.colors.primary.main}`,
  padding: "2rem 1rem",
  minWidth: "300px",
  width: "100%",
  maxWidth: "500px",
  justifyContent: "space-between",
  maxHeight: "3rem",
  gap: "1rem",
}));

export const InnerContainer = styled.div({
  display: "flex",
  flexFlow: "row",
  alignItems: "center",
  justifyContent: "flex-start",
  width: "100%",
  height: "100%",
  gap: "1rem",
});

export const Label = styled.p({
  display: "inline-list-item",
  width: "auto",
});

export const LabelEllipsis = styled(Label)({
  width: "auto",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
});
