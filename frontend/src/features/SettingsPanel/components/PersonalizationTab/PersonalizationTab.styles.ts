import styled from "@emotion/styled";
import { Button } from "../../../../components/Button";

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
}));

export const AvatarPreview = styled.div(() => ({
  display: "flex",
  justifyContent: "center",
}));

export const SubText = styled.p(({ theme }) => ({
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.text.secondary,
}));

export const DeleteButton = styled(Button)`
  width: auto;
`;
