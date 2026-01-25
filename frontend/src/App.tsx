import React from "react";
import { ThemeProvider } from "@emotion/react";
import { lightTheme, darkTheme } from "./theme";
import { GlobalStyles } from "./theme/GlobalStyles";
import StartPage from "./pages/StartPage/StartPage";
import { AuthProvider } from "./providers/AuthProvider";

function App() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const currentTheme = isDarkMode ? darkTheme : lightTheme;
  const themeWithName = {
    ...currentTheme,
    name: isDarkMode ? "dark" : "light",
  };

  return (
    <ThemeProvider theme={themeWithName}>
      <AuthProvider>
        <GlobalStyles />
        <StartPage
          isDarkMode={isDarkMode}
          toggleTheme={() => setIsDarkMode(!isDarkMode)}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
