import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppRouter } from "./app/AppRouter.tsx";
import { bus } from "./game/bridge/bus.ts";

if (import.meta.env.DEV) Object.assign(window, { __dh: { bus } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
