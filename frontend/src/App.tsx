import { GlobalStyles } from "./theme/GlobalStyles";
import { Root } from "./pages/Root";
import { AuthProvider } from "./providers/AuthProvider";
import { ChatNetworkProvider } from "./providers/ChatNetworkProvider";
import { ThemeColorProvider } from "./providers/ThemeColorProvider";

function App() {
  return (
    <ThemeColorProvider>
      <AuthProvider>
        <ChatNetworkProvider>
          <GlobalStyles />
          <Root />
        </ChatNetworkProvider>
      </AuthProvider>
    </ThemeColorProvider>
  );
}

export default App;
