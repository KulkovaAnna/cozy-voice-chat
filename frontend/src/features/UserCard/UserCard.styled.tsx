import styled from "@emotion/styled";
import { Card } from "../../components/Card";
import { HorizontalSlider } from "../../components/Slider";
import type { UserCardVariant } from "./UserCard";
import type { Theme } from "../../theme";

function getVariantStyles(variant: UserCardVariant, theme: Theme) {
  switch (variant) {
    case "standard":
      return {
        minWidth: 300,
        minHeight: 150,
        gap: theme.spacing.layout.small,
      };
    case "compact":
      return {
        minWidth: 150,
        minHeight: 75,
        gap: parseInt(theme.spacing.layout.small) / 2,
        padding: parseInt(theme.spacing.layout.small) / 2,
        p: {
          fontSize: 14,
        },
      };
    case "avatar":
      return {
        minWidth: 0,
        minHeight: 0,
      };
  }
}

interface UserCardProps {
  isSpeaking?: boolean;
  variant: UserCardVariant;
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
  ({ isSpeaking, theme, variant }) => ({
    flexFlow: "column",
    backgroundColor: theme?.colors.background.darker,
    borderColor: isSpeaking ? theme.colors.voice.speaking : "none",
    transition: theme.transitions.slow,
    ...getVariantStyles(variant, theme),
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
