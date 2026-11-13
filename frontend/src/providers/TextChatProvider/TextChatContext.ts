import { createContext } from "react";
import type { Attachment, TextMessage } from "@cvc/types";

import type { EmojiReaction } from "@cvc/hooks";

export type TextChatContextType = {
  textChatIsOpen: boolean;
  messages: TextMessage[];
  hasNewMessages: boolean;
  switchTextChatIsOpen: VoidFunction;
  readMessages: VoidFunction;
  sendTextMessage: (msg: string, attachmentIds?: string[]) => void;
  /** Загружает файлы на сервер и возвращает их описания (null при ошибке) */
  uploadAttachments: (files: File[]) => Promise<Attachment[] | null>;
  emojiReaction: EmojiReaction | null;
};

export const TextChatContext = createContext<TextChatContextType>({
  textChatIsOpen: false,
  messages: [],
  hasNewMessages: false,
  switchTextChatIsOpen: () => {},
  readMessages: () => {},
  sendTextMessage: () => {},
  uploadAttachments: async () => null,
  emojiReaction: null,
});
