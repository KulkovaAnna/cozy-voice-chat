import { IconButton } from "../../components/IconButton";
import { Icons } from "../../components/IconButton/constants";
import * as Styled from "./ControlPanel.styled";
import { useState } from "react";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";

export const ControlPanel = () => {
  const [isMicOn, setIsMicOn] = useState(false);
  const { leaveRoom } = useChatNetwork();

  const handleExit = () => {
    leaveRoom();
  };

  return (
    <Styled.ControlPanel>
      <IconButton
        icon={isMicOn ? Icons.micOff : Icons.micOn}
        onClick={() => setIsMicOn((prev) => !prev)}
      />
      <IconButton
        icon={Icons.exitRoom}
        variant={"secondary"}
        onClick={handleExit}
      />
    </Styled.ControlPanel>
  );
};
