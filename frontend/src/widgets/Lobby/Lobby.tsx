import { useMemo } from "react";

import { Card, Column } from "@cvc/components";
import { AcceptCallModal, WaitCallModal } from "@cvc/features";
import { useAuth, useChatNetwork } from "@cvc/providers";
import type { UserProfile } from "@cvc/types";
import { Navigate } from "react-router";
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
    <Card direction="column">
      <h2>Лобби</h2>
      <Column>{currentLobbyMembers}</Column>
      <AcceptCallModal />
      <WaitCallModal />
    </Card>
  );
}
