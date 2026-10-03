import { Root } from "@cvc/pages";
import {
  AuthProvider,
  ChatNetworkProvider,
  PiPProvider,
  ThemeColorProvider,
} from "@cvc/providers";
import { GlobalStyles } from "@cvc/theme";

function App() {
  return (
    <ThemeColorProvider>
      <AuthProvider>
        <ChatNetworkProvider>
          <PiPProvider>
            <GlobalStyles />
            <Root />
          </PiPProvider>
        </ChatNetworkProvider>
      </AuthProvider>
    </ThemeColorProvider>
  );
}

export default App;
