import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

const variants = {
  primary: "border-[#0667b0] bg-[#0667b0] text-white hover:border-[#0a61b9] hover:bg-[#0a61b9]",
  secondary: "border-[#6c757d] bg-white text-[#495057] hover:bg-[#e5edf5]",
  subtle: "border-[#9fd3e3] bg-[#c4e7f3] text-[#064d60] hover:bg-[#aee0ee]",
  info: "border-[#1291a8] bg-[#1291a8] text-white hover:border-[#0f7d91] hover:bg-[#0f7d91]",
  success: "border-[#28a745] bg-[#28a745] text-white hover:border-[#218838] hover:bg-[#218838]",
  danger: "border-[#dc3545] bg-[#dc3545] text-white hover:border-[#c82333] hover:bg-[#c82333]",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-9 max-w-full items-center justify-center gap-1.5 rounded-sm border px-3 py-1.5 text-center text-sm font-semibold leading-tight shadow-sm transition duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
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
        "inline-flex min-h-9 max-w-full items-center justify-center gap-1.5 rounded-sm border px-3 py-1.5 text-center text-sm font-semibold leading-tight shadow-sm transition duration-150 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
