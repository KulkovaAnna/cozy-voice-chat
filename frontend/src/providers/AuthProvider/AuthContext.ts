import { createContext } from "react";

import type { UserProfile } from "@cvc/types";

type AuthContextType = {
  user: UserProfile;
  updateUser: (user: Partial<UserProfile>) => void;
};

export const AuthContext = createContext<AuthContextType>({
  user: {
    name: "",
  },
  updateUser: () => {},
});
