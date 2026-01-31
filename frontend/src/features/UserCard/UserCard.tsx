import { Avatar } from "../../components/Avatar";
import type { UserProfile } from "../../types";
import * as Styled from "./UserCard.styled";

interface UserCardProps {
  user: UserProfile;
  isSpeaking?: boolean;
}

export const UserCard = ({ user, isSpeaking }: UserCardProps) => {
  return (
    <Styled.UserCard isSpeaking={isSpeaking}>
      <Avatar size={80} src={user.avatar} isMuted={user.micMuted} />
      <p>{user.name}</p>
    </Styled.UserCard>
  );
};
