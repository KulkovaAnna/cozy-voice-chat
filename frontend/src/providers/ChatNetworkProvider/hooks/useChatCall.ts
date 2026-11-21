import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CallInfo, ServerMessage, UserProfile } from "@cvc/types";
import { callInfoAdapter } from "@cvc/utils";

type SendFn = (type: string, data: Record<string, unknown>) => void;

type UseChatCallParams = {
  user: UserProfile;
  send: SendFn;
  peerRef: {
    current: {
      connectToMembers: (memberIds: string[]) => void;
      disconnectMembers: (memberIds: string[]) => void;
      addScreenShareTarget: (peerId: string) => void;
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

  const handleCallStarted = useCallback((data: ServerMessage) => {
    setCallInfo(callInfoAdapter(data.data.callInfo));
  }, []);

  /**
   * Mesh-соединения звонка: при каждом изменении состава участников
   * подключаем новых и отключаем вышедших. Правило одно и для 1-на-1,
   * и для комнат — так восстанавливается звук после возврата в звонок.
   */
  const memberIdsKey = useMemo(
    () =>
      (callInfo?.members ?? [])
        .map((member) => member.member.id ?? "")
        .filter(Boolean)
        .sort()
        .join(","),
    [callInfo],
  );

  useEffect(() => {
    if (!callInfo) return;

    const memberIds = memberIdsKey ? memberIdsKey.split(",") : [];
    peerRef.current.connectToMembers(memberIds);
  }, [callInfo, memberIdsKey, peerRef]);

  const handleCallEnded = useCallback(() => {
    peerRef.current.endCall();
    setCallInfo(null);
  }, [peerRef]);

  const handleOnlineChanged = useCallback((data: ServerMessage) => {
    // Смена online-статуса больше не завершает 1-на-1: отключившийся
    // участник возвращается после F5, а звонок живёт без него.
    setCallInfo(callInfoAdapter(data.data.callInfo));
  }, []);

  const handleCallStateChanged = useCallback((data: ServerMessage) => {
    setCallInfo(callInfoAdapter(data.data.callInfo));
  }, []);

  const handleCallProfileUpdated = useCallback((data: ServerMessage) => {
    const currentCall = callInfoRef.current;
    if (!currentCall || data.data.callInfo?.id !== currentCall.id) return;

    setCallInfo(callInfoAdapter(data.data.callInfo));
  }, []);

  /** Новый участник комнаты */
  const handleMemberJoined = useCallback(
    (data: ServerMessage) => {
      setCallInfo(callInfoAdapter(data.data.callInfo));

      // Если я уже делюсь экраном — досылаем поток новому участнику
      const clientId = data.data.client?.id;
      if (typeof clientId === "string") {
        peerRef.current.addScreenShareTarget(clientId);
      }
    },
    [peerRef],
  );

  /** Участник вышел из комнаты */
  const handleMemberLeft = useCallback((data: ServerMessage) => {
    const leftId = data.data.clientId;
    setCallInfo(callInfoAdapter(data.data.callInfo));

    if (typeof leftId === "string") {
      peerRef.current.disconnectMembers([leftId]);
    }
  }, [peerRef]);

  /**
   * Покинуть звонок. В комнате звонок остаётся для других участников;
   * завершение 1-на-1 для обоих выполняет endCall().
   */
  const leaveCall = useCallback(() => {
    const call = callInfoRef.current;
    if (!call) return;

    send("call::leave", { callId: call.id });
    peerRef.current.endCall();
    setCallInfo(null);
  }, [peerRef, send]);

  return {
    callInfo,
    callInfoRef,
    setCallInfo,
    isMyUserMuted,
    isMyUserScreenSharing,
    endCall,
    leaveCall,
    changeMuteStatus,
    changeIsSpeakingState,
    handleCallStarted,
    handleCallEnded,
    handleOnlineChanged,
    handleCallStateChanged,
    handleCallProfileUpdated,
    handleMemberJoined,
    handleMemberLeft,
  };
}
