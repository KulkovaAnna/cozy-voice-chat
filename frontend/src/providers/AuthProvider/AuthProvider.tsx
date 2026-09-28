import { type PropsWithChildren } from "react";

import { useLocalStorage } from "@cvc/hooks";
import type { UserProfile } from "@cvc/types";
import { AuthContext } from "./AuthContext";

export function AuthProvider(props: PropsWithChildren) {
  const [user, setUser] = useLocalStorage("user", "{}");
  const updateUser = (u: Partial<UserProfile>) => {
    setUser(JSON.stringify({ ...JSON.parse(user), ...u }));
  };

  return (
    <AuthContext value={{ user: JSON.parse(user), updateUser }}>
      {props.children}
    </AuthContext>
  );
}
