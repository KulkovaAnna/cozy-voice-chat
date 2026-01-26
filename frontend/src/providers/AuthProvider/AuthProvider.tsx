import { type PropsWithChildren } from "react";
import { AuthContext } from "./AuthContext";
import useLocalStorage from "../../hooks/useLocalStorage";

export function AuthProvider(props: PropsWithChildren) {
  const [userName, setUserName] = useLocalStorage("userName", "");
  return (
    <AuthContext value={{ userName, setUserName }}>
      {props.children}
    </AuthContext>
  );
}
