import styled from "@emotion/styled";
import { Card } from "../../components/Card";

export const UserMenu = styled(Card)({
  flexFlow: "column",
  justifyContent: "flex-start",
  alignItems: "center",
  gap: "1rem",
  position: "absolute",
  zIndex: "9",
  top: "100%",
  right: 0,
  margin: "1rem",
});

export const Label = styled.div({
  width: "100%",
  maxWidth: "200px",
});
