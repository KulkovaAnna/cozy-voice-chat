import styled from "@emotion/styled";

export const SliderContainer = styled.div<{
  disabled?: boolean;
  thumbSize: number;
}>`
  position: relative;
  width: 100%;
  height: 32px;
  padding: 0 ${({ thumbSize }) => thumbSize / 2}px; /* отступы под размер бегунка */
  box-sizing: border-box; /* чтобы padding входил в ширину */
  touch-action: none;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};
  user-select: none;
`;

export const Track = styled.div<{ volume: number }>`
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 8px;
  background: ${({ volume }) =>
    `rgb(${255 - 203 * volume}, ${149 + 50 * volume}, ${89 * volume})`};
  border-radius: 2px;
  transform: translateY(-50%);
  transition: background 0.1s;
`;

export const Thumb = styled.div<{ progress: number; size: number }>`
  position: absolute;
  top: 50%;
  left: ${({ progress }) => progress * 100}%; /* позиция в процентах */
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  background: ${({ theme }) => theme.colors.primary.main};
  border-radius: 50%;
  box-shadow: ${({ theme }) =>
    `2px 2px 4px 1px ${theme.colors.background.card}`};
  transform: translate(-50%, -50%);
  transition:
    left 0.1s ease,
    background 0.1s ease;
  &:hover {
    background: ${({ theme }) => theme.colors.primary.dark};
  }
`;
