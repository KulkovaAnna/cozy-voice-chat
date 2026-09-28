import {
  ChatIcon,
  EndCallIcon,
  IconButton,
  MicOffIcon,
  MicOnIcon,
  ShareScreenIcon,
  StopShareScreenIcon,
  UnreadMessageIcon,
} from "@cvc/components";
import { useChatNetwork, useTextChat } from "@cvc/providers";
import * as Styled from "./ControlPanel.styled";

export interface ControlPanelProps {
  compact?: boolean;
}

export const ControlPanel = (props: ControlPanelProps) => {
  const {
    endCall,
    changeMuteStatus,
    isMyUserMuted,
    beginScreenShare,
    endScreenShare,
    isMyUserScreenSharing,
    remoteScreenStream,
  } = useChatNetwork();
  const { hasNewMessages, switchTextChatIsOpen } = useTextChat();

  const handleExit = () => {
    endCall();
  };

  const handleMicState = () => {
    changeMuteStatus(!isMyUserMuted);
  };

  return (
    <Styled.ControlPanel compact={props.compact}>
      <IconButton
        icon={isMyUserMuted ? <MicOffIcon /> : <MicOnIcon />}
        onClick={handleMicState}
      />
      <IconButton
        icon={hasNewMessages ? <UnreadMessageIcon /> : <ChatIcon />}
        onClick={switchTextChatIsOpen}
      />
      <IconButton
        title={
          remoteScreenStream
            ? "Другой участник сейчас демонстрирует экран"
            : undefined
        }
        disabled={!!remoteScreenStream}
        onClick={isMyUserScreenSharing ? endScreenShare : beginScreenShare}
        icon={
          isMyUserScreenSharing ? <StopShareScreenIcon /> : <ShareScreenIcon />
        }
      />
      <IconButton icon={<EndCallIcon />} variant="error" onClick={handleExit} />
    </Styled.ControlPanel>
  );
};
