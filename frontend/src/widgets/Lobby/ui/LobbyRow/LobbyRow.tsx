import { Avatar } from "@cvc/components";
import { CallButton } from "@cvc/features";
import { useAuth } from "@cvc/providers";
import type { UserProfile } from "@cvc/types";

import * as Styles from "./LobbyRow.styles";

interface LobbyRowProps {
  currentUser: UserProfile;
}

export function LobbyRow(props: LobbyRowProps) {
  const { user } = useAuth();
  return (
    <Styles.Container>
      <Styles.InnerContainer>
        <Avatar src={props.currentUser.avatar} size={40} />
        <Styles.LabelEllipsis>{props.currentUser.name}</Styles.LabelEllipsis>
      </Styles.InnerContainer>
      {(props.currentUser.id && props.currentUser.id !== user.id && (
        <CallButton uid={props.currentUser.id} />
      )) || <Styles.Label>Это&nbsp;ты</Styles.Label>}
    </Styles.Container>
  );
}
