import { CallButton } from "@cvc/features";
import { useAuth } from "@cvc/providers";
import type { UserProfile } from "@cvc/types";
import { backgroundToCss, cardTextToCss } from "@cvc/utils";

import * as Styles from "./LobbyRow.styles";

interface LobbyRowProps {
  currentUser: UserProfile;
}

export function LobbyRow(props: LobbyRowProps) {
  const { user } = useAuth();
  const background = props.currentUser.cardAppearance?.background;
  const border = props.currentUser.cardAppearance?.avatarBorder;
  const textStyle = cardTextToCss(props.currentUser.cardAppearance);

  return (
    <Styles.Container style={backgroundToCss(background)}>
      <Styles.InnerContainer>
        <Styles.RowAvatar
          src={props.currentUser.avatar}
          size={40}
          border={border}
        />
        <Styles.LabelEllipsis style={textStyle} title={props.currentUser.name}>
          {props.currentUser.name}
        </Styles.LabelEllipsis>
      </Styles.InnerContainer>
      {(props.currentUser.id && props.currentUser.id !== user.id && (
        <CallButton uid={props.currentUser.id} />
      )) || <Styles.Label style={textStyle}>Это&nbsp;ты</Styles.Label>}
    </Styles.Container>
  );
}
