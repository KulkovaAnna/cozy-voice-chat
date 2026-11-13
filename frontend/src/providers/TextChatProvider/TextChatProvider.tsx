import { useEffect, useRef, useState, type PropsWithChildren } from "react";

import { fetcher } from "@cvc/api";
import { usePageVisibility, useChatEmojiReaction } from "@cvc/hooks";
import type { Attachment } from "@cvc/types";
import { toast } from "react-toastify";
import { useAuth } from "../AuthProvider";
import { useChatNetwork } from "../ChatNetworkProvider";
import { TextChatContext } from "./TextChatContext";

export function TextChatProvider(props: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const isTabVisible = usePageVisibility();
  const { user } = useAuth();
  const { textMessages, callInfo, sendTextMessage } = useChatNetwork();
  const emojiReaction = useChatEmojiReaction(textMessages);

  const lastMessagesLength = useRef(0);

  const switchOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const readMessages = () => {
    setHasNewMessages(false);
  };

  useEffect(() => {
    if (
      textMessages.length > lastMessagesLength.current &&
      (!isOpen || !isTabVisible)
    ) {
      setHasNewMessages(true);
    }
    lastMessagesLength.current = textMessages.length;
  }, [textMessages, isOpen, isTabVisible]);

  useEffect(() => {
    if (isOpen && isTabVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasNewMessages(false);
    }
  }, [isOpen, isTabVisible]);

  const uploadAttachments = async (
    files: File[],
  ): Promise<Attachment[] | null> => {
    if (!callInfo || files.length === 0) return null;

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("callId", callInfo.id);
    formData.append("clientId", user.id ?? "");

    try {
      const res = await fetcher("/files/attachments", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = (await res.json()) as { files?: Attachment[] };
        return data.files ?? [];
      }
    } catch {
      // Сетевая ошибка — обрабатываем так же, как неуспешный ответ
    }

    toast("Что-то пошло не так", { type: "error" });
    return null;
  };

  return (
    <TextChatContext
      value={{
        textChatIsOpen: isOpen,
        messages: textMessages,
        hasNewMessages,
        readMessages,
        switchTextChatIsOpen: switchOpen,
        sendTextMessage,
        uploadAttachments,
        emojiReaction,
      }}
    >
      {props.children}
    </TextChatContext>
  );
}
