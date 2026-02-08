import { useNavigate } from "react-router";
import { Column } from "../../components/Column";
import { UserCard } from "../../features/UserCard";
import { Card } from "../../components/Card";
import { ControlPanel } from "../../features/ControlPanel";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import { useEffect } from "react";

export const Room = () => {
  const navigate = useNavigate();
  const { callInfo } = useChatNetwork();

  useEffect(() => {
    if (!callInfo?.id) {
      navigate("/");
    }
  }, [callInfo?.id]);

  const userCards = callInfo?.members?.map(
    ({ member, isSpeaking, isMuted }) => (
      <UserCard
        key={member.id}
        user={member}
        isSpeaking={isSpeaking}
        isMuted={isMuted}
      />
    ),
  );

  return (
    <>
      <Column>
        <Card>
          <Column>{userCards}</Column>
        </Card>
        <audio id="user-voice" />
        <ControlPanel />
      </Column>
    </>
  );
};
