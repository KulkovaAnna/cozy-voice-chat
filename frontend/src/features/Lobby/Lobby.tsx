import { useMemo } from "react";
import { Navigate } from "react-router";
import { Card } from "../../components/Card";
import { Column } from "../../components/Column";
import { LobbyRow } from "../../components/LobbyRow/LobbyRow";
import { useAuth } from "../../providers/AuthProvider";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import type { UserProfile } from "../../types";
import { AcceptCallModal } from "../AcceptCallModal/AcceptCallModal";
import { WaitCallModal } from "../WaitCallModal";

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
