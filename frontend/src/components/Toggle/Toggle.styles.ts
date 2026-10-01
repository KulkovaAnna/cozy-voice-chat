import styled from "@emotion/styled";

export const ToggleContainer = styled.label<{ disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  user-select: none;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;

export const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

export const Track = styled.span<{ checked: boolean }>`
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.paper};
  transition: background 0.2s ease;
  flex-shrink: 0;
`;

export const Thumb = styled.span<{ checked: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ checked }) => (checked ? "18px" : "2px")};
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${({ theme, checked }) => (checked ? theme.colors.primary.main : theme.colors.text.disabled)};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
`;

export const Label = styled.span`
  font-size: inherit;
  color: inherit;
`;
