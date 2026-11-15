import { toast } from "react-toastify";

import { CopyLinkIcon, IconButton } from "@cvc/components";
import { useChatNetwork } from "@cvc/providers";
import { buildRoomLink } from "@cvc/utils";

import * as Styles from "./RoomControls.styles";

/**
 * Управление комнатой в лобби и в звонке:
 * - в лобби создаёт комнату;
 * - в 1-на-1 предлагает преобразовать звонок в комнату;
 * - в комнате показывает код и кнопку копирования ссылки.
 */
export function RoomControls() {
  const { callInfo, createRoom, convertToRoom } = useChatNetwork();

  const handleCopyLink = () => {
    if (!callInfo?.roomCode) return;

    const link = buildRoomLink(callInfo.roomCode);

    if (!navigator.clipboard) {
      toast(link);
      return;
    }

    void navigator.clipboard
      .writeText(link)
      .then(() => toast("Ссылка на комнату скопирована", { type: "success" }))
      .catch(() => toast(link));
  };

  if (callInfo) {
    if (callInfo.roomCode) {
      return (
        <Styles.RoomPanel>
          <Styles.RoomLabel>Комната</Styles.RoomLabel>
          <Styles.RoomCode>{callInfo.roomCode}</Styles.RoomCode>
          <IconButton
            title="Скопировать ссылку на комнату"
            aria-label="Скопировать ссылку на комнату"
            onClick={handleCopyLink}
            icon={<CopyLinkIcon />}
          />
        </Styles.RoomPanel>
      );
    }

    return (
      <Styles.ConvertButton variant="primary" onClick={convertToRoom}>
        Преобразовать в групповой чат
      </Styles.ConvertButton>
    );
  }

  return (
    <Styles.CreateButton variant="primary" onClick={createRoom}>
      Создать комнату
    </Styles.CreateButton>
  );
}