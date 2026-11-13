import styled from "@emotion/styled";
import { FileInfo } from "@cvc/components/FileInfo";
import { Input } from "@cvc/components/Input";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.layout.small};
  height: 100%;
  position: relative;
`;

/** Подсветка панели при перетаскивании файла поверх чата */
export const DropOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.layout.small};
  padding: ${({ theme }) => theme.spacing.layout.medium};
  text-align: center;
  color: ${({ theme }) => theme.colors.primary.main};
  /* hex-цвет темы + прозрачность, чтобы сквозь подсветку читался чат */
  background-color: ${({ theme }) => `${theme.colors.background.paper}e6`};
  border: 2px dashed ${({ theme }) => theme.colors.primary.main};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  pointer-events: none;

  svg {
    width: 48px;
    height: 48px;
  }
`;

export const DropOverlayText = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

/** Список выбранных файлов над полем ввода */
export const AttachmentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 180px;
  overflow-y: auto;
  margin-bottom: 4px;
`;

/** Строка выбранного файла с кнопкой снятия вложения */
export const AttachmentRow = styled.div`
  position: relative;
`;

export const StyledFileInfo = styled(FileInfo)`
  padding-right: 36px;
`;

export const RemoveAttachmentButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.circle};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast} ease color;

  svg {
    width: 16px;
    height: 16px;
  }

  :hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
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

/** Тонкая строка индикатора выполнения слэш-команды */
export const CommandStatusLine = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 18px;
  font-size: 11px;
  line-height: 18px;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
`;
