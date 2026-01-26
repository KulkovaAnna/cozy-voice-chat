import styled from "@emotion/styled";
import { Input } from "../Input";

export const EditableNickname = styled(Input)(({ theme }) => ({
  textAlign: "right",
  backgroundColor: "transparent",
  maxWidth: "300px",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  "&:hover": {
    backgroundColor: theme.colors.secondary.dark,
  },
}));

export const Form = styled.form(() => ({
  display: "flex",
  flexFlow: "row",
  gap: "0.5rem",
}));
