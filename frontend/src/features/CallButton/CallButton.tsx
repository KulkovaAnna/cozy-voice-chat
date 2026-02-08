import { useChatNetwork } from "../../providers/ChatNetworkProvider";
import * as Styled from "./CallButton.styled";

interface CallButtonProps {
  uid: string;
}
export function CallButton({ uid }: CallButtonProps) {
  const { callToUser } = useChatNetwork();
  const handleClick = () => {
    callToUser(uid);
  };

  return (
    <Styled.CallButton onClick={handleClick} isPrimary>
      Позвонить
    </Styled.CallButton>
  );
}
