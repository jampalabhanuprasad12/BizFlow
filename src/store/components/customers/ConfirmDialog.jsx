import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal.jsx";
import { Button } from "../ui/index.js";

const ICON_TONES = {
  danger: "bg-red-50 text-red-600",
  primary: "bg-blue-50 text-blue-600",
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  tone = "danger",
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel} size="sm">
      <div className="flex items-start gap-4">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ICON_TONES[tone] ?? ICON_TONES.danger}`}
        >
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="pt-2 text-sm text-slate-600">{message}</p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
