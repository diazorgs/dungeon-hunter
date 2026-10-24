import { ProfileRepositoryProvider } from "../profile/ProfileRepositoryProvider.tsx";
import { useSessionStore } from "../stores/session.ts";
import { AppRouter } from "./AppRouter.tsx";
import { accountRepo, localRepo, storage } from "./repos.ts";
import { StorageNotice } from "./StorageNotice.tsx";

/** Guests use localStorage, accounts the API; screens never know which. */
export function App() {
  const mode = useSessionStore((s) => s.authMode);
  return (
    <ProfileRepositoryProvider repo={mode === "account" ? accountRepo : localRepo}>
      <AppRouter />
      <StorageNotice show={storage === null} />
    </ProfileRepositoryProvider>
  );
}
