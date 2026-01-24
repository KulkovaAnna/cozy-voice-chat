import React from "react";
import { ThemeProvider } from "@emotion/react";
import { lightTheme, darkTheme } from "./theme";
import { GlobalStyles } from "./theme/GlobalStyles";
import AppContent from "./AppContent";

function ThemedApp() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const currentTheme = isDarkMode ? darkTheme : lightTheme;
  const themeWithName = {
    ...currentTheme,
    name: isDarkMode ? "dark" : "light",
  };

  return (
    <ThemeProvider theme={themeWithName}>
      <GlobalStyles />
      <AppContent
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
      />
    </ThemeProvider>
  );
}

export default ThemedApp;
