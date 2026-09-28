import { CallIcon, IconButton } from "@cvc/components";
import { useChatNetwork } from "@cvc/providers";

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
