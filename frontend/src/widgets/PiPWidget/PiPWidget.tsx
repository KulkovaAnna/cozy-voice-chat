import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import {
  Avatar,
  EndCallIcon,
  IconButton,
  MicOffIcon,
  MicOnIcon,
} from "@cvc/components";
import { useAuth, useChatNetwork, usePiP } from "@cvc/providers";

import * as Styles from "./PiPWidget.styles";

export const PiPWidget = () => {
  const { isOpen, pipWindow, close } = usePiP();
  const { callInfo, isMyUserMuted, changeMuteStatus, endCall } =
    useChatNetwork();
  const { user } = useAuth();

  // Звонок завершён — закрываем окно PiP, чтобы не оставлять пустой оверлей.
  useEffect(() => {
    if (isOpen && !callInfo?.id) {
      close();
    }
  }, [isOpen, callInfo?.id, close]);

  const participants = useMemo(
    () =>
      callInfo?.members
        ?.sort((a) => (a.member.id === user.id ? -1 : 1))
        .map(({ member, isSpeaking, isMuted }) => (
          <Styles.Participant key={member.id}>
            <Styles.AvatarBlock>
              <Styles.AvatarRing isSpeaking={isSpeaking}>
                <Avatar size={48} src={member.avatar} />
              </Styles.AvatarRing>
              {isMuted && (
                <Styles.MutedBadge>
                  <MicOffIcon />
                </Styles.MutedBadge>
              )}
            </Styles.AvatarBlock>
            <Styles.Name>{member.name}</Styles.Name>
          </Styles.Participant>
        )),
    [callInfo, user.id],
  );

  if (!isOpen || !pipWindow || !callInfo) return null;

  return createPortal(
    <Styles.Window>
      <Styles.Participants>{participants}</Styles.Participants>
      <Styles.Controls>
        <IconButton
          title={isMyUserMuted ? "Включить микрофон" : "Выключить микрофон"}
          icon={isMyUserMuted ? <MicOffIcon /> : <MicOnIcon />}
          onClick={() => changeMuteStatus(!isMyUserMuted)}
        />
        <IconButton
          title="Завершить звонок"
          icon={<EndCallIcon />}
          variant="error"
          onClick={() => endCall()}
        />
      </Styles.Controls>
    </Styles.Window>,
    pipWindow.document.body,
  );
};
