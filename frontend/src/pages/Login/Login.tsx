import { Navigate } from "react-router";
import { EnterUserNameForm } from "../../features/EnterUserNameForm";
import { useAuth } from "../../providers/AuthProvider";

export const Login = () => {
  const { user } = useAuth();

  if (user.name) return <Navigate to="/" />;

  return <EnterUserNameForm />;
};
