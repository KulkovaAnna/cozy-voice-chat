import styled from "@emotion/styled";
import { Card } from "../../components/Card";
import { HorizontalSlider } from "../../components/Slider";

interface UserCardProps {
  isSpeaking?: boolean;
}

export const Container = styled.div({
  position: "relative",
  ":hover": {
    "#slider": {
      opacity: 1,
    },
  },
});

export const Slider = styled(HorizontalSlider)({
  position: "absolute",
  right: "0",
  top: "0",
  transform: "translateY(-50%)",
  opacity: 0,
  transition: "0.2s all",
});

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
