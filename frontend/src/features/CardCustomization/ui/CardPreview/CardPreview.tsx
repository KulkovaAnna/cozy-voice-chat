import { useRef } from "react";

import { Avatar } from "@cvc/components";
import type { CardAppearance } from "@cvc/types";
import { backgroundToCss, cardTextToCss } from "@cvc/utils";

import * as Styles from "./CardPreview.styles";

interface CardPreviewProps {
  name: string;
  avatar: string | null;
  appearance: CardAppearance;
  onAvatarChange?: (file: File) => void;
}

export function CardPreview(props: CardPreviewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const background = props.appearance.background;
  const border = props.appearance.avatarBorder;
  const textStyle = cardTextToCss(props.appearance);

  const avatarTitle = props.onAvatarChange
    ? "Нажмите, чтобы сменить аватар"
    : "Аватар";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) props.onAvatarChange?.(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const renderAvatar = (size: number) => (
    <Styles.AvatarArea
      title={avatarTitle}
      $clickable={!!props.onAvatarChange}
      onClick={() => props.onAvatarChange && fileInputRef.current?.click()}
    >
      <Avatar src={props.avatar ?? undefined} size={size} border={border} />
    </Styles.AvatarArea>
  );

  return (
    <Styles.Container>
      {props.onAvatarChange && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleFileChange}
        />
      )}

      <Styles.PreviewColumn>
        <Styles.PreviewLabel>В лобби</Styles.PreviewLabel>
        <Styles.LobbyCard style={backgroundToCss(background)}>
          <Styles.LobbyInnerContainer>
            {renderAvatar(40)}
            <Styles.NameEllipsis style={textStyle}>
              {props.name || "Без имени"}
            </Styles.NameEllipsis>
          </Styles.LobbyInnerContainer>
          <p style={textStyle}>Это&nbsp;ты</p>
        </Styles.LobbyCard>
      </Styles.PreviewColumn>

      <Styles.PreviewColumn>
        <Styles.PreviewLabel>В звонке</Styles.PreviewLabel>
        <Styles.CallCard style={backgroundToCss(background)}>
          {renderAvatar(80)}
          <Styles.CallName style={textStyle}>
            {props.name || "Без имени"}
          </Styles.CallName>
        </Styles.CallCard>
      </Styles.PreviewColumn>
    </Styles.Container>
  );
}
