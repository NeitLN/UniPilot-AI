"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { backdropVariants, modalPanelVariants } from "@/lib/motion/variants";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** "md" (default) fits every other form here; "lg" gives extra width to
   * forms with side-by-side datetime inputs (e.g. EventForm), which clip
   * their "AM/PM" text at max-w-md. */
  size?: "md" | "lg";
}

const SIZE_CLASSES: Record<"md" | "lg", string> = {
  md: "max-w-md",
  lg: "max-w-xl",
};

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    // Move focus into the dialog so keyboard/AT users land inside it.
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key={title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={onClose}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={backdropVariants}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            variants={modalPanelVariants}
            /* Capped + scrollable: the panel already carried
               `overscroll-contain` (which only does anything on a scroll
               container) but had no max-height, so a tall form — New
               assignment is ~900px — was centred and clipped at BOTH ends
               on any viewport shorter than itself, putting the submit
               button out of reach. 100vh is divided by --app-zoom because
               viewport units ignore the zoom on <body>; the 2rem subtracts
               the overlay's own p-4 gutter. */
            className={`max-h-[calc(100vh/var(--app-zoom)-2rem)] w-full ${SIZE_CLASSES[size]} overflow-y-auto overscroll-contain rounded-card bg-card p-6 outline-none`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
