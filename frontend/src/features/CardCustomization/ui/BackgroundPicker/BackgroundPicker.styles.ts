import styled from "@emotion/styled";
import { Button } from "@cvc/components";

export const Container = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.unit,
  textAlign: "start",
}));

export const Row = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.unit,
  flexWrap: "wrap",
}));

export const OpacityValue = styled.span(({ theme }) => ({
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.text.secondary,
  minWidth: 40,
}));

export const RemoveButton = styled(Button)(({ theme }) => ({
  width: "auto",
  backgroundColor: theme.colors.status.error,
}));
