"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AppModal } from "@/components/ui/app-modal";
import { cn } from "@/components/ui/cn";

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest("a,button,input,select,textarea,label,summary,[role='button'],[data-row-action]"))
  );
}

export function LegajoInterventionRow({
  className,
  children,
  modalTitle,
  modalContent,
}: {
  className?: string;
  children?: ReactNode;
  modalTitle: string;
  modalContent: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    if (isInteractiveTarget(event.target)) return;
    setOpen(true);
  }

  return (
    <>
      <tr className={cn("cursor-pointer", className)} onClick={handleClick}>
        {children}
      </tr>
      {open
        ? createPortal(
            <AppModal title={modalTitle} size="lg" open={open} onOpenChange={setOpen}>
              {modalContent}
            </AppModal>,
            document.body,
          )
        : null}
    </>
  );
}
