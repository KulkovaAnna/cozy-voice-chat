import styled from "@emotion/styled";

export const SliderContainer = styled.div<{ disabled?: boolean }>`
  position: relative;
  width: 24px;
  height: 200px;
  touch-action: none;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};
  user-select: none;
`;

export const Track = styled.div`
  position: absolute;
  left: 50%;
  top: 12px;
  bottom: 12px;
  width: 4px;
  background: ${({ theme }) => theme.colors.secondary.light};
  border-radius: 2px;
  transform: translateX(-50%);
`;

export const Thumb = styled.div<{ top: number; size: number }>`
  position: absolute;
  left: 50%;
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  background: ${({ theme }) => theme.colors.primary.main};
  border-radius: 50%;
  transform: translate(-50%, -50%);
  top: ${({ top }) => top}px;
  transition: background 0.1s;
  box-shadow: ${({ theme }) => `2px 2px 4px 1px ${theme.colors.background.card}`};
  &:hover {
    background: ${({ theme }) => theme.colors.primary.dark};
  }
`;
