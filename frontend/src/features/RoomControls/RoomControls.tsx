import { useChatNetwork } from "@cvc/providers";

import * as Styles from "./RoomControls.styles";

/** Компактная кнопка создания комнаты в лобби */
export function RoomControls() {
  const { createRoom } = useChatNetwork();

  return (
    <Styles.CreateButton variant="primary" onClick={createRoom}>
      Создать комнату
    </Styles.CreateButton>
  );
}