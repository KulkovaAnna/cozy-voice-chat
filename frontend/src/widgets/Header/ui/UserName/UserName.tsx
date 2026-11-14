import { useAuth } from "@cvc/providers";

import * as Styles from "./UserName.styles";

export const UserName = () => {
  const { user } = useAuth();
  return <Styles.UserName title={user.name}>{user.name}</Styles.UserName>;
};
