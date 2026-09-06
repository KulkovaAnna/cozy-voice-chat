import { useContext } from "react";
import { TextChatContext } from "./TextChatContext";

export function useTextChat() {
  return useContext(TextChatContext);
}
