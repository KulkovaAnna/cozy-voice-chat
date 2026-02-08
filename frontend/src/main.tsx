import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter, Route, Routes } from "react-router";
import { Home } from "./pages/Home/Home.tsx";
import { Login } from "./pages/Login";
import { Call } from "./pages/Call";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="call/:callId" element={<Call />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
