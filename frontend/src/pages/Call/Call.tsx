import { useNavigate } from "react-router";
import { Column } from "../../components/Column";
import { UserCard } from "../../features/UserCard";
import { Card } from "../../components/Card";
import { ControlPanel } from "../../features/ControlPanel";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import { useEffect, useMemo } from "react";
import { useAuth } from "../../providers/AuthProvider";

export const Call = () => {
  const navigate = useNavigate();
  const { callInfo } = useChatNetwork();
  const { user } = useAuth();
  useEffect(() => {
    if (!callInfo?.id) {
      navigate("/");
    }
  }, [callInfo?.id]);

  const userCards = useMemo(
    () =>
      callInfo?.members
        ?.sort((a) => (a.member.id === user.id ? -1 : 1))
        .map(({ member, isSpeaking, isMuted }) => (
          <UserCard
            key={member.id}
            user={member}
            isSpeaking={isSpeaking}
            isMuted={isMuted}
          />
        )),
    [callInfo, user],
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
