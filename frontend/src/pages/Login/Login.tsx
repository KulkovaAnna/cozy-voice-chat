import { Navigate } from "react-router";

import { EnterUserNameForm } from "@cvc/features";
import { useAuth } from "@cvc/providers";

export const Login = () => {
  const { user } = useAuth();

  if (user.name) return <Navigate to="/" />;

  return <EnterUserNameForm />;
};
