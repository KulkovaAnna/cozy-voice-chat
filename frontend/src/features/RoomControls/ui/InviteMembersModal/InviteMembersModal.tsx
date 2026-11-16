import { useMemo } from "react";

import Modal from "react-modal";
import { useTheme } from "@emotion/react";

import {
  CallIcon,
  CloseIcon,
  IconButton,
  LoadingIcon,
} from "@cvc/components";
import { useAuth, useChatNetwork } from "@cvc/providers";
import {
  backgroundToCss,
  cardTextToCss,
  getInviteCandidates,
} from "@cvc/utils";

import * as Styles from "./InviteMembersModal.styles";

Modal.setAppElement("#root");

type InviteMembersModalProps = {
  isOpen: boolean;
  onClose: VoidFunction;
};

/**
 * Модалка приглашения в комнату: список участников лобби, которые ещё не в
 * звонке. Пока приглашённый не ответил, его кнопка заблокирована.
 */
export function InviteMembersModal(props: InviteMembersModalProps) {
  const { isOpen, onClose } = props;
  const theme = useTheme();
  const { user } = useAuth();
  const { callInfo, lobbyMembers, pendingInvites, inviteToRoom } =
    useChatNetwork();

  const candidates = useMemo(
    () =>
      getInviteCandidates(
        lobbyMembers ?? [],
        (callInfo?.members ?? []).map((member) => member.member.id ?? ""),
        user.id,
      ),
    [callInfo, lobbyMembers, user.id],
  );

  const pendingIds = useMemo(
    () => new Set(pendingInvites.map((invite) => invite.clientId)),
    [pendingInvites],
  );

  const customStyles: Modal.Styles = useMemo(
    () => ({
      content: {
        top: "50%",
        left: "50%",
        right: "auto",
        bottom: "auto",
        marginRight: "-50%",
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        width: "90vw",
        maxWidth: "420px",
        border: "none",
        boxShadow: `0px 0px 4px 2px ${theme.colors.secondary.dark}`,
        backgroundColor: theme.colors.background.card,
        color: theme.colors.text.primary,
      },
      overlay: {
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      },
    }),
    [theme],
  );

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      shouldCloseOnOverlayClick
      style={customStyles}
    >
      <Styles.Header>
        <Styles.Title>Пригласить в комнату</Styles.Title>
        <IconButton
          title="Закрыть"
          aria-label="Закрыть"
          variant="secondary"
          onClick={onClose}
          icon={<CloseIcon />}
        />
      </Styles.Header>

      {candidates.length === 0 && (
        <Styles.Empty>В лобби пока некого приглашать</Styles.Empty>
      )}

      {candidates.length > 0 && (
        <Styles.List>
          {candidates.map((member) => {
            const background = member.cardAppearance?.background;
            const border = member.cardAppearance?.avatarBorder;
            const textStyle = cardTextToCss(member.cardAppearance);
            const isPending = !!member.id && pendingIds.has(member.id);

            return (
              <Styles.Row key={member.id} style={backgroundToCss(background)}>
                <Styles.MemberInfo>
                  <Styles.RowAvatar
                    src={member.avatar}
                    size={40}
                    border={border}
                  />
                  <Styles.Name style={textStyle} title={member.name}>
                    {member.name}
                  </Styles.Name>
                </Styles.MemberInfo>
                <IconButton
                  title={isPending ? "Ожидаем ответ…" : "Пригласить в комнату"}
                  aria-label={
                    isPending ? "Ожидаем ответ" : "Пригласить в комнату"
                  }
                  disabled={isPending}
                  style={{ minWidth: 40, height: 40 }}
                  onClick={() => member.id && inviteToRoom(member.id)}
                  icon={
                    isPending ? (
                      <LoadingIcon styles={{ width: 20, height: 20 }} />
                    ) : (
                      <CallIcon />
                    )
                  }
                />
              </Styles.Row>
            );
          })}
        </Styles.List>
      )}
    </Modal>
  );
}
