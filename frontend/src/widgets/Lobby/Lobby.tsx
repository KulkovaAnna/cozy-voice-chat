import { useMemo } from "react";
import { Navigate } from "react-router";

import { Card, Column, TopRightCorner } from "@cvc/components";
import { AcceptCallModal, RoomControls, WaitCallModal } from "@cvc/features";
import { useAuth, useChatNetwork } from "@cvc/providers";
import type { UserProfile } from "@cvc/types";

import * as Styles from "./Lobby.styles";
import { LobbyRow } from "./ui/LobbyRow";

export function Lobby() {
  const { lobbyMembers, callInfo } = useChatNetwork();
  const { user } = useAuth();

  const currentLobbyMembers = useMemo(
    () =>
      lobbyMembers
        ?.sort((a, b) => (a.name > b.name ? 1 : -1))
        .sort((a) => (a.id === user.id ? -1 : 1))
        ?.map((member: UserProfile) =>
          member.name ? (
            <LobbyRow key={member.id} currentUser={member} />
          ) : null,
        ),
    [lobbyMembers, user],
  );

  if (callInfo) return <Navigate to={`/call/${callInfo.id}`} />;

  return (
    <>
      <TopRightCorner>
        <RoomControls />
      </TopRightCorner>
      <Card direction="column">
        <Styles.Title>Лобби</Styles.Title>
        <Column>{currentLobbyMembers}</Column>
        <AcceptCallModal />
        <WaitCallModal />
      </Card>
    </>
  );
}
