import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppRouter } from "./app/AppRouter.tsx";
import { StorageNotice } from "./app/StorageNotice.tsx";
import { bus } from "./game/bridge/bus.ts";
import { LocalProfileRepository, safeLocalStorage } from "./profile/local.ts";
import { ProfileRepositoryProvider } from "./profile/ProfileRepositoryProvider.tsx";

if (import.meta.env.DEV) Object.assign(window, { __dh: { bus } });

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 } },
});
const storage = safeLocalStorage();
const repo = new LocalProfileRepository(storage);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ProfileRepositoryProvider repo={repo}>
        <AppRouter />
        <StorageNotice show={storage === null} />
      </ProfileRepositoryProvider>
    </QueryClientProvider>
  </StrictMode>,
);
