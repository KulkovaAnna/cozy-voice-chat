import { Navigate } from "react-router";
import { Lobby } from "../../features/Lobby";
import { useAuth } from "../../providers/AuthProvider";

export const Home = () => {
  const { user } = useAuth();

  if (!user.name) return <Navigate to="/login" />;

  return <Lobby />;
};
