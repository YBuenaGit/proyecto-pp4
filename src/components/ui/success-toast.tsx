"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "./cn";

export function SuccessToast({
  message = "Se derivo correctamente.",
  placement = "corner",
  clearQueryParam = "derivacion",
}: {
  message?: string;
  placement?: "corner" | "center";
  clearQueryParam?: string | null;
}) {
  const [visible, setVisible] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hideTimer = window.setTimeout(() => setVisible(false), 4200);
    const cleanTimer = window.setTimeout(() => {
      if (!clearQueryParam) return;
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete(clearQueryParam);
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, 4600);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(cleanTimer);
    };
  }, [clearQueryParam, pathname, router, searchParams]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed z-[70] flex max-w-[calc(100vw-1.5rem)] items-start gap-2 border border-[#1f7a34] bg-[#28a745] px-3 py-2.5 text-sm font-semibold text-white shadow-lg",
        placement === "center"
          ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl px-4 py-3 text-center"
          : "right-3 top-3 rounded-sm sm:right-5 sm:top-5",
      )}
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="leading-5">{message}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="ml-1 rounded-sm p-0.5 text-white/85 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        aria-label="Cerrar aviso"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
