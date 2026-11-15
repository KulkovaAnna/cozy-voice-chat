import { Card, HorizontalSlider } from "@cvc/components";
import type { Theme } from "@cvc/theme";
import { cardImageLayerStyles } from "@cvc/utils";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { USER_CARD_WIDTH } from "./constants";
import type { UserCardVariant } from "./UserCard";

// Анимация одиночной эмодзи на карточке: появление с разгоном, удержание, исчезновение.
// Общая длительность совпадает с REACTION_LIFETIME_MS в useChatEmojiReaction (3 с).
const emojiReactionPop = keyframes`
  0% {
    transform: translate(-50%, -50%) scale(0.2);
    opacity: 0;
  }
  15% {
    transform: translate(-50%, -50%) scale(1.15);
    opacity: 1;
  }
  25% {
    transform: translate(-50%, -50%) scale(1);
  }
  80% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -60%) scale(0.85);
    opacity: 0;
  }
`;

const EMOJI_REACTION_ANIMATION = "3s ease forwards";

function getVariantStyles(variant: UserCardVariant, theme: Theme) {
  switch (variant) {
    case "standard":
      return {
        width: USER_CARD_WIDTH,
        // Ограничиваем ширину карточки: длинное имя раньше растягивало её
        // по max-content. maxWidth нужен, чтобы карточка влезала на мобилке.
        minWidth: 0,
        maxWidth: "100%",
        minHeight: 150,
        gap: theme.spacing.layout.small,
      };
    case "compact":
      return {
        width: 150,
        minWidth: 0,
        maxWidth: "100%",
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
        maxWidth: "100%",
      };
  }
}

interface UserCardProps {
  isSpeaking?: boolean;
  variant: UserCardVariant;
  /** Растянуть карточку на всю ширину ячейки (в сетке участников) */
  stretch?: boolean;
}

export const Container = styled.div({
  position: "relative",
  maxWidth: "100%",
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
  ({ isSpeaking, stretch, theme, variant }) => ({
    ...cardImageLayerStyles,
    flexFlow: "column",
    backgroundColor: theme?.colors.background.darker,
    borderColor: isSpeaking ? theme.colors.voice.speaking : "none",
    transition: theme.transitions.slow,
    ...getVariantStyles(variant, theme),
    // В сетке карточка занимает всю ширину отведённых ей ячеек
    ...(stretch && { width: "100%" }),
  }),
);

export const RelativeBlock = styled.div({
  position: "relative",
});

// Имя участника не должно влиять на ширину карточки: длинное имя обрезается
// эллипсисом внутри отведённой ширины.
export const Name = styled.p({
  width: "100%",
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
});

// Размер аватара в зависимости от варианта карточки: синхронизирован с Avatar в UserCard.tsx.
const AVATAR_SIZE = {
  standard: 80,
  compact: 40,
  avatar: 80,
} as const;

// Всплывающая эмодзи занимает ~80% от размера аватара.
function emojiFontSize(variant: UserCardVariant): number {
  return Math.round(AVATAR_SIZE[variant] * 0.8);
}

export const MutedIconDiv = styled.div(({ theme }) => ({
  position: "absolute",
  aspectRatio: 1,
  height: 24,
  bottom: 0,
  right: 0,
  borderRadius: "50%",
  backgroundColor: theme.colors.primary.light,
  color: theme.colors.primary.contrast,
}));

// Оверлей одиночной эмодзи поверх аватара пользователя.
// Длительность анимации синхронизирована с жизненным циклом реакции (3 с).
export const EmojiOverlay = styled.span<{ $variant: UserCardVariant }>(
  ({ $variant }) => ({
    position: "absolute",
    top: "50%",
    left: "50%",
    lineHeight: 1,
    fontSize: emojiFontSize($variant),
    pointerEvents: "none",
    zIndex: 10,
    filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35))",
    animation: `${emojiReactionPop} ${EMOJI_REACTION_ANIMATION}`,
  }),
);
