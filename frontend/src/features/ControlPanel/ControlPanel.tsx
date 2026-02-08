import { IconButton } from "../../components/IconButton";
import * as Styled from "./ControlPanel.styled";
import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import { MicOffIcon } from "../../components/Icons";
import { MicOnIcon } from "../../components/Icons";
import { ExitIcon } from "../../components/Icons";

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
        icon={isMyUserMuted ? <MicOffIcon /> : <MicOnIcon />}
        onClick={handleMicState}
      />
      <IconButton
        icon={<ExitIcon />}
        variant="secondary"
        onClick={handleExit}
      />
    </Styled.ControlPanel>
  );
};
