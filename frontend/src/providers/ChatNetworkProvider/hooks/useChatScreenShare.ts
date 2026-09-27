import { useCallback, useEffect } from "react";
import type { CallInfo, UserProfile } from "../../../types";

type SendFn = (type: string, data: Record<string, unknown>) => void;

type UseChatScreenShareParams = {
  send: SendFn;
  callInfo: CallInfo | null;
  user: UserProfile;
  startScreenShare: (targetUserId: string) => Promise<boolean | undefined>;
  stopScreenShare: VoidFunction;
  setOnRemoteScreenStream: (cb: (s: MediaStream | null) => void) => void;
  setOnLocalScreenStop: (cb: () => void) => void;
};

export function useChatScreenShare({
  send,
  callInfo,
  user,
  startScreenShare,
  stopScreenShare,
  setOnRemoteScreenStream,
  setOnLocalScreenStop,
}: UseChatScreenShareParams) {
  const endScreenShare = useCallback(() => {
    if (!callInfo) return;

    send("call::stop-screen-sharing", {
      callId: callInfo.id,
      sharerId: user.id,
    });
    stopScreenShare();
  }, [callInfo, send, stopScreenShare, user.id]);

  const beginScreenShare = useCallback(async () => {
    if (!callInfo) return;

    const other = callInfo.members.find((m) => m.member.id !== user.id)?.member
      .id;
    if (!other) return;

    const started = await startScreenShare(other);

    if (started) {
      send("call::start-screen-sharing", { callId: callInfo.id });
    }
  }, [callInfo, send, startScreenShare, user.id]);

  useEffect(() => {
    setOnRemoteScreenStream(() => {});
    setOnLocalScreenStop(endScreenShare);
  }, [setOnRemoteScreenStream, setOnLocalScreenStop, endScreenShare]);

  return {
    beginScreenShare,
    endScreenShare,
  };
}
