import { useState } from "react";
import { Modal } from "../ui/components/Modal.tsx";
import { PixelButton } from "../ui/components/PixelButton.tsx";

/** One-time notice when the browser blocks localStorage. */
export function StorageNotice({ show }: { show: boolean }) {
  const [open, setOpen] = useState(show);
  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <p className="mb-8 max-w-[480px] text-base">
        Your browser blocks site storage, so progress lasts only until you close this tab.
      </p>
      <PixelButton autoFocus onClick={() => setOpen(false)}>
        OK
      </PixelButton>
    </Modal>
  );
}
