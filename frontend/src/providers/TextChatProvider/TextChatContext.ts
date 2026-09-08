import { createContext } from "react";
import type { TextMessage } from "../../types";

export type TextChatContextType = {
  textChatIsOpen: boolean;
  messages: TextMessage[];
  hasNewMessages: boolean;
  switchTextChatIsOpen: VoidFunction;
  readMessages: VoidFunction;
  sendTextMessage: (msg: string) => void;
  sendFile: (file: File) => Promise<{ fileId: string }>;
};

export const TextChatContext = createContext<TextChatContextType>({
  textChatIsOpen: false,
  messages: [],
  hasNewMessages: false,
  switchTextChatIsOpen: () => {},
  readMessages: () => {},
  sendTextMessage: () => {},
  sendFile: async () => ({ fileId: "" }),
});
