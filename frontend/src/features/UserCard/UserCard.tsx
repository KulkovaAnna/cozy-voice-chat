import { Avatar } from "../../components/Avatar";
import * as Styled from "./UserCard.styled";

interface UserCardProps {
  userName: string;
  isSpeaking?: boolean;
}

export const UserCard = ({ userName, isSpeaking }: UserCardProps) => {
  return (
    <Styled.UserCard isSpeaking={isSpeaking}>
      <Avatar src="https://i.pinimg.com/736x/a7/38/60/a738604ecb973216dc68730990060e61.jpg" />
      {userName}
    </Styled.UserCard>
  );
};
