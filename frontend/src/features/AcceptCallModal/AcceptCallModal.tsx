import { useMemo } from "react";
import { Button } from "../../components/Button";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import Modal from "react-modal";
import { useTheme } from "@emotion/react";
import { useAuth } from "../../providers/AuthProvider";

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
    [],
  );

  return (
    <Modal
      isOpen={!!callOffer && callOffer?.initiator.id !== user.id}
      style={customStyles}
    >
      {callOffer?.initiator.name} выходит на связь
      <Button onClick={acceptCallOffer} isPrimary>
        Принять
      </Button>
      <Button onClick={declineCallOffer}>Отклонить</Button>
    </Modal>
  );
}
