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
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-slate-950">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <div className="rounded-md bg-sky-50 p-1.5 text-sky-700">{icon}</div>
      </div>
    </>
  );

  const className = cn(
    "block rounded-lg border bg-white p-3.5 shadow-sm transition",
    href && "cursor-pointer hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md",
    active ? "border-sky-500 bg-sky-50/60 shadow-md ring-1 ring-sky-100" : "border-slate-200",
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
