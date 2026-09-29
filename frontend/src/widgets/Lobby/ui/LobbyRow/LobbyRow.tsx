import { Avatar } from "@cvc/components";
import { CallButton } from "@cvc/features";
import { useAuth } from "@cvc/providers";
import type { UserProfile } from "@cvc/types";

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
      )) || <Styled.Label>Это&nbsp;ты</Styled.Label>}
    </Styled.Container>
  );
}
