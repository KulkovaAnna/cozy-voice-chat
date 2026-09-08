import { ThemeProvider } from "@emotion/react";
import { type PropsWithChildren } from "react";
import { ToastContainer } from "react-toastify";
import useLocalStorage from "../../hooks/useLocalStorage";
import { darkTheme, lightTheme } from "../../theme";
import { ThemeColorContext } from "./ThemeColorContext";

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
      <ToastContainer
        theme={themeWithName.name}
        aria-label="toast"
        position="bottom-left"
      />
    </ThemeColorContext>
  );
}
