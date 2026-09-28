import { Navigate } from "react-router";

import { Lobby } from "@cvc/features";
import { useAuth } from "@cvc/providers";

export const Home = () => {
  const { user } = useAuth();

  if (!user.name) return <Navigate to="/login" />;

  return <Lobby />;
};
