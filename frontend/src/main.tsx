import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter, Route, Routes } from "react-router";
import { Home } from "./pages/Home/Home.tsx";
import { Login } from "./pages/Login";
import { Room } from "./pages/Room";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="call/:roomId" element={<Room />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
