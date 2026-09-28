import {
  Avatar,
  ContextMenu,
  HorizontalSlider,
  MicOffIcon,
} from "@cvc/components";
//TODO: почему оно тянется хрен пойми откуда
import { MenuLabel } from "@cvc/components/ContextMenu/ContextMenu.styles";
import type { UserProfile } from "@cvc/types";
import * as Styled from "./UserCard.styled";

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
}

export const UserCard = ({
  user,
  isSpeaking,
  isMuted,
  volume,
  variant = "standard",
}: UserCardProps) => {
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
  return (
    <Styled.Container>
      <ContextMenu menu={menuContent} isShow={volume != null}>
        <Styled.UserCard variant={variant} isSpeaking={isSpeaking}>
          <Styled.RelativeBlock>
            <Avatar size={variant === "compact" ? 40 : 80} src={user.avatar} />
            {isMuted && (
              <Styled.MutedIconDiv>
                <MicOffIcon />
              </Styled.MutedIconDiv>
            )}
          </Styled.RelativeBlock>
          <p>{user.name}</p>
        </Styled.UserCard>
      </ContextMenu>
    </Styled.Container>
  );
};
