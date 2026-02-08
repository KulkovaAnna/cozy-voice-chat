import styled from "@emotion/styled";
import { Input } from "../Input";

export const EditableNickname = styled(Input)(() => ({
  maxWidth: "300px",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
}));

export const Form = styled.form(() => ({
  display: "flex",
  flexFlow: "row",
  gap: "0.5rem",
}));
