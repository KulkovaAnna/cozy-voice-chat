import { useEffect, useRef, useState, type PropsWithChildren } from "react";

import { usePageVisibility } from "../../hooks/usePageVisibility";
import { useChatNetwork } from "../ChatNetworkProvider";
import { TextChatContext } from "./TextChatContext";
import { toast } from "react-toastify";
import { fetcher } from "../../api";

export function TextChatProvider(props: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const isTabVisible = usePageVisibility();
  const { textMessages, callInfo, sendTextMessage } = useChatNetwork();

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const sendFile = async (file: File) => {
    if (!callInfo) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("callId", callInfo.id);
    const res = await fetcher("/files/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      return res.json();
    } else {
      toast("Что-то пошло не так", { type: "error" });
    }
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
        sendFile,
      }}
    >
      {props.children}
    </TextChatContext>
  );
}
