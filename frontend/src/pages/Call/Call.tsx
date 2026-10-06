import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { Column, ShareScreenVideo } from "@cvc/components";
import { TextChatProvider, useAuth, useChatNetwork } from "@cvc/providers";
import { ControlPanel, PiPWidget, TextChat, UserCardsList } from "@cvc/widgets";

import * as Styles from "./Call.styles";

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
            volume={volume}
            onVolumeChange={handleVolumeChange}
            compact={!!screenSharing}
          />
        </Styles.StyledCard>
        <audio ref={audioRef} id="user-voice" />
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
