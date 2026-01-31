import { useNavigate, useParams } from "react-router";
import { Column } from "../../components/Column";
import { UserCard } from "../../features/UserCard";
import { Card } from "../../components/Card";
import { ControlPanel } from "../../features/ControlPanel";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import { useEffect } from "react";

export const Room = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { userList, roomId } = useChatNetwork();

  useEffect(() => {
    if (!roomId) {
      navigate("/");
    }
  }, [roomId]);

  const userCards = userList?.map((profile) => (
    <UserCard key={profile.id} user={profile} isSpeaking={false} />
  ));

  return (
    <>
      <Column>
        <h1>Комната {params.roomId}</h1>
        <Card>
          <Column>{userCards}</Column>
        </Card>
        <audio id="user-voice" />
        <ControlPanel />
      </Column>
    </>
  );
};
