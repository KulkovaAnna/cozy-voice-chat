import type { TextMessage } from "../../types";
import { Avatar } from "../Avatar";
import * as Styles from "./Message.styles";

export type MessageProps = {
  message: TextMessage;
  anglePosition: "left" | "right";
};

export function Message(props: MessageProps) {
  return (
    <Styles.Container $anglePosition={props.anglePosition}>
      <Avatar src={props.message.senderAvatar} size={24} />
      <Styles.MessageBody $anglePosition={props.anglePosition}>
        <Styles.Name>{props.message.senderName}</Styles.Name>
        <Styles.MessageBubble $anglePosition={props.anglePosition}>
          <span>{props.message.message}</span>
        </Styles.MessageBubble>
      </Styles.MessageBody>
    </Styles.Container>
  );
}
