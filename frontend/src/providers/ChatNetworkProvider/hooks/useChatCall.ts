import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CallInfo, ServerMessage, UserProfile } from "@cvc/types";
import { callInfoAdapter } from "@cvc/utils";

type SendFn = (type: string, data: Record<string, unknown>) => void;

type UseChatCallParams = {
  user: UserProfile;
  send: SendFn;
  peerRef: {
    current: {
      callToUser: (uid: string) => void;
      endCall: VoidFunction;
      switchMicState: (state: boolean) => void;
    };
  };
};

export function useChatCall({ user, send, peerRef }: UseChatCallParams) {
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);

  const callInfoRef = useRef<CallInfo | null>(callInfo);

  useEffect(() => {
    callInfoRef.current = callInfo;
  }, [callInfo]);

  const isMyUserMuted = useMemo(
    () =>
      callInfo?.members.find((mem) => mem.member.id === user.id)?.isMuted ||
      false,
    [user.id, callInfo],
  );

  const isMyUserScreenSharing = useMemo(
    () =>
      callInfo?.members.find((mem) => mem.member.id === user.id)
        ?.isScreenSharing || false,
    [user.id, callInfo],
  );

  const endCall = useCallback(
    (nextCallInfo?: CallInfo) => {
      const call = nextCallInfo || callInfoRef.current;
      if (!call) return;

      send("call::end", { callId: call.id });
    },
    [send],
  );

  const changeMuteStatus = useCallback(
    (status: boolean) => {
      if (!callInfoRef.current) return;

      peerRef.current.switchMicState(!status);
      send("call::mute", { callId: callInfoRef.current.id, status });
    },
    [peerRef, send],
  );

  const changeIsSpeakingState = useCallback(
    (isSpeaking: boolean) => {
      if (!callInfoRef.current) return;

      send("call::speaking", {
        callId: callInfoRef.current.id,
        status: isSpeaking,
      });
    },
    [send],
  );

  const handleCallStarted = useCallback(
    (data: ServerMessage) => {
      const currentCallInfo = callInfoAdapter(data.data.callInfo);
      setCallInfo(currentCallInfo);

      const meString = localStorage.getItem("user");

      if (!meString) return;

      const me = JSON.parse(meString);

      if (me.id === currentCallInfo.initiator.id) {
        peerRef.current.callToUser(currentCallInfo.receiver.id!);
      }
    },
    [peerRef],
  );

  const handleCallEnded = useCallback(() => {
    peerRef.current.endCall();
    setCallInfo(null);
  }, [peerRef]);

  const handleOnlineChanged = useCallback(
    (data: ServerMessage) => {
      if (
        data.data.callInfo.members.filter(
          (mem: { online: boolean }) => mem.online,
        ).length < 2
      ) {
        endCall(callInfoAdapter(data.data.callInfo));
      }
    },
    [endCall],
  );

  const handleCallStateChanged = useCallback((data: ServerMessage) => {
    setCallInfo(callInfoAdapter(data.data.callInfo));
  }, []);

  const handleCallProfileUpdated = useCallback((data: ServerMessage) => {
    const currentCall = callInfoRef.current;
    if (!currentCall || data.data.callInfo?.id !== currentCall.id) return;

    setCallInfo(callInfoAdapter(data.data.callInfo));
  }, []);

  return {
    callInfo,
    callInfoRef,
    setCallInfo,
    isMyUserMuted,
    isMyUserScreenSharing,
    endCall,
    changeMuteStatus,
    changeIsSpeakingState,
    handleCallStarted,
    handleCallEnded,
    handleOnlineChanged,
    handleCallStateChanged,
    handleCallProfileUpdated,
  };
}
