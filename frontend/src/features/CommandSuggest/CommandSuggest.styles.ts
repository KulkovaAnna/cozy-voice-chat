import styled from "@emotion/styled";

export const Wrapper = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  position: relative;
`;

export const Popover = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  z-index: 100;
  background-color: ${({ theme }) => theme.colors.background.paper};
  border-radius: 8px;
  box-shadow: ${({ theme }) => theme.shadows.medium};
  max-height: 200px;
  overflow-y: auto;
  min-width: 200px;
  max-width: 320px;
`;

export const Item = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  transition: background 150ms ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.darker};
  }
`;

export const ItemName = styled.span`
  font-weight: 600;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.primary.main};
`;

export const ItemDesc = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const Placeholder = styled.div`
  padding: 8px 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;
