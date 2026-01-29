import { createContext, type Dispatch, type SetStateAction } from "react";

type ThemeColorContextType = {
  isDarkMode: string;
  setIsDarkMode: Dispatch<SetStateAction<string>>;
};

export const ThemeColorContext = createContext<ThemeColorContextType>({
  isDarkMode: "",
  setIsDarkMode: () => {},
});
