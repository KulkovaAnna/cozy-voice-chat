import { Avatar } from "@cvc/components";
import { CallButton } from "@cvc/features";
import { useAuth } from "@cvc/providers";
import type { UserProfile } from "@cvc/types";

import * as Styles from "./LobbyRow.styles";

interface LobbyRowProps {
  currentUser: UserProfile;
}

export function LobbyRow({ currentUser }: LobbyRowProps) {
  const { user } = useAuth();
  return (
    <Styles.Container>
      <Styles.InnerContainer>
        <Avatar src={currentUser.avatar} size={40} />
        <Styles.LabelEllipsis>{currentUser.name}</Styles.LabelEllipsis>
      </Styles.InnerContainer>
      {(currentUser.id && currentUser.id !== user.id && (
        <CallButton uid={currentUser.id} />
      )) || <Styles.Label>Это&nbsp;ты</Styles.Label>}
    </Styles.Container>
  );
}
