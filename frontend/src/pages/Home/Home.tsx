import { Navigate } from "react-router";

import { useAuth } from "@cvc/providers";
import { Lobby } from "@cvc/widgets";

export const Home = () => {
  const { user } = useAuth();

  if (!user.name) return <Navigate to="/login" />;

  return <Lobby />;
};
