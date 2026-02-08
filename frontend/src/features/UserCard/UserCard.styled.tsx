import styled from "@emotion/styled";
import { Card } from "../../components/Card";

interface UserCardProps {
  isSpeaking?: boolean;
}

export const UserCard = styled(Card)<UserCardProps>(
  ({ isSpeaking, theme }) => ({
    flexFlow: "column",
    gap: "1rem",
    backgroundColor: theme?.colors.background.darker,
    minWidth: "300px",
    minHeight: "150px",
    borderColor: isSpeaking ? theme.colors.voice.speaking : "none",
  }),
);

export const RelativeBlock = styled.div({
  position: "relative",
});

export const MutedIconDiv = styled.div(({ theme }) => ({
  position: "absolute",
  aspectRatio: 1,
  height: 24,
  bottom: 0,
  right: 0,
  borderRadius: "50%",
  backgroundColor: theme.colors.primary.light,
}));
