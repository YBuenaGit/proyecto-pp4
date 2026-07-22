"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "./cn";

const triggerVariants = {
  primary: "border-[#0667b0] bg-[#0667b0] text-white hover:border-[#0a61b9] hover:bg-[#0a61b9]",
  secondary: "border-[#6c757d] bg-white text-[#495057] hover:bg-[#e9ecef]",
  subtle: "border-[#bee5eb] bg-[#d1ecf1] text-[#0c5460] hover:bg-[#bee5eb]",
  info: "border-[#17a2b8] bg-[#17a2b8] text-white hover:border-[#138496] hover:bg-[#138496]",
  success: "border-[#28a745] bg-[#28a745] text-white hover:border-[#218838] hover:bg-[#218838]",
  danger: "border-[#dc3545] bg-[#dc3545] text-white hover:border-[#c82333] hover:bg-[#c82333]",
};

const modalSizes = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

type ModalRenderProps = {
  close: () => void;
};

type ModalChildren = ReactNode | ((props: ModalRenderProps) => ReactNode);

export function AppModal({
  title,
  description,
  trigger,
  triggerVariant = "primary",
  triggerClassName,
  size = "lg",
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  title: string;
  description?: string;
  trigger?: ReactNode;
  triggerVariant?: keyof typeof triggerVariants;
  triggerClassName?: string;
  size?: keyof typeof modalSizes;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ModalChildren;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (value: boolean) => {
      if (!isControlled) setInternalOpen(value);
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange],
  );
  const titleId = useId();
  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [close, open]);

  const modal =
    open ? (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        role="presentation"
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("[data-modal-close]")) close();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            "flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-sm border border-[#dee2e6] bg-white shadow-xl sm:rounded-sm",
            modalSizes[size],
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[#dee2e6] bg-[#e9ecef] px-3 py-2.5 sm:px-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold tracking-normal text-[#212529]">
                {title}
              </h2>
              {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-[#212529]">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-sm p-2 text-[#212529] transition duration-150 hover:bg-white hover:text-[#212529] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff]"
              aria-label="Cerrar modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-3 sm:p-4">{typeof children === "function" ? children({ close }) : children}</div>
        </div>
      </div>
    ) : null;

  return (
    <>
      {trigger !== undefined ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex min-h-9 max-w-full items-center justify-center gap-1.5 rounded-sm border px-3 py-1.5 text-center text-sm font-semibold leading-tight shadow-sm transition duration-150 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
            triggerVariants[triggerVariant],
            triggerClassName,
          )}
        >
          {trigger}
        </button>
      ) : null}

      {modal && typeof document !== "undefined" ? createPortal(modal, document.body) : null}
    </>
  );
}
