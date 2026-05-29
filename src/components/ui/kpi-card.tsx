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
          <p className="text-sm font-semibold text-[#6c757d]">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-normal text-[#212529]">{value}</p>
          {hint ? <p className="mt-1 text-xs font-medium text-[#6c757d]">{hint}</p> : null}
        </div>
        <div className="rounded-sm border border-[#bee5eb] bg-[#d1ecf1] p-2 text-[#0c5460]">{icon}</div>
      </div>
    </>
  );

  const className = cn(
    "block rounded-sm border bg-white p-3 shadow-sm transition duration-150",
    href && "cursor-pointer hover:border-[#17a2b8] hover:bg-[#f8f9fa]",
    active ? "border-[#0667b0] bg-[#d1ecf1]" : "border-[#dee2e6]",
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
