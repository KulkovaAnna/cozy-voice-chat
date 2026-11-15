import { useCallback, useEffect } from "react";
import type { CallInfo, UserProfile } from "@cvc/types";

type SendFn = (type: string, data: Record<string, unknown>) => void;

type UseChatScreenShareParams = {
  send: SendFn;
  callInfo: CallInfo | null;
  user: UserProfile;
  startScreenShare: (
    targetUserIds: string[],
  ) => Promise<boolean | undefined>;
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

    const someoneElseSharing = callInfo.members.some(
      (member) =>
        member.member.id !== user.id && member.isScreenSharing,
    );
    if (someoneElseSharing) return;

    const targetIds = callInfo.members
      .filter((member) => member.member.id !== user.id)
      .map((member) => member.member.id)
      .filter((id): id is string => Boolean(id));

    if (targetIds.length === 0) return;

    const started = await startScreenShare(targetIds);

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
