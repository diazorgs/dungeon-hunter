import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/** Native <dialog>: focus trap and Esc come from the browser. */
export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto border-2 border-steel-700 bg-ink p-8 text-steel-300 backdrop:bg-void/70"
    >
      {children}
    </dialog>
  );
}
