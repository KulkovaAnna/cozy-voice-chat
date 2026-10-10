import styled from "@emotion/styled";

export const Overlay = styled.div(({ theme }) => ({
  position: "fixed",
  inset: 0,
  zIndex: theme.zIndex.modal + 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing.layout.small,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  boxSizing: "border-box",
}));

export const Dialog = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.layout.small,
  width: "100%",
  maxWidth: 420,
  padding: theme.spacing.layout.medium,
  boxSizing: "border-box",
  backgroundColor: theme.colors.background.card,
  borderRadius: theme.borderRadius.large,
  boxShadow: theme.shadows.large,
}));

export const Title = styled.h3(({ theme }) => ({
  margin: 0,
  color: theme.colors.text.primary,
  fontSize: theme.typography.fontSize.lg,
  fontWeight: theme.typography.fontWeight.medium,
}));

export const Description = styled.p(({ theme }) => ({
  margin: 0,
  color: theme.colors.text.secondary,
  fontSize: theme.typography.fontSize.sm,
  lineHeight: 1.5,
}));

export const Buttons = styled.div(({ theme }) => ({
  display: "grid",
  gap: theme.spacing.unit * 1.5,
  gridTemplateColumns: "repeat(2, 1fr)",
}));
