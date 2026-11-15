import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Column, ShareScreenVideo } from "@cvc/components";
import { TextChatProvider, useAuth, useChatNetwork } from "@cvc/providers";
import { readActiveRoom } from "@cvc/utils";
import { ControlPanel, PiPWidget, TextChat, UserCardsList } from "@cvc/widgets";

import * as Styles from "./Call.styles";

/** Отдельный <audio> на каждого удалённого участника mesh-звонка */
function RemoteAudio(props: { stream: MediaStream; volume: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.srcObject = props.stream;
    audio.play().catch((error) => {
      console.warn("Не удалось воспроизвести голос участника", error);
    });
  }, [props.stream]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = props.volume;
  }, [props.volume]);

  return <audio ref={audioRef} autoPlay playsInline />;
}

export const Call = () => {
  const navigate = useNavigate();
  const { callId } = useParams();
  const { callInfo, remoteStreams, remoteScreenStream, localScreenStream } =
    useChatNetwork();
  const { user } = useAuth();
  const [volumes, setVolumes] = useState<Record<string, number>>({});

  const screenSharing = remoteScreenStream || localScreenStream;

  const handleVolumeChange = (memberId: string, volume: number) => {
    setVolumes((prev) => ({ ...prev, [memberId]: volume }));
  };

  useEffect(() => {
    if (callInfo?.id) return;

    // После F5 возвращаемся в комнату, а не в лобби. Для direct-звонка
    // сохранённой комнаты нет — уходим на главную, как и раньше.
    const activeRoom = readActiveRoom();
    if (activeRoom && activeRoom.callId === callId) {
      navigate(`/join/${activeRoom.roomCode}`, { replace: true });
      return;
    }

    navigate("/");
  }, [callId, callInfo?.id, navigate]);

  const sortedMembers = useMemo(
    () =>
      [...(callInfo?.members ?? [])].sort((a) =>
        a.member.id === user.id ? -1 : 1,
      ),
    [callInfo, user],
  );

  return (
    <TextChatProvider>
      <Column>
        <Styles.StyledCard $compact={!!screenSharing}>
          <UserCardsList
            members={sortedMembers}
            myId={user.id ?? ""}
            volumes={volumes}
            onVolumeChange={handleVolumeChange}
            compact={!!screenSharing}
          />
        </Styles.StyledCard>
        {Array.from(remoteStreams.entries()).map(([memberId, stream]) => (
          <RemoteAudio
            key={memberId}
            stream={stream}
            volume={volumes[memberId] ?? 1}
          />
        ))}
        <ControlPanel compact={!!screenSharing} />
        <TextChat />
        {screenSharing && (
          <ShareScreenVideo height="60vh" width="70vw" stream={screenSharing} />
        )}
        <PiPWidget />
      </Column>
    </TextChatProvider>
  );
};
