/**
 * While a run is mounted, an uncaught error ends it on a crash screen instead of a frozen canvas.
 * DOMException rejections (audio unlock, media) are browser noise, not game crashes.
 */
export function installCrashHandler(onCrash: (message: string) => void): () => void {
  let crashed = false;
  const crash = (reason: unknown) => {
    if (crashed) return;
    crashed = true;
    onCrash(reason instanceof Error ? reason.message : String(reason));
  };
  const onError = (e: ErrorEvent) => crash(e.error ?? e.message);
  const onRejection = (e: PromiseRejectionEvent) => {
    if (!(e.reason instanceof DOMException)) crash(e.reason);
  };
  addEventListener("error", onError);
  addEventListener("unhandledrejection", onRejection);
  return () => {
    removeEventListener("error", onError);
    removeEventListener("unhandledrejection", onRejection);
  };
}
