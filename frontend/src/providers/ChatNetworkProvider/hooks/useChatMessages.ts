import { useCallback } from "react";
import type {
  CallInfo,
  FileInfoDTO,
  MessageDto,
  ServerMessage,
  TextMessage,
} from "../../../types";
import { textMessageAdapter } from "../../../utils/adapters";

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
    (msg: string) => {
      if (!callInfoRef.current) return;

      send("call::send-message", {
        callId: callInfoRef.current.id,
        text: msg,
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

  const handleFileReceived = useCallback(
    (data: ServerMessage) => {
      const fileInfo = data.data as unknown as FileInfoDTO;
      setTextMessages((prev) => [
        ...prev,
        {
          id: "file-msg" + fileInfo.fileId,
          message: "",
          senderId: fileInfo.senderInfo.id,
          timestamp: fileInfo.timestamp,
          senderAvatar: fileInfo.senderInfo.avatar,
          senderName: fileInfo.senderInfo.name,
          attachment: {
            id: fileInfo.fileId,
            fileName: fileInfo.originalName,
            fileSize: fileInfo.size,
          },
        },
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
    handleFileReceived,
    resetMessages,
  };
}
