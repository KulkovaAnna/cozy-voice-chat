import { Navigate, useLocation } from "react-router";

import { EnterUserNameForm } from "@cvc/features";
import { useAuth } from "@cvc/providers";

export const Login = () => {
  const { user } = useAuth();
  const location = useLocation();
  const pendingRoom = sessionStorage.getItem("cvc:join-room");
  const from =
    (location.state as { from?: string } | null)?.from ??
    (pendingRoom ? `/join/${pendingRoom}` : "/");

  if (user.name) return <Navigate to={from} replace />;

  return <EnterUserNameForm redirectTo={from} />;
};
