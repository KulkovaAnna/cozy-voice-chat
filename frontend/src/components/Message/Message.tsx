import { useState } from "react";

import { API_URLS } from "@cvc/api/config";
import type { TextMessage } from "@cvc/types";
import { getAttachmentKind } from "@cvc/utils";

import { Avatar } from "../Avatar";
import { Carousel, type CarouselItem } from "../Carousel";
import { DownLoadFileIcon } from "../Icons";
import * as Styles from "./Message.styles";
import { formatNewLines, formatTextWithLinks } from "./utils";

export type MessageProps = {
  message: TextMessage;
  anglePosition: "left" | "right";
};

export function Message(props: MessageProps) {
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const { attachments = [], isSystem } = props.message;
  const attachmentUrl = `${API_URLS.BASE_URL}/files`;

  const msg = isSystem
    ? {
        senderAvatar: "/coza.svg",
        senderName: "Cozy",
        message: props.message.message,
      }
    : props.message;

  const images = attachments.filter(
    (attachment) => getAttachmentKind(attachment.fileName) === "image",
  );
  const videos = attachments.filter(
    (attachment) => getAttachmentKind(attachment.fileName) === "video",
  );
  const audios = attachments.filter(
    (attachment) => getAttachmentKind(attachment.fileName) === "audio",
  );
  const files = attachments.filter(
    (attachment) => getAttachmentKind(attachment.fileName) === "file",
  );

  const galleryItems: CarouselItem[] = images.map((image) => ({
    id: image.id,
    src: `${attachmentUrl}/view/${image.id}`,
    alt: image.fileName,
  }));

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
              {images.length === 1 && (
                <Styles.PreviewButton
                  type="button"
                  aria-label={`Открыть изображение ${images[0].fileName}`}
                  onClick={() => setGalleryIndex(0)}
                >
                  <Styles.PreviewImage
                    src={`${attachmentUrl}/view/${images[0].id}`}
                    alt={images[0].fileName}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </Styles.PreviewButton>
              )}
              {images.length > 1 && (
                <Styles.ImageGrid $columns={Math.min(images.length, 3)}>
                  {images.map((image, index) => (
                    <Styles.ThumbButton
                      key={image.id}
                      type="button"
                      aria-label={`Открыть изображение ${image.fileName}`}
                      onClick={() => setGalleryIndex(index)}
                    >
                      <Styles.ThumbImage
                        src={`${attachmentUrl}/view/${image.id}`}
                        alt={image.fileName}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                    </Styles.ThumbButton>
                  ))}
                </Styles.ImageGrid>
              )}
              {videos.map((attachment) => (
                <Styles.VideoPlayer
                  key={attachment.id}
                  src={`${attachmentUrl}/view/${attachment.id}`}
                  title={attachment.fileName}
                  aria-label={`Видео ${attachment.fileName}`}
                  controls
                  preload="metadata"
                  playsInline
                />
              ))}
              {audios.map((attachment) => (
                <Styles.AudioPlayer
                  key={attachment.id}
                  src={`${attachmentUrl}/view/${attachment.id}`}
                  title={attachment.fileName}
                  aria-label={`Аудио ${attachment.fileName}`}
                  controls
                  preload="metadata"
                />
              ))}
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
      {galleryIndex !== null && (
        <Carousel
          items={galleryItems}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}
    </Styles.Container>
  );
}
