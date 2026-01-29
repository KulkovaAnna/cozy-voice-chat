import { type PropsWithChildren } from "react";
import { ThemeColorContext } from "./ThemeColorContext";
import useLocalStorage from "../../hooks/useLocalStorage";
import { lightTheme, darkTheme } from "../../theme";
import { ThemeProvider } from "@emotion/react";

export function ThemeColorProvider(props: PropsWithChildren) {
  const [isDarkMode, setIsDarkMode] = useLocalStorage("dark", "");
  const currentTheme = isDarkMode ? darkTheme : lightTheme;
  const themeWithName = {
    ...currentTheme,
    name: isDarkMode ? "dark" : "light",
  };
  return (
    <ThemeColorContext value={{ isDarkMode, setIsDarkMode }}>
      <ThemeProvider theme={themeWithName}>{props.children}</ThemeProvider>
    </ThemeColorContext>
  );
}
