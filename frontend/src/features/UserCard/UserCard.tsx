import { Avatar } from "../../components/Avatar";
import { ContextMenu } from "../../components/ContextMenu";
import { MenuLabel } from "../../components/ContextMenu/ContextMenu.styles";
import { MicOffIcon } from "../../components/Icons";
import { HorizontalSlider } from "../../components/Slider";
import type { UserProfile } from "../../types";
import * as Styled from "./UserCard.styled";

interface UserCardProps {
  user: UserProfile;
  volume?: {
    value: number;
    onVolumeChange: (volume: number) => void;
  };
  isSpeaking?: boolean;
  isMuted?: boolean;
}

export const UserCard = ({
  user,
  isSpeaking,
  isMuted,
  volume,
}: UserCardProps) => {
  const menuContent = (
    <>
      <MenuLabel>Громкость</MenuLabel>
      <HorizontalSlider
        value={volume?.value ?? 0}
        onChange={volume?.onVolumeChange ?? (() => {})}
        thumbSize={20}
      />
    </>
  );
  return (
    <Styled.Container>
      <ContextMenu menu={menuContent} isShow={volume != null}>
        <Styled.UserCard isSpeaking={isSpeaking}>
          <Styled.RelativeBlock>
            <Avatar size={80} src={user.avatar} />
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
