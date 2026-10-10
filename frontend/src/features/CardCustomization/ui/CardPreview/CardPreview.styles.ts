import styled from "@emotion/styled";
import { cardImageLayerStyles } from "@cvc/utils";

export const Container = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  gap: theme.spacing.layout.small,
  alignItems: "flex-start",
  flexWrap: "wrap",

  [`@media screen and (max-width: ${theme.breakpoints.tablet})`]: {
    flexDirection: "column",
    alignItems: "stretch",
  },
}));

export const PreviewColumn = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.unit,
  flex: 1,
  minWidth: 200,
}));

export const PreviewLabel = styled.span(({ theme }) => ({
  fontSize: theme.typography.fontSize.xs,
  color: theme.colors.text.secondary,
  textTransform: "uppercase",
  letterSpacing: 1,
}));

const previewCard = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  padding: "16px",
  boxSizing: "border-box" as const,
};

export const LobbyCard = styled.div(({ theme }) => ({
  ...previewCard,
  ...cardImageLayerStyles,
  backgroundColor: theme.colors.background.card,
  boxShadow: `0px 0px 4px 2px ${theme.colors.primary.dark}`,
  minHeight: 64,
}));

export const LobbyInnerContainer = styled.div({
  display: "flex",
  flexFlow: "row",
  alignItems: "center",
  justifyContent: "flex-start",
  width: "100%",
  gap: "1rem",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
});

export const CallCard = styled.div(({ theme }) => ({
  ...previewCard,
  ...cardImageLayerStyles,
  flexDirection: "column",
  gap: theme.spacing.unit,
  backgroundColor: theme.colors.background.darker,
  minHeight: 170,
}));

export const AvatarArea = styled.div<{ $clickable?: boolean }>(
  ({ $clickable }) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    cursor: $clickable ? "pointer" : "default",
    transition: "box-shadow 0.15s ease",

    "&:hover": {
      boxShadow: "0 0 0 2px rgba(38, 166, 154, 0.6)",
    },
  }),
);

export const NameEllipsis = styled.p(({ theme }) => ({
  margin: 0,
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.text.primary,
  maxWidth: 160,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
}));

export const CallName = styled(NameEllipsis)({
  maxWidth: 200,
});
