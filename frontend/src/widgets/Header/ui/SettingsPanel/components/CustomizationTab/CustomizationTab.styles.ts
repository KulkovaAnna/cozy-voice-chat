import styled from "@emotion/styled";

export const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.layout.small};
  align-items: center;
`;

export const Block = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.unit,
  textAlign: "start",
  button: {
    width: "fit-content",
  },
}));
