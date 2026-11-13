import { useCallback } from "react";
import type { CallInfo, MessageDto, ServerMessage, TextMessage } from "@cvc/types";

import { textMessageAdapter } from "@cvc/utils";

type SendFn = (type: string, data: Record<string, unknown>) => void;

type UseChatMessagesParams = {
  send: SendFn;
  callInfoRef: { current: CallInfo | null };
  setTextMessages: React.Dispatch<React.SetStateAction<Array<TextMessage>>>;
};

export function useChatMessages({
  send,
  callInfoRef,
  setTextMessages,
}: UseChatMessagesParams) {
  const sendTextMessage = useCallback(
    (msg: string, attachmentIds: string[] = []) => {
      if (!callInfoRef.current) return;

      send("call::send-message", {
        callId: callInfoRef.current.id,
        text: msg,
        ...(attachmentIds.length > 0 ? { attachmentIds } : {}),
      });
    },
    [callInfoRef, send],
  );

  const handleNewMessage = useCallback(
    (data: ServerMessage) => {
      setTextMessages((prev) => [
        ...prev,
        textMessageAdapter(data.data as unknown as MessageDto),
      ]);
    },
    [setTextMessages],
  );

  const resetMessages = useCallback(() => {
    setTextMessages([]);
  }, [setTextMessages]);

  return {
    sendTextMessage,
    handleNewMessage,
    resetMessages,
  };
}
