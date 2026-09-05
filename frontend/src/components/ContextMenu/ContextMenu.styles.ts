import styled from "@emotion/styled";

export const MenuContainer = styled.div<{ x: number; y: number }>`
  position: fixed;
  top: ${({ y }) => y}px;
  left: ${({ x }) => x}px;
  background: ${({ theme }) => theme.colors.background.paper};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 16px 20px;
  min-width: 150px;
  max-width: 200px;
  z-index: 1000;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

export const MenuLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
`;
