import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

const variants = {
  primary: "bg-sky-700 text-white hover:bg-sky-800 border-sky-700",
  secondary: "bg-white text-slate-700 hover:bg-slate-50 border-slate-300",
  subtle: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
  danger: "bg-rose-700 text-white hover:bg-rose-800 border-rose-700",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 max-w-full items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-center text-sm font-medium leading-tight shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({
  className,
  variant = "primary",
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: keyof typeof variants;
  children: ReactNode;
}) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-10 max-w-full items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-center text-sm font-medium leading-tight shadow-sm transition",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
