import { type PropsWithChildren } from "react";

import { useLocalStorage } from "@cvc/hooks";
import { darkTheme, lightTheme } from "@cvc/theme";
import { ThemeProvider } from "@emotion/react";
import { ToastContainer } from "react-toastify";
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
