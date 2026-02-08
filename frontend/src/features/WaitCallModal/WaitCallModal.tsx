import Modal from "react-modal";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import { useAuth } from "../../providers/AuthProvider";
import { Button } from "../../components/Button";
import { useMemo } from "react";
import { useTheme } from "@emotion/react";

export function WaitCallModal() {
  const { callOffer, declineCallOffer } = useChatNetwork();
  const { user } = useAuth();
  const theme = useTheme();

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
      style={customStyles}
      isOpen={!!callOffer && callOffer.initiator.id === user.id}
    >
      {/* TODO: добавить инфу о ресивере */}
      Вы звоните неизвестно кому
      <Button onClick={declineCallOffer}>Отменить</Button>
    </Modal>
  );
}
