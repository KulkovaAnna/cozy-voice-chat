import { useAuth } from "../../providers/AuthProvider";

export const UserName = () => {
  const { user } = useAuth();
  return <p>{user.userName}</p>;
};
