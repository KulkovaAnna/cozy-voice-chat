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
      <Avatar size={80} src={user.avatar} />
      {user.name}
    </Styled.UserCard>
  );
};
