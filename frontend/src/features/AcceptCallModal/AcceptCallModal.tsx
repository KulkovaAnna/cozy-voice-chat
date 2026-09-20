import { useTheme } from "@emotion/react";
import { useMemo } from "react";
import Modal from "react-modal";
import { Audio } from "../../components/Audio";
import { Button } from "../../components/Button";
import { useAuth } from "../../providers/AuthProvider";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import * as Styles from "./AcceptCallModal.styles";

Modal.setAppElement("#root");

export function AcceptCallModal() {
  const { callOffer, acceptCallOffer, declineCallOffer } = useChatNetwork();
  const theme = useTheme();
  const { user } = useAuth();

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
        border: "none",
        boxShadow: `0px 0px 4px 2px ${theme.colors.secondary.dark}`,
        backgroundColor: theme.colors.background.card,
        text: theme.colors.text.primary,
      },
      overlay: {
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      },
    }),
    [theme],
  );

  return (
    <Modal
      isOpen={!!callOffer && callOffer?.initiator.id !== user.id}
      style={customStyles}
    >
      <h2>{callOffer?.initiator.name} выходит на связь</h2>
      <Styles.ButtonsPanel>
        <Button onClick={acceptCallOffer} isPrimary>
          Принять
        </Button>
        <Button onClick={declineCallOffer}>Отклонить</Button>
      </Styles.ButtonsPanel>

      <Audio src="/audio/ringtone.mp3" />
    </Modal>
  );
}
