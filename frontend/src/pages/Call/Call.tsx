import { useNavigate } from "react-router";
import { Column } from "../../components/Column";
import { UserCard } from "../../features/UserCard";
import { Card } from "../../components/Card";
import { ControlPanel } from "../../features/ControlPanel";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../providers/AuthProvider";

export const Call = () => {
  const navigate = useNavigate();
  const { callInfo } = useChatNetwork();
  const { user } = useAuth();
  const [volume, setVolume] = useState(1);

  const audioRef = useRef<HTMLAudioElement>(null);

  const handleVolumeChange = (volume: number) => {
    setVolume(volume);
  };

  useEffect(() => {
    if (!callInfo?.id) {
      navigate("/");
    }
  }, [callInfo?.id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

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
            volume={
              member.id !== user.id
                ? { value: volume, onVolumeChange: handleVolumeChange }
                : undefined
            }
          />
        )),
    [callInfo, user, volume],
  );

  return (
    <>
      <Column>
        <Card>
          <Column>{userCards}</Column>
        </Card>
        <audio ref={audioRef} id="user-voice" />
        <ControlPanel />
      </Column>
    </>
  );
};
