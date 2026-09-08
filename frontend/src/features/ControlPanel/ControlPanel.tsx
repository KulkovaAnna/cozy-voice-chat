import { IconButton } from "../../components/IconButton";
import {
  ChatIcon,
  EndCallIcon,
  MicOffIcon,
  MicOnIcon,
  UnreadMessageIcon,
} from "../../components/Icons";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import { useTextChat } from "../../providers/TextChatProvider/useTextChat";
import * as Styled from "./ControlPanel.styled";

export const ControlPanel = () => {
  const { endCall, changeMuteStatus, isMyUserMuted } = useChatNetwork();
  const { hasNewMessages, switchTextChatIsOpen } = useTextChat();

  const handleExit = () => {
    endCall();
  };

  const handleMicState = () => {
    changeMuteStatus(!isMyUserMuted);
  };

  return (
    <Styled.ControlPanel>
      <IconButton
        icon={isMyUserMuted ? <MicOffIcon /> : <MicOnIcon />}
        onClick={handleMicState}
      />
      <IconButton
        icon={hasNewMessages ? <UnreadMessageIcon /> : <ChatIcon />}
        onClick={switchTextChatIsOpen}
      />
      <IconButton icon={<EndCallIcon />} variant="error" onClick={handleExit} />
    </Styled.ControlPanel>
  );
};
