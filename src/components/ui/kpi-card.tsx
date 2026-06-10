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
        <div className="rounded-sm border border-[#9fd3e3] bg-[#c4e7f3] p-2 text-[#064d60]">{icon}</div>
      </div>
    </>
  );

  const className = cn(
    "block rounded-sm border bg-white p-3 shadow-sm transition duration-150",
    href && "cursor-pointer hover:border-[#1291a8] hover:bg-[#f4f8fb]",
    active ? "border-[#1877f2] bg-[#e8f2ff]" : "border-[#dee2e6]",
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
