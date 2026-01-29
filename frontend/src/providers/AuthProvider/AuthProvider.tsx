import { type PropsWithChildren } from "react";
import { AuthContext } from "./AuthContext";
import useLocalStorage from "../../hooks/useLocalStorage";
import type { User } from "../../types/clientTypes";

export function AuthProvider(props: PropsWithChildren) {
  const [user, setUser] = useLocalStorage("user", "{}");
  const updateUser = (u: Partial<User>) => {
    setUser(JSON.stringify({ ...JSON.parse(user), ...u }));
  };

  return (
    <AuthContext value={{ user: JSON.parse(user), updateUser }}>
      {props.children}
    </AuthContext>
  );
}
