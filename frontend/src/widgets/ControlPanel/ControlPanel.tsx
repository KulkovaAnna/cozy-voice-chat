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
import * as Styles from "./ControlPanel.styles";

export interface ControlPanelProps {
  compact?: boolean;
}

export const ControlPanel = (props: ControlPanelProps) => {
  const {
    callInfo,
    endCall,
    leaveCall,
    changeMuteStatus,
    isMyUserMuted,
    beginScreenShare,
    endScreenShare,
    isMyUserScreenSharing,
    remoteScreenStream,
  } = useChatNetwork();
  const { textChatIsOpen, hasNewMessages, switchTextChatIsOpen } =
    useTextChat();

  /** Комната (есть код) — можно выйти, сохранив звонок для остальных */
  const isRoom = !!callInfo?.roomCode;
  const anotherMemberSharing =
    !isMyUserScreenSharing &&
    !!callInfo?.members.some((member) => member.isScreenSharing);

  const handleExit = () => {
    // В 1-на-1 красная кнопка завершает звонок для обоих, в комнате —
    // только выводит из неё.
    if (isRoom) {
      leaveCall();
      return;
    }
    endCall();
  };

  const handleMicState = () => {
    changeMuteStatus(!isMyUserMuted);
  };

  return (
    <Styles.ControlPanel compact={props.compact}>
      <IconButton
        icon={isMyUserMuted ? <MicOffIcon /> : <MicOnIcon />}
        onClick={handleMicState}
        title={isMyUserMuted ? "Включить звук" : "Выключить звук"}
      />
      <IconButton
        icon={hasNewMessages ? <UnreadMessageIcon /> : <ChatIcon />}
        onClick={switchTextChatIsOpen}
        title={textChatIsOpen ? "Закрыть чат" : "Открыть чат"}
      />
      <IconButton
        title={
          remoteScreenStream || anotherMemberSharing
            ? "Другой участник сейчас демонстрирует экран"
            : "Поделиться экраном"
        }
        disabled={!!remoteScreenStream || anotherMemberSharing}
        onClick={isMyUserScreenSharing ? endScreenShare : beginScreenShare}
        icon={
          isMyUserScreenSharing ? <StopShareScreenIcon /> : <ShareScreenIcon />
        }
      />
      <IconButton
        icon={<EndCallIcon />}
        variant="error"
        title={isRoom ? "Покинуть комнату" : "Завершить звонок"}
        onClick={handleExit}
      />
    </Styles.ControlPanel>
  );
};
