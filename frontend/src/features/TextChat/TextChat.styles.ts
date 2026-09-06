import styled from "@emotion/styled";
import { Input } from "../../components/Input";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.layout.small};
  height: 100%;
`;

export const FormPanel = styled.form`
  display: flex;
  justify-content: space-between;
  gap: 4px;
`;

export const StyledInput = styled(Input)`
  max-width: unset;
  resize: none;
  position: absolute;
  bottom: 0;
  max-height: 200px;
  ::-webkit-scrollbar {
    display: none;
  }
`;

export const MessagesContainer = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  margin-right: -${({ theme }) => theme.spacing.layout.small};
  padding-right: ${({ theme }) => theme.spacing.layout.small};
`;

export const MessageWrapper = styled.div<{ $anglePosition: "left" | "right" }>`
  width: 100%;
  display: flex;
  justify-content: ${({ $anglePosition }) => ($anglePosition === "right" ? "flex-end" : "flex-start")};
`;

export const InputWrapper = styled.div`
  position: relative;
  width: 100%;
`;
