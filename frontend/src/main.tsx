import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Call, Home, Login } from "@cvc/pages";

import { BrowserRouter, Route, Routes } from "react-router";
import App from "./app/App.tsx";
import "./index.css";

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
