import { CallButton } from "../../features/CallButton";
import { useAuth } from "../../providers/AuthProvider";
import type { UserProfile } from "../../types";
import { Avatar } from "../Avatar";
import * as Styled from "./LobbyRow.styled";

interface LobbyRowProps {
  currentUser: UserProfile;
}

export function LobbyRow({ currentUser }: LobbyRowProps) {
  const { user } = useAuth();
  return (
    <Styled.Container>
      <Styled.InnerContainer>
        <Avatar src={currentUser.avatar} size={40} />
        <Styled.LabelEllipsis>{currentUser.name}</Styled.LabelEllipsis>
      </Styled.InnerContainer>
      {(currentUser.id && currentUser.id !== user.id && (
        <CallButton uid={currentUser.id} />
      )) || <Styled.Label>Это я</Styled.Label>}
    </Styled.Container>
  );
}
