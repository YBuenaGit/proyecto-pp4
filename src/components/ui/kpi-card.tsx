import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";

export function KpiCard({
  label,
  value,
  icon,
  hint,
  href,
  active,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  hint?: string;
  href?: string;
  active?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <p className={cn("text-sm font-semibold", active ? "text-white" : "text-[#212529]")}>{label}</p>
          <p className={cn("mt-1 text-3xl font-semibold tracking-normal", active ? "text-white" : "text-[#212529]")}>{value}</p>
          {hint ? <p className={cn("mt-1 text-xs font-medium", active ? "text-white/85" : "text-[#212529]")}>{hint}</p> : null}
        </div>
        <div className={cn("rounded-sm border p-2", active ? "border-white/35 bg-white/15 text-white" : "border-[#9fd3e3] bg-[#c4e7f3] text-[#064d60]")}>{icon}</div>
      </div>
    </>
  );

  const className = cn(
    "block rounded-sm border bg-white p-3 shadow-sm transition duration-150",
    href && "cursor-pointer hover:border-[#1291a8] hover:bg-[#f4f8fb]",
    active ? "border-[#0667b0] bg-[#0667b0]" : "border-[#dee2e6]",
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-current={active ? "true" : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}
