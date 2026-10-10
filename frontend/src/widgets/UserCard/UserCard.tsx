import {
  Avatar,
  ContextMenu,
  HorizontalSlider,
  MenuLabel,
  MicOffIcon,
} from "@cvc/components";
import type { UserProfile } from "@cvc/types";
import { backgroundToCss, cardTextToCss } from "@cvc/utils";
import * as Styles from "./UserCard.styles";

export type UserCardVariant = "standard" | "compact" | "avatar";

interface UserCardProps {
  user: UserProfile;
  volume?: {
    value: number;
    onVolumeChange: (volume: number) => void;
  };
  isSpeaking?: boolean;
  isMuted?: boolean;
  variant?: UserCardVariant;
  /** Одиночная эмодзи из сообщения: показывается поверх аватара и исчезает вместе с реакцией. */
  emojiReaction?: string | null;
}

export const UserCard = (props: UserCardProps) => {
  const {
    user,
    isSpeaking,
    isMuted,
    volume,
    emojiReaction,
    variant = "standard",
  } = props;
  const menuContent = (
    <>
      <MenuLabel>Громкость</MenuLabel>
      {volume != null && (
        <HorizontalSlider
          value={volume.value}
          onChange={volume.onVolumeChange}
          thumbSize={20}
        />
      )}
    </>
  );
  const background = user.cardAppearance?.background;
  const border = user.cardAppearance?.avatarBorder;
  const textStyle = cardTextToCss(user.cardAppearance);

  return (
    <Styles.Container>
      <ContextMenu menu={menuContent} isShow={volume != null}>
        <Styles.UserCard
          variant={variant}
          isSpeaking={isSpeaking}
          style={backgroundToCss(background)}
        >
          <Styles.RelativeBlock>
            <Avatar
              size={variant === "compact" ? 40 : 80}
              src={user.avatar}
              border={border}
            />
            {isMuted && (
              <Styles.MutedIconDiv>
                <MicOffIcon />
              </Styles.MutedIconDiv>
            )}
            {emojiReaction && (
              <Styles.EmojiOverlay $variant={variant}>
                {emojiReaction}
              </Styles.EmojiOverlay>
            )}
          </Styles.RelativeBlock>
          <p style={textStyle}>{user.name}</p>
        </Styles.UserCard>
      </ContextMenu>
    </Styles.Container>
  );
};
