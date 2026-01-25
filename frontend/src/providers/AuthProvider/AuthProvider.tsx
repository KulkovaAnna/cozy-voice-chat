import { useState, type PropsWithChildren } from "react";
import { AuthContext } from "./AuthContext";

export function AuthProvider(props: PropsWithChildren) {
  const [userName, setUserName] = useState<string>(
    localStorage.getItem("userName") || "",
  );

  return (
    <AuthContext value={{ userName, setUserName }}>
      {props.children}
    </AuthContext>
  );
}
