import { createContext } from "react";
import type { TextMessage } from "@cvc/types";

import type { EmojiReaction } from "@cvc/hooks";

export type TextChatContextType = {
  textChatIsOpen: boolean;
  messages: TextMessage[];
  hasNewMessages: boolean;
  switchTextChatIsOpen: VoidFunction;
  readMessages: VoidFunction;
  sendTextMessage: (msg: string) => void;
  sendFile: (file: File) => Promise<{ fileId: string }>;
  emojiReaction: EmojiReaction | null;
};

export const TextChatContext = createContext<TextChatContextType>({
  textChatIsOpen: false,
  messages: [],
  hasNewMessages: false,
  switchTextChatIsOpen: () => {},
  readMessages: () => {},
  sendTextMessage: () => {},
  sendFile: async () => ({ fileId: "" }),
  emojiReaction: null,
});
