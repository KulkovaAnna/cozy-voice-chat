import { Root } from "@cvc/pages";
import {
  AuthProvider,
  ChatNetworkProvider,
  ThemeColorProvider,
} from "@cvc/providers";
import { GlobalStyles } from "@cvc/theme";

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
