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
        className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-sm border border-[#6c757d] bg-white px-2.5 py-1 text-xs font-semibold text-[#495057] shadow-sm transition hover:bg-[#e9ecef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff]"
      >
        <Edit className="h-3.5 w-3.5" />
        Editar
      </button>
      {open
        ? createPortal(
            <AppModal title={title} size="md" open={open} onOpenChange={setOpen}>
              {children}
            </AppModal>,
            document.body,
          )
        : null}
    </>
  );
}
