import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Column } from "../../components/Column";
import {
  ControlPanel,
  ShareScreenVideo,
  TextChat,
  UserCard,
} from "../../features";
import { useAuth } from "../../providers/AuthProvider";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import { TextChatProvider } from "../../providers/TextChatProvider";
import { Row } from "../../components/Row";
import { StyledCard } from "./Call.styles";

export const Call = () => {
  const navigate = useNavigate();
  const { callInfo, remoteScreenStream, localScreenStream } = useChatNetwork();
  const { user } = useAuth();
  const [volume, setVolume] = useState(1);

  const screenSharing = remoteScreenStream || localScreenStream;

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
            variant={screenSharing ? "compact" : "standard"}
            volume={
              member.id !== user.id
                ? { value: volume, onVolumeChange: handleVolumeChange }
                : undefined
            }
          />
        )),
    [callInfo, user, volume, screenSharing],
  );

  const UserCards = screenSharing ? Row : Column;

  return (
    <TextChatProvider>
      <Column>
        <StyledCard $compact={!!screenSharing}>
          <UserCards>{userCards}</UserCards>
        </StyledCard>
        <audio ref={audioRef} id="user-voice" />
        <ControlPanel compact={!!screenSharing} />
        <TextChat />
        {screenSharing && (
          <ShareScreenVideo height="60vh" width="70vw" stream={screenSharing} />
        )}
      </Column>
    </TextChatProvider>
  );
};
