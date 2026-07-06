"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Edit } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";

export function LegajoActionEditButton({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  function openModal(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        data-row-action
        onClick={openModal}
        className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-[#6c757d] bg-white text-[#495057] shadow-sm transition hover:bg-[#e9ecef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff]"
        aria-label={title}
        title={title}
      >
        <Edit className="h-3.5 w-3.5" />
      </button>
      {open
        ? createPortal(
            <AppModal
              title={title}
              size="md"
              open={open}
              onOpenChange={setOpen}
            >
              {children}
            </AppModal>,
            document.body,
          )
        : null}
    </>
  );
}
