import { IconButton } from "../../components/IconButton";
import * as Styled from "./ControlPanel.styled";
import { useState } from "react";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import iconExit from "../../assets/exit.svg";
import iconMicOn from "../../assets/mic_on.svg";
import iconMicOff from "../../assets/mic_off.svg";

export const ControlPanel = () => {
  const [isMicOn, setIsMicOn] = useState(false);
  const { leaveRoom, muteMic } = useChatNetwork();

  const handleExit = () => {
    leaveRoom();
  };

  const handleMicMute = () => {
    muteMic(!isMicOn);
    setIsMicOn((prev) => {
      return !prev;
    });
  };

  return (
    <Styled.ControlPanel>
      <IconButton
        icon={isMicOn ? iconMicOff : iconMicOn}
        onClick={handleMicMute}
      />
      <IconButton icon={iconExit} variant="secondary" onClick={handleExit} />
    </Styled.ControlPanel>
  );
};
