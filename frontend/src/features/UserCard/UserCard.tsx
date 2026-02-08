import { Avatar } from "../../components/Avatar";
import type { UserProfile } from "../../types";
import * as Styled from "./UserCard.styled";
import mutedIcon from "../../assets/mic_off.svg";

interface UserCardProps {
  user: UserProfile;
  isSpeaking?: boolean;
  isMuted?: boolean;
}

export const UserCard = ({ user, isSpeaking, isMuted }: UserCardProps) => {
  return (
    <Styled.UserCard isSpeaking={isSpeaking}>
      <Styled.RelativeBlock>
        <Avatar size={80} src={user.avatar} />
        {isMuted && <Styled.MutedIcon src={mutedIcon} />}
      </Styled.RelativeBlock>
      <p>{user.name}</p>
    </Styled.UserCard>
  );
};
