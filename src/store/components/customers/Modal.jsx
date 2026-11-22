import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({ open, title, description, onClose, children, size = "md" }) {
  const titleId = useId();
  const [entered, setEntered] = useState(false);

  // Escape key closes the modal; the page behind it stops scrolling while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  // Start hidden, then flip to visible on the next frame so the fade/scale transition runs.
  useEffect(() => {
    if (!open) {
      setEntered(false);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  const handleOverlayMouseDown = (event) => {
    if (event.target === event.currentTarget) onClose?.();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-navy-900/40 p-4 backdrop-blur-sm transition-opacity duration-200 sm:items-center ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`w-full ${SIZES[size] ?? SIZES.md} max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl transition-all duration-200 sm:p-6 ${
          entered ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="text-lg font-semibold text-navy-900">
                {title}
              </h2>
            )}
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-smooth hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
