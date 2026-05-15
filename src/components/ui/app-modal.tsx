"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

const triggerVariants = {
  primary: "border-[#173f63] bg-[#173f63] text-white shadow-[0_12px_24px_rgba(23,63,99,0.20)] hover:bg-[#225b80]",
  secondary: "border-[#c9d9e5] bg-white/90 text-[#2f4c63] hover:border-[#9bb8ca] hover:bg-[#f3f8fb]",
  subtle: "border-[#d7e4ee] bg-[#eaf3f8] text-[#2f4c63] hover:bg-[#dcecf4]",
  danger: "border-rose-700 bg-rose-700 text-white hover:bg-rose-800",
};

const modalSizes = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

export function AppModal({
  title,
  description,
  trigger,
  triggerVariant = "primary",
  triggerClassName,
  size = "lg",
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  trigger: ReactNode;
  triggerVariant?: keyof typeof triggerVariants;
  triggerClassName?: string;
  size?: keyof typeof modalSizes;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-10 max-w-full items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-center text-sm font-semibold leading-tight shadow-sm transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7aa6c2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#eef4f8]",
          triggerVariants[triggerVariant],
          triggerClassName,
        )}
      >
        {trigger}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#10283f]/50 p-0 backdrop-blur-md sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          onClick={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("[data-modal-close]")) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#d7e4ee] bg-[#fbfdff] shadow-[0_28px_80px_rgba(16,40,63,0.26)] sm:rounded-2xl",
              modalSizes[size],
            )}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#d7e4ee] bg-gradient-to-r from-[#f7fbfd] to-[#edf5f9] px-4 py-3.5 sm:px-5">
              <div>
                <h2 id={titleId} className="text-lg font-semibold tracking-[-0.01em] text-[#172033]">
                  {title}
                </h2>
                {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-[#607589]">{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-[#607589] transition duration-200 hover:bg-white hover:text-[#173f63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7aa6c2]"
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-5">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
