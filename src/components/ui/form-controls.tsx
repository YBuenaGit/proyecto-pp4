import type { ReactNode } from "react";
import { cn } from "./cn";

export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-3", className)}>{children}</div>;
}

export function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-semibold text-[#495057]">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-9 w-full rounded-sm border border-[#ced4da] bg-white px-2.5 text-sm text-[#212529] outline-none transition duration-150 placeholder:text-[#6c757d] focus:border-[#80bdff] focus:ring-2 focus:ring-[rgba(0,123,255,.25)]";

export const textareaClass =
  "min-h-28 w-full rounded-sm border border-[#ced4da] bg-white px-2.5 py-2 text-sm leading-6 text-[#212529] outline-none transition duration-150 placeholder:text-[#6c757d] focus:border-[#80bdff] focus:ring-2 focus:ring-[rgba(0,123,255,.25)]";
