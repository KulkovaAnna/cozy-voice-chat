import { useCallback, useState } from "react";

import type {
  CallOffer,
  CardAppearance,
  ServerMessage,
  UserDTO,
  UserProfile,
} from "@cvc/types";
import { userAdapter } from "@cvc/utils/adapters";
import * as settingsStore from "@cvc/utils/settingsStore";

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

export function useChatLobby({ user, send }: UseChatLobbyParams) {
  const [callOffer, setCallOffer] = useState<CallOffer | null>(null);
  const [lobbyMembers, setLobbyMembers] = useState<Array<UserProfile>>([]);

  const joinToLobby = useCallback(() => {
    const { avatar, cardAppearance } = settingsStore.get().profile;
    send("lobby::join", {
      clientId: user.id ?? null,
      personalInfo: {
        name: user.name,
        avatar,
        cardAppearance,
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
  }, [callOffer, send]);

  const declineCallOffer = useCallback(() => {
    if (!callOffer) return;
    send("lobby::decline-offer", { offerId: callOffer.id });
    setCallOffer(null);
  }, [callOffer, send]);

  const updateProfile = useCallback(
    (personalInfo?: Partial<ProfilePayload>) => {
      const { avatar, cardAppearance } = settingsStore.get().profile;
      send("lobby::update-profile", {
        personalInfo: {
          name: personalInfo?.name ?? user.name,
          avatar: personalInfo?.avatar ?? avatar,
          cardAppearance: personalInfo?.cardAppearance ?? cardAppearance,
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

  const handleCallOffer = useCallback((data: ServerMessage) => {
    const newCallOffer = data.data.callOffer;
    setCallOffer({
      id: newCallOffer.id,
      initiator: userAdapter(newCallOffer.initiator),
    });
  }, []);

  const handleCallOfferDeclined = useCallback(() => {
    setCallOffer(null);
  }, []);

  const clearCallOffer = useCallback(() => {
    setCallOffer(null);
  }, []);

  return {
    callOffer,
    lobbyMembers,
    joinToLobby,
    callToUser,
    acceptCallOffer,
    declineCallOffer,
    updateProfile,
    handleLobbyJoined,
    handleCallOffer,
    handleCallOfferDeclined,
    clearCallOffer,
  };
}
