import { CallIcon, IconButton } from "@cvc/components";
import { useChatNetwork } from "@cvc/providers";

interface CallButtonProps {
  uid: string;
}
export function CallButton(props: CallButtonProps) {
  const { callToUser } = useChatNetwork();
  const handleClick = () => {
    callToUser(props.uid);
  };

  return <IconButton onClick={handleClick} icon={<CallIcon />} />;
}
