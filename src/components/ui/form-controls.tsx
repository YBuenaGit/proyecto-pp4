import type { ReactNode } from "react";
import { cn } from "./cn";

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
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
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#607589]">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-lg border border-[#c9d9e5] bg-white/95 px-3 text-sm text-[#172033] shadow-[inset_0_1px_0_rgba(255,255,255,0.70)] outline-none transition duration-200 placeholder:text-[#8da2b3] hover:border-[#9bb8ca] focus:border-[#255f85] focus:ring-[3px] focus:ring-[#c7dcea]";

export const textareaClass =
  "min-h-28 w-full rounded-lg border border-[#c9d9e5] bg-white/95 px-3 py-2 text-sm leading-6 text-[#172033] shadow-[inset_0_1px_0_rgba(255,255,255,0.70)] outline-none transition duration-200 placeholder:text-[#8da2b3] hover:border-[#9bb8ca] focus:border-[#255f85] focus:ring-[3px] focus:ring-[#c7dcea]";
