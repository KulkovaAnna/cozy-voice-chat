import { API_URLS } from "@cvc/api/config";
import type { TextMessage } from "@cvc/types";
import { isImageFile } from "@cvc/utils";

import { Avatar } from "../Avatar";
import { DownLoadFileIcon } from "../Icons";
import * as Styles from "./Message.styles";
import { formatNewLines, formatTextWithLinks } from "./utils";

export type MessageProps = {
  message: TextMessage;
  anglePosition: "left" | "right";
};

export function Message(props: MessageProps) {
  const { attachment, isSystem } = props.message;
  const attachmentUrl = `${API_URLS.BASE_URL}/files`;

  const msg = isSystem
    ? {
        senderAvatar: "/coza.svg",
        senderName: "Cozy",
        message: props.message.message,
      }
    : props.message;

  return (
    <Styles.Container $anglePosition={props.anglePosition}>
      <Avatar src={msg.senderAvatar} size={24} />
      <Styles.MessageBody $anglePosition={props.anglePosition}>
        <Styles.Name $isSystem={isSystem}>{msg.senderName}</Styles.Name>
        <Styles.MessageBubble
          $anglePosition={props.anglePosition}
          $isSystem={isSystem}
        >
          {formatNewLines(formatTextWithLinks(msg.message))}
          {attachment &&
            (isImageFile(attachment.fileName) ? (
              <Styles.Image
                src={`${attachmentUrl}/view/${attachment?.id}`}
                alt={attachment.fileName}
              />
            ) : (
              <Styles.StyledFileInfo
                icon={
                  <a
                    target="_blank"
                    download
                    href={`${attachmentUrl}/download/${attachment?.id}`}
                  >
                    <DownLoadFileIcon />
                  </a>
                }
                file={
                  {
                    size: attachment.fileSize,
                    name: attachment.fileName,
                  } as File
                }
              />
            ))}
        </Styles.MessageBubble>
      </Styles.MessageBody>
    </Styles.Container>
  );
}
