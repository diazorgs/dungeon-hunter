import { Component } from "react";
import type { ReactNode } from "react";
import { useSessionStore } from "../stores/session.ts";
import { Stage } from "../ui/components/Stage.tsx";
import { CrashScreen } from "../ui/screens/CrashScreen.tsx";

/** A render error in any screen falls back to the crash screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error) {
    useSessionStore.setState({ crashMessage: error.message, runConfig: null });
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Stage>
        <CrashScreen
          onReturn={() => {
            useSessionStore.getState().goTo("staging");
            this.setState({ failed: false });
          }}
        />
      </Stage>
    );
  }
}
