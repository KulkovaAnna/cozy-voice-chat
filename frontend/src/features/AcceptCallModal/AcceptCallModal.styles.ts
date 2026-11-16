import styled from "@emotion/styled";

export const ButtonsPanel = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.layout.small};

  button {
    max-width: unset;
  }
`;

export const RoomHint = styled.p(({ theme }) => ({
  margin: 0,
  color: theme.colors.text.secondary,
  fontWeight: theme.typography.fontWeight.medium,
}));
