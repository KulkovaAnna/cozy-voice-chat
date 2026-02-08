import { Card } from "../../components/Card";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import type { UserProfile } from "../../types";
import { Column } from "../../components/Column";
import { AcceptCallModal } from "../AcceptCallModal/AcceptCallModal";
import { WaitCallModal } from "../WaitCallModal";
import { LobbyRow } from "../../components/LobbyRow/LobbyRow";
import { Navigate } from "react-router";
import { useMemo } from "react";
import { useAuth } from "../../providers/AuthProvider";

export function Lobby() {
  const { lobbyMembers, callInfo } = useChatNetwork();
  const { user } = useAuth();

  if (callInfo) return <Navigate to={`/call/${callInfo.id}`} />;

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

  return (
    <Card>
      <Column>{currentLobbyMembers}</Column>
      <AcceptCallModal />
      <WaitCallModal />
    </Card>
  );
}
