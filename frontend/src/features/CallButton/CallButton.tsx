import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import { IconButton } from "../../components/IconButton";
import { CallIcon } from "../../components/Icons";

interface CallButtonProps {
  uid: string;
}
export function CallButton({ uid }: CallButtonProps) {
  const { callToUser } = useChatNetwork();
  const handleClick = () => {
    callToUser(uid);
  };

  return <IconButton onClick={handleClick} icon={<CallIcon />} />;
}
