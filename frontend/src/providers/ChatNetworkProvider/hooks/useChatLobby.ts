import { useCallback, useState } from "react";

import type {
  CallOffer,
  CardAppearance,
  PendingRoomInvite,
  ServerMessage,
  UserDTO,
  UserProfile,
} from "@cvc/types";
import { userAdapter } from "@cvc/utils/adapters";
import { useSettingsStore } from "@cvc/utils/settingsStore";

type SendFn = (type: string, data: Record<string, unknown>) => void;

type UseChatLobbyParams = {
  user: UserProfile;
  send: SendFn;
};

export type ProfilePayload = {
  name: string;
  avatar: string | null;
  cardAppearance: CardAppearance;
};

/** Оффер с сервера: клиент + данные приглашения */
type ServerCallOffer = {
  id: string;
  kind?: "direct" | "room";
  callId?: string | null;
  roomCode?: string | null;
  initiator: UserDTO;
  receiver?: UserDTO | null;
};

/** Приводит серверный оффер к клиентскому виду и заполняет поля по умолчанию */
function parseCallOffer(raw: ServerCallOffer): CallOffer {
  return {
    id: raw.id,
    kind: raw.kind === "room" ? "room" : "direct",
    callId: raw.callId ?? null,
    roomCode: raw.roomCode ?? null,
    initiator: userAdapter(raw.initiator),
    receiver: raw.receiver ? userAdapter(raw.receiver) : null,
  };
}

export function useChatLobby({ user, send }: UseChatLobbyParams) {
  const [callOffer, setCallOffer] = useState<CallOffer | null>(null);
  const [lobbyMembers, setLobbyMembers] = useState<Array<UserProfile>>([]);
  /** Приглашения в комнату, ожидающие ответа получателя */
  const [pendingInvites, setPendingInvites] = useState<Array<PendingRoomInvite>>(
    [],
  );

  const joinToLobby = useCallback(() => {
    const profile = useSettingsStore.getState().profile;
    send("lobby::join", {
      clientId: user.id ?? null,
      personalInfo: {
        name: user.name,
        avatar: profile.avatar,
        cardAppearance: profile.cardAppearance,
      },
    });
  }, [send, user.id, user.name]);

  const callToUser = useCallback(
    (uid: string) => {
      send("lobby::initiate-call", { receiverId: uid });
    },
    [send],
  );

  const acceptCallOffer = useCallback(() => {
    if (!callOffer) return;
    send("lobby::accept-offer", { offerId: callOffer.id });
    // Для приглашения в комнату состояние звонка придёт отдельным снимком,
    // а модалку закрываем сразу, не дожидаясь ответа сервера.
    setCallOffer(null);
  }, [callOffer, send]);

  const declineCallOffer = useCallback(() => {
    if (!callOffer) return;
    send("lobby::decline-offer", { offerId: callOffer.id });
    setCallOffer(null);
  }, [callOffer, send]);

  const updateProfile = useCallback(
    (personalInfo?: Partial<ProfilePayload>) => {
      const profile = useSettingsStore.getState().profile;
      send("lobby::update-profile", {
        personalInfo: {
          name: personalInfo?.name ?? user.name,
          avatar: personalInfo?.avatar ?? profile.avatar,
          cardAppearance:
            personalInfo?.cardAppearance ?? profile.cardAppearance,
        },
      });
    },
    [send, user.name],
  );

  const handleLobbyJoined = useCallback((data: ServerMessage) => {
    const currentLobbyMembers = data.data.lobbyInfo.members.map(
      (member: UserDTO) => userAdapter(member),
    );
    setLobbyMembers(currentLobbyMembers);
  }, []);

  const handleCallOffer = useCallback(
    (data: ServerMessage) => {
      const raw = data.data?.callOffer as ServerCallOffer | undefined;
      if (!raw) return;

      const offer = parseCallOffer(raw);

      // Приглашение в комнату у инициатора не открывает модалку входящего:
      // вместо этого блокируется кнопка конкретного участника до ответа.
      if (offer.kind === "room" && offer.initiator.id === user.id) {
        const clientId = offer.receiver?.id;
        if (!clientId) return;

        setPendingInvites((prev) => {
          const exists = prev.some((invite) => invite.clientId === clientId);
          if (!exists) return [...prev, { offerId: offer.id, clientId }];

          return prev.map((invite) =>
            invite.clientId === clientId
              ? { offerId: offer.id, clientId }
              : invite,
          );
        });
        return;
      }

      setCallOffer(offer);
    },
    [user.id],
  );

  /**
   * Оптимистично помечает участника как «ждём ответа» ещё до подтверждения
   * сервера — так двойной клик не создаст второй оффер.
   */
  const startPendingInvite = useCallback((clientId: string) => {
    setPendingInvites((prev) =>
      prev.some((invite) => invite.clientId === clientId)
        ? prev
        : [...prev, { offerId: null, clientId }],
    );
  }, []);

  /**
   * Оффер отклонён. Для приглашения в комнату снимаем блокировку с кнопки
   * участника и возвращаем его имя — вызывающий покажет тост.
   */
  const handleCallOfferDeclined = useCallback(
    (data?: ServerMessage): string | null => {
      setCallOffer(null);

      const raw = data?.data?.callOffer as ServerCallOffer | undefined;
      if (!raw || raw.kind !== "room" || raw.initiator.id !== user.id) {
        return null;
      }

      const clientId = raw.receiver?.id;
      if (clientId) {
        setPendingInvites((prev) =>
          prev.filter((invite) => invite.clientId !== clientId),
        );
      }

      return raw.receiver?.personalInfo?.name ?? null;
    },
    [user.id],
  );

  /** Приглашение принято — участник уже в звонке, снимаем ожидание */
  const handleCallOfferAccepted = useCallback((data: ServerMessage) => {
    const raw = data.data?.callOffer as ServerCallOffer | undefined;
    if (!raw || raw.kind !== "room") return;

    const clientId = raw.receiver?.id;
    if (!clientId) return;

    setPendingInvites((prev) =>
      prev.filter((invite) => invite.clientId !== clientId),
    );
  }, []);

  /** Приглашение не создано (занят, комната заполнена и т.п.) */
  const handleInviteFailed = useCallback(
    (data: ServerMessage): string | null => {
      const clientId = data.data?.receiverId;
      if (typeof clientId === "string") {
        setPendingInvites((prev) =>
          prev.filter((invite) => invite.clientId !== clientId),
        );
      }

      return typeof data.data?.message === "string"
        ? data.data.message
        : null;
    },
    [],
  );

  const removePendingInvite = useCallback((clientId: string) => {
    setPendingInvites((prev) =>
      prev.filter((invite) => invite.clientId !== clientId),
    );
  }, []);

  const clearPendingInvites = useCallback(() => {
    setPendingInvites([]);
  }, []);

  const clearCallOffer = useCallback(() => {
    setCallOffer(null);
  }, []);

  return {
    callOffer,
    lobbyMembers,
    pendingInvites,
    joinToLobby,
    callToUser,
    acceptCallOffer,
    declineCallOffer,
    updateProfile,
    handleLobbyJoined,
    handleCallOffer,
    handleCallOfferDeclined,
    handleCallOfferAccepted,
    handleInviteFailed,
    startPendingInvite,
    removePendingInvite,
    clearPendingInvites,
    clearCallOffer,
  };
}
