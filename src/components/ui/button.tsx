import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

const variants = {
  primary: "border-[#173f63] bg-[#173f63] text-white shadow-[0_12px_24px_rgba(23,63,99,0.20)] hover:bg-[#225b80]",
  secondary: "border-[#c9d9e5] bg-white/90 text-[#2f4c63] hover:border-[#9bb8ca] hover:bg-[#f3f8fb]",
  subtle: "border-[#d7e4ee] bg-[#eaf3f8] text-[#2f4c63] hover:bg-[#dcecf4]",
  danger: "border-rose-700 bg-rose-700 text-white hover:bg-rose-800",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 max-w-full items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-center text-sm font-semibold leading-tight shadow-sm transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7aa6c2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#eef4f8]",
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
        "inline-flex min-h-10 max-w-full items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-center text-sm font-semibold leading-tight shadow-sm transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7aa6c2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#eef4f8]",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
