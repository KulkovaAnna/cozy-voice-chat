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

export const AttachmentWrapper = styled.div`
  position: relative;
  label {
    color: ${({ theme }) => theme.colors.primary.contrast};
    background-color: ${({ theme }) => theme.colors.primary.main};
    border: none;
    border-radius: 4px;
    min-width: 45px;
    max-width: 200px;
    height: 45px;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: ${({ theme }) => theme.transitions.normal} ease all;
    :not(:disabled):hover {
      cursor: pointer;
      background-color: ${({ theme }) => theme.colors.primary.dark};
    }
    :disabled {
      opacity: 0.5;
    }
  }
  input {
    opacity: 0;
    position: absolute;
    bottom: -1000px;
  }
`;
