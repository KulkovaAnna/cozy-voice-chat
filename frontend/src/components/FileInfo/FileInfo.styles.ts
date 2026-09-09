import styled from "@emotion/styled";

export const Container = styled.div`
  display: flex;
  padding: 8px;
  background-color: ${({ theme }) => theme.colors.background.card};
  gap: 4px;
  align-items: center;
  border-radius: 4px 4px 0 0;
  svg {
    min-height: 24px;
    min-width: 24px;
  }
`;

export const InfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: calc(100% - 24px - 4px);
`;

export const FileName = styled.p`
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`;

export const FileSize = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  white-space: nowrap;
`;
