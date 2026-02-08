import { Card } from "../../components/Card";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import type { UserProfile } from "../../types";
import { Column } from "../../components/Column";
import { AcceptCallModal } from "../AcceptCallModal/AcceptCallModal";
import { WaitCallModal } from "../WaitCallModal";
import { LobbyRow } from "../../components/LobbyRow/LobbyRow";
import { Navigate } from "react-router";

export function Lobby() {
  const { lobbyMembers, callInfo } = useChatNetwork();

  if (callInfo) return <Navigate to={`/call/${callInfo.id}`} />;

  const currentLobbyMembers = lobbyMembers?.map((member: UserProfile) =>
    member.name ? <LobbyRow key={member.id} currentUser={member} /> : null,
  );

  return (
    <Card>
      <Column>{currentLobbyMembers}</Column>
      <AcceptCallModal />
      <WaitCallModal />
    </Card>
  );
}
