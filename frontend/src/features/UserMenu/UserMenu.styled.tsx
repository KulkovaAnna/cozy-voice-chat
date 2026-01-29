import styled from "@emotion/styled";
import { Card } from "../../components/Card";

export const UserMenu = styled(Card)(({}) => ({
  flexFlow: "column",
  justifyContent: "flex-start",
  alignItems: "center",
  gap: "1rem",
  position: "absolute",
  zIndex: "99999",
  top: "100%",
  right: 0,
  margin: "1rem",
}));
