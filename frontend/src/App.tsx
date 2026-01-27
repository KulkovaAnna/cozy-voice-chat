import { ThemeProvider } from "@emotion/react";
import { lightTheme, darkTheme } from "./theme";
import { GlobalStyles } from "./theme/GlobalStyles";
import { Root } from "./pages/Root";
import { AuthProvider } from "./providers/AuthProvider";
import useLocalStorage from "./hooks/useLocalStorage";

function App() {
  const [isDarkMode, setIsDarkMode] = useLocalStorage("dark", "");
  const currentTheme = isDarkMode ? darkTheme : lightTheme;
  const themeWithName = {
    ...currentTheme,
    name: isDarkMode ? "dark" : "light",
  };

  return (
    <ThemeProvider theme={themeWithName}>
      <AuthProvider>
        <GlobalStyles />
        <Root
          isDarkMode={!!isDarkMode}
          toggleTheme={() => setIsDarkMode((prev) => (prev ? "" : "true"))}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
