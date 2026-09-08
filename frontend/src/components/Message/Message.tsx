import { API_URLS } from "../../api/config";
import type { TextMessage } from "../../types";
import { Avatar } from "../Avatar";
import { DownLoadFileIcon } from "../Icons";
import * as Styles from "./Message.styles";

export type MessageProps = {
  message: TextMessage;
  anglePosition: "left" | "right";
};

export function Message(props: MessageProps) {
  const { attachment } = props.message;

  return (
    <Styles.Container $anglePosition={props.anglePosition}>
      <Avatar src={props.message.senderAvatar} size={24} />
      <Styles.MessageBody $anglePosition={props.anglePosition}>
        <Styles.Name>{props.message.senderName}</Styles.Name>
        <Styles.MessageBubble $anglePosition={props.anglePosition}>
          {props.message.message}
          {attachment && (
            <Styles.StyledFileInfo
              icon={
                <a
                  target="_blank"
                  download
                  href={`http://${API_URLS.BASE_URL}/files/download/${attachment.id}`}
                >
                  <DownLoadFileIcon />
                </a>
              }
              file={
                { size: attachment.fileSize, name: attachment.fileName } as File
              }
            />
          )}
        </Styles.MessageBubble>
      </Styles.MessageBody>
    </Styles.Container>
  );
}
