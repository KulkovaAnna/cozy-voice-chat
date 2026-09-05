import { Avatar } from "../../components/Avatar";
import { ContextMenuWithSlider } from "../../components/ContextMenu";
import { MicOffIcon } from "../../components/Icons";
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
  return (
    <Styled.Container>
      <ContextMenuWithSlider
        value={volume?.value}
        onChange={volume?.onVolumeChange}
      >
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
      </ContextMenuWithSlider>
    </Styled.Container>
  );
};
