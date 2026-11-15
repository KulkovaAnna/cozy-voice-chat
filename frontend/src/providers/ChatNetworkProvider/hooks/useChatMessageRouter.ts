import { useCallback } from "react";

import type { ServerMessage } from "@cvc/types";

type RouterParams = {
  // Лобби
  handleLobbyJoined: (data: ServerMessage) => void;
  onMeLobbyJoined: (meId: string) => void;
  handleLobbyJoinRejected: (data: ServerMessage) => void;
  handleCallOffer: (data: ServerMessage) => void;
  handleCallOfferDeclined: VoidFunction;
  // Звонок
  setCallOfferNull: VoidFunction;
  handleCallStarted: (data: ServerMessage) => void;
  handleRoomJoined: (data: ServerMessage) => void;
  handleMemberJoined: (data: ServerMessage) => void;
  handleMemberLeft: (data: ServerMessage) => void;
  handleCallEnded: VoidFunction;
  handleOnlineChanged: (data: ServerMessage) => void;
  handleCallStateChanged: (data: ServerMessage) => void;
  handleCallProfileUpdated: (data: ServerMessage) => void;
  // Сообщения
  handleNewMessage: (data: ServerMessage) => void;
  // Музыка
  handleMusicStateChanged: (data: ServerMessage) => void;
  // Стадия выполнения моей слэш-команды
  handleCommandStatus: (data: ServerMessage) => void;
  // Ошибки от сервера
  handleError: (data: ServerMessage) => void;
};

export function useChatMessageRouter(params: RouterParams) {
  const route = useCallback(
    (event: MessageEvent) => {
      const data: ServerMessage = JSON.parse(event.data);

      switch (data.type) {
        case "all::lobby::joined":
        case "all::lobby::client-disconnected":
        case "all::lobby::profile-updated": {
          params.handleLobbyJoined(data);
          break;
        }
        case "me::lobby-joined": {
          const me = data.data.client;
          params.onMeLobbyJoined(me.id);
          break;
        }
        case "me::join-rejected": {
          params.handleLobbyJoinRejected(data);
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
        case "me::room-created": {
          params.handleCallStarted(data);
          break;
        }
        case "me::room-joined": {
          params.handleRoomJoined(data);
          break;
        }
        case "all::call::started": {
          params.setCallOfferNull();
          params.handleCallStarted(data);
          break;
        }
        case "all::call::member-joined": {
          params.handleMemberJoined(data);
          break;
        }
        case "all::call::member-left": {
          params.handleMemberLeft(data);
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
        case "all::call::screen-share-started": {
          params.handleCallStateChanged(data);
          break;
        }
        case "all::call::screen-share-stopped": {
          params.handleCallStateChanged(data);
          break;
        }
        case "all::call::profile-updated": {
          params.handleCallProfileUpdated(data);
          break;
        }
        case "all::call::music-state-changed": {
          params.handleMusicStateChanged(data);
          break;
        }
        case "me::command-status": {
          params.handleCommandStatus(data);
          break;
        }
        case "error": {
          params.handleError(data);
          break;
        }
      }
    },
    [params],
  );

  return { route };
}
