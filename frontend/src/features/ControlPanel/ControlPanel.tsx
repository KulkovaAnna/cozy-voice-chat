import { IconButton } from "../../components/IconButton";
import * as Styled from "./ControlPanel.styled";
import iconExit from "../../assets/exit.svg";
import iconMicOn from "../../assets/mic_on.svg";
import iconMicOff from "../../assets/mic_off.svg";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";

export const ControlPanel = () => {
  const { endCall, changeMuteStatus, isMyUserMuted } = useChatNetwork();

  const handleExit = () => {
    endCall();
  };

  const handleMicState = () => {
    changeMuteStatus(!isMyUserMuted);
  };

  return (
    <Styled.ControlPanel>
      <IconButton
        icon={isMyUserMuted ? iconMicOff : iconMicOn}
        onClick={handleMicState}
      />
      <IconButton icon={iconExit} variant="secondary" onClick={handleExit} />
    </Styled.ControlPanel>
  );
};
