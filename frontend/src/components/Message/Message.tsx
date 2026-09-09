import { API_URLS } from "../../api/config";
import type { TextMessage } from "../../types";
import { isImageFile } from "../../utils/isImageFile";
import { Avatar } from "../Avatar";
import { DownLoadFileIcon } from "../Icons";
import * as Styles from "./Message.styles";
import { formatTextWithLinks } from "./utils";

export type MessageProps = {
  message: TextMessage;
  anglePosition: "left" | "right";
};

export function Message(props: MessageProps) {
  const { attachment } = props.message;
  const attachmentUrl = `http://${API_URLS.BASE_URL}/files`;

  return (
    <Styles.Container $anglePosition={props.anglePosition}>
      <Avatar src={props.message.senderAvatar} size={24} />
      <Styles.MessageBody $anglePosition={props.anglePosition}>
        <Styles.Name>{props.message.senderName}</Styles.Name>
        <Styles.MessageBubble $anglePosition={props.anglePosition}>
          {formatTextWithLinks(props.message.message)}
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
