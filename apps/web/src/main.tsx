import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./app/App.tsx";
import { detectAuthMode } from "./app/repos.ts";
import { bus } from "./game/bridge/bus.ts";
import { useSessionStore } from "./stores/session.ts";

if (import.meta.env.DEV) Object.assign(window, { __dh: { bus } });

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 } },
});

useSessionStore.setState({ authMode: await detectAuthMode() });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
