import {
  ChatIcon,
  CopyLinkIcon,
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
import { getRoomShareOrigin } from "@cvc/utils";
import { toast } from "react-toastify";

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

  const isGroupRoom = callInfo?.type === "group";
  const anotherMemberSharing =
    !isMyUserScreenSharing &&
    !!callInfo?.members.some((member) => member.isScreenSharing);

  const handleExit = () => {
    if (isGroupRoom) {
      leaveCall();
      return;
    }
    endCall();
  };

  const handleMicState = () => {
    changeMuteStatus(!isMyUserMuted);
  };

  const handleCopyRoomLink = () => {
    if (!callInfo?.roomCode) return;

    const link = `${getRoomShareOrigin()}/join/${callInfo.roomCode}`;

    if (!navigator.clipboard) {
      toast(link);
      return;
    }

    void navigator.clipboard
      .writeText(link)
      .then(() => toast("Ссылка на комнату скопирована", { type: "success" }))
      .catch(() => toast(link));
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
        variant="secondary"
        title="Скопировать ссылку на комнату"
        aria-label="Скопировать ссылку на комнату"
        onClick={handleCopyRoomLink}
        icon={<CopyLinkIcon />}
      />
      {callInfo?.type === "group" && callInfo.roomCode && (
        <IconButton
          icon={<EndCallIcon />}
          variant="error"
          title={isGroupRoom ? "Покинуть комнату" : "Завершить звонок"}
          onClick={handleExit}
        />
      )}
    </Styles.ControlPanel>
  );
};
