import styled from "@emotion/styled";

export const ButtonsPanel = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.layout.small};

  button {
    max-width: unset;
  }
`;
