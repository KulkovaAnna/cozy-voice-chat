import styled from "@emotion/styled";

export const Window = styled.div(({ theme }) => ({
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing.layout.small,
  padding: theme.spacing.layout.small,
  backgroundColor: theme.colors.background.card,
  fontFamily: theme.typography.fontFamily,
  color: theme.colors.text.primary,
}));

export const Participants = styled.div({
  display: "flex",
  flexFlow: "row",
  flexWrap: "wrap",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: "12px",
});

export const Participant = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  minWidth: 0,
});

export const AvatarBlock = styled.div({
  position: "relative",
  lineHeight: 0,
});

export const AvatarRing = styled.div<{ isSpeaking?: boolean }>(
  ({ theme, isSpeaking }) => ({
    borderRadius: theme.borderRadius.circle,
    boxShadow: isSpeaking
      ? `0 0 0 3px ${theme.colors.voice.speaking}`
      : `0 0 0 1px ${theme.colors.background.darker}`,
    transition: theme.transitions.normal,
    lineHeight: 0,
  }),
);

export const MutedBadge = styled.div(({ theme }) => ({
  position: "absolute",
  right: -2,
  bottom: -2,
  width: 18,
  height: 18,
  borderRadius: theme.borderRadius.circle,
  backgroundColor: theme.colors.voice.muted,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  "& svg": {
    width: 12,
    height: 12,
    display: "block",
  },
}));

export const Name = styled.div(({ theme }) => ({
  maxWidth: 64,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: theme.typography.fontSize.xs,
  color: theme.colors.text.secondary,
}));

export const Controls = styled.div({
  display: "flex",
  flexFlow: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
});
