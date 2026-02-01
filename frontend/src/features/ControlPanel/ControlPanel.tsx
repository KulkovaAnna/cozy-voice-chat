import { IconButton } from "../../components/IconButton";
import * as Styled from "./ControlPanel.styled";
import { useState } from "react";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import iconExit from "../../assets/exit.svg";
import iconMicOn from "../../assets/mic_on.svg";
import iconMicOff from "../../assets/mic_off.svg";

export const ControlPanel = () => {
  const [isMicMuted, setIsMicMuted] = useState(false);
  const { leaveRoom, setMicState } = useChatNetwork();

  const handleExit = () => {
    leaveRoom();
  };

  const handleMicState = () => {
    setMicState(!isMicMuted);
    setIsMicMuted((prev) => {
      return !prev;
    });
  };

  return (
    <Styled.ControlPanel>
      <IconButton
        icon={isMicMuted ? iconMicOff : iconMicOn}
        onClick={handleMicState}
      />
      <IconButton icon={iconExit} variant="secondary" onClick={handleExit} />
    </Styled.ControlPanel>
  );
};
