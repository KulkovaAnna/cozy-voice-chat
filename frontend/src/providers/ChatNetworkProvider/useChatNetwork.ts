import { useContext } from "react";
import { ChatNetworkContext } from "./ChatNetworkContext";

export function useChatNetwork() {
  return useContext(ChatNetworkContext);
}
