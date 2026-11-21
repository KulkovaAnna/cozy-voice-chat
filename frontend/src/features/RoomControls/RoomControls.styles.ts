import styled from "@emotion/styled";
import { Button } from "@cvc/components";

const compactButton = {
  width: "auto",
  maxWidth: "none",
  minWidth: 0,
  height: "36px",
  padding: "4px 14px",
  fontSize: "0.9rem",
  whiteSpace: "nowrap",
} as const;

export const CreateButton = styled(Button)(compactButton);

export const ConvertButton = styled(Button)(compactButton);

export const RoomPanel = styled.div(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "4px 4px 4px 12px",
  backgroundColor: theme.colors.background.card,
  borderRadius: theme.borderRadius.small,
  boxShadow: theme.shadows.small,
}));

export const RoomLabel = styled.span(({ theme }) => ({
  fontSize: theme.typography.fontSize.xs,
  color: theme.colors.text.secondary,
}));

export const RoomCode = styled.span(({ theme }) => ({
  fontWeight: theme.typography.fontWeight.bold,
  letterSpacing: "0.08em",
  color: theme.colors.text.primary,
}));