"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

const triggerVariants = {
  primary: "border-sky-700 bg-sky-700 text-white hover:bg-sky-800",
  secondary: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  subtle: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
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
          "inline-flex min-h-10 max-w-full items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-center text-sm font-medium leading-tight shadow-sm transition",
          triggerVariants[triggerVariant],
          triggerClassName,
        )}
      >
        {trigger}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-1.5 backdrop-blur-sm sm:p-3"
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
              "flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl",
              modalSizes[size],
            )}
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-3 py-2.5 sm:px-4">
              <div>
                <h2 id={titleId} className="text-base font-semibold text-slate-950">
                  {title}
                </h2>
                {description ? <p className="mt-0.5 text-sm leading-6 text-slate-600">{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-2.5 sm:p-3">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
