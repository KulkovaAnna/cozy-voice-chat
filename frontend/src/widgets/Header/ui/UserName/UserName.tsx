import { useAuth } from "@cvc/providers";

export const UserName = () => {
  const { user } = useAuth();
  return <p>{user.name}</p>;
};
