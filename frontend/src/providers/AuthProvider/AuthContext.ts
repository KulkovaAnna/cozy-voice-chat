import { createContext } from "react";
import type { User } from "../../types/clientTypes";

type AuthContextType = {
  user: User;
  updateUser: (user: Partial<User>) => void;
};

export const AuthContext = createContext<AuthContextType>({
  user: {
    userName: "",
    avatar: "",
  },
  updateUser: () => {},
});
