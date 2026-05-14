import type { ReactNode } from "react";
import { cn } from "./cn";

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
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
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export const textareaClass =
  "min-h-24 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
