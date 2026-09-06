import { IconButton } from "../../components/IconButton";
import {
  ExitIcon,
  MicOffIcon,
  MicOnIcon,
  ChatIcon,
  UnreadMessageIcon,
} from "../../components/Icons";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import * as Styled from "./ControlPanel.styled";
import { useTextChat } from "../../providers/TextChatProvider/useTextChat";

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
      <IconButton
        icon={<ExitIcon />}
        variant="secondary"
        onClick={handleExit}
      />
    </Styled.ControlPanel>
  );
};
