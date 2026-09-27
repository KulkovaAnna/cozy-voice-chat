import { useCallback } from "react";
import type { ServerMessage } from "../../../types";

type RouterParams = {
  // Лобби
  handleLobbyJoined: (data: ServerMessage) => void;
  onMeLobbyJoined: (meId: string) => void;
  handleCallOffer: (data: ServerMessage) => void;
  handleCallOfferDeclined: VoidFunction;
  // Звонок
  setCallOfferNull: VoidFunction;
  handleCallStarted: (data: ServerMessage) => void;
  handleCallEnded: VoidFunction;
  handleOnlineChanged: (data: ServerMessage) => void;
  handleCallStateChanged: (data: ServerMessage) => void;
  // Сообщения
  handleNewMessage: (data: ServerMessage) => void;
  handleFileReceived: (data: ServerMessage) => void;
};

export function useChatMessageRouter(params: RouterParams) {
  const route = useCallback(
    (event: MessageEvent) => {
      const data: ServerMessage = JSON.parse(event.data);

      switch (data.type) {
        case "all::lobby::joined":
        case "all::lobby::client-disconnected": {
          params.handleLobbyJoined(data);
          break;
        }
        case "me::lobby-joined": {
          const me = data.data.client;
          params.onMeLobbyJoined(me.id);
          break;
        }
        case "me::call-offer":
        case "me::call-initiated": {
          params.handleCallOffer(data);
          break;
        }
        case "me::call-offer-declined": {
          params.handleCallOfferDeclined();
          break;
        }
        case "all::call::started": {
          params.setCallOfferNull();
          params.handleCallStarted(data);
          break;
        }
        case "all::call::ended": {
          params.handleCallEnded();
          break;
        }
        case "all::call::online-changed": {
          params.handleOnlineChanged(data);
          break;
        }
        case "all::call::mute-changed":
        case "all::call::speaking-changed": {
          params.handleCallStateChanged(data);
          break;
        }
        case "all::call::new-message": {
          params.handleNewMessage(data);
          break;
        }
        case "all::call::file-received": {
          params.handleFileReceived(data);
          break;
        }
        case "all::call::screen-share-started": {
          params.handleCallStateChanged(data);
          break;
        }
        case "all::call::screen-share-stopped": {
          params.handleCallStateChanged(data);
          break;
        }
      }
    },
    [params],
  );

  return { route };
}
