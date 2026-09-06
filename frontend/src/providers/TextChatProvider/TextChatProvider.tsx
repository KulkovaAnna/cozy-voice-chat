import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { TextChatContext } from "./TextChatContext";
import { useChatNetwork } from "../ChatNetworkProvider";
import { usePageVisibility } from "../../hooks/usePageVisibility";

export function TextChatProvider(props: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const isTabVisible = usePageVisibility();
  const { textMessages, sendTextMessage } = useChatNetwork();

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

  return (
    <TextChatContext
      value={{
        textChatIsOpen: isOpen,
        messages: textMessages,
        hasNewMessages,
        readMessages,
        switchTextChatIsOpen: switchOpen,
        sendTextMessage,
      }}
    >
      {props.children}
    </TextChatContext>
  );
}
