import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import {
  Button,
  Card,
  Column,
  ShareScreenVideo,
  TopLeftCorner,
} from "@cvc/components";
import { RoomControls } from "@cvc/features";
import { TextChatProvider, useAuth, useChatNetwork } from "@cvc/providers";
import { readActiveCall } from "@cvc/utils";
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
  const {
    callInfo,
    callRestoreState,
    restoreCall,
    remoteStreams,
    remoteScreenStream,
    localScreenStream,
  } = useChatNetwork();
  const { user } = useAuth();
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [activeCall] = useState(readActiveCall);
  const restoreRequestedRef = useRef(false);
  const hadCallRef = useRef(false);

  const screenSharing = remoteScreenStream || localScreenStream;

  const handleVolumeChange = (memberId: string, volume: number) => {
    setVolumes((prev) => ({ ...prev, [memberId]: volume }));
  };

  useEffect(() => {
    if (callInfo?.id) {
      hadCallRef.current = true;
      return;
    }

    // Звонок уже был в этой вкладке и завершился/мы вышли — в лобби.
    if (hadCallRef.current) {
      navigate("/");
      return;
    }

    if (restoreRequestedRef.current) return;

    // После F5 возвращаемся в звонок по callId — и для комнаты, и для 1-на-1.
    if (activeCall && activeCall.callId === callId) {
      restoreRequestedRef.current = true;
      restoreCall(activeCall.callId);
      return;
    }

    navigate("/");
  }, [activeCall, callId, callInfo?.id, navigate, restoreCall]);

  const sortedMembers = useMemo(
    () =>
      [...(callInfo?.members ?? [])].sort((a) =>
        a.member.id === user.id ? -1 : 1,
      ),
    [callInfo, user],
  );

  // Восстановление ещё идёт или не удалось — не показываем пустой звонок.
  if (!callInfo) {
    if (callRestoreState === "idle") return null;

    const failed = callRestoreState === "failed";

    return (
      <Card direction="column">
        <Column align="center">
          <h2>{failed ? "Не удалось вернуться в звонок" : "Возвращаемся…"}</h2>
          {failed && (
            <p>Звонок уже завершён или вы не являетесь его участником.</p>
          )}
          {failed && (
            <Button
              onClick={() =>
                navigate(
                  activeCall?.roomCode ? `/join/${activeCall.roomCode}` : "/",
                )
              }
            >
              Вернуться в лобби
            </Button>
          )}
        </Column>
      </Card>
    );
  }

  return (
    <TextChatProvider>
      <TopLeftCorner>
        <RoomControls />
      </TopLeftCorner>
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
