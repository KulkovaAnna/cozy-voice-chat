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
  const { attachments = [], isSystem } = props.message;
  const attachmentUrl = `${API_URLS.BASE_URL}/files`;

  const msg = isSystem
    ? {
        senderAvatar: "/coza.svg",
        senderName: "Cozy",
        message: props.message.message,
      }
    : props.message;

  const images = attachments.filter((attachment) =>
    isImageFile(attachment.fileName),
  );
  const files = attachments.filter(
    (attachment) => !isImageFile(attachment.fileName),
  );

  return (
    <Styles.Container $anglePosition={props.anglePosition}>
      <Avatar src={msg.senderAvatar} size={24} />
      <Styles.MessageBody $anglePosition={props.anglePosition}>
        <Styles.Name $isSystem={isSystem}>{msg.senderName}</Styles.Name>
        <Styles.MessageBubble
          $anglePosition={props.anglePosition}
          $isSystem={isSystem}
        >
          {msg.message && formatNewLines(formatTextWithLinks(msg.message))}
          {attachments.length > 0 && (
            <Styles.Attachments>
              {images.length > 0 && (
                <Styles.ImageGrid>
                  {images.map((attachment) => (
                    <Styles.Image
                      key={attachment.id}
                      src={`${attachmentUrl}/view/${attachment.id}`}
                      alt={attachment.fileName}
                    />
                  ))}
                </Styles.ImageGrid>
              )}
              {files.map((attachment) => (
                <Styles.StyledFileInfo
                  key={attachment.id}
                  icon={
                    <a
                      target="_blank"
                      download
                      href={`${attachmentUrl}/download/${attachment.id}`}
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
            </Styles.Attachments>
          )}
        </Styles.MessageBubble>
      </Styles.MessageBody>
    </Styles.Container>
  );
}
