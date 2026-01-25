import { createContext, type Dispatch, type SetStateAction } from "react";

type AuthContextType = {
  userName: string;
  setUserName: Dispatch<SetStateAction<string>>;
};

export const AuthContext = createContext<AuthContextType>({
  userName: "",
  setUserName: () => {},
});
