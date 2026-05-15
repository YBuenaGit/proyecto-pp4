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
          <p className="text-sm font-semibold text-[#607589]">{label}</p>
          <p className="mt-1 text-4xl font-semibold tracking-[-0.04em] text-[#172033]">{value}</p>
          {hint ? <p className="mt-1 text-xs font-medium text-[#6a7f91]">{hint}</p> : null}
        </div>
        <div className="rounded-xl bg-[#e4f0f7] p-2 text-[#255f85]">{icon}</div>
      </div>
    </>
  );

  const className = cn(
    "block rounded-2xl border bg-[#fbfdff]/[0.96] p-4 shadow-[0_16px_38px_rgba(26,68,104,0.08)] transition duration-200",
    href && "cursor-pointer hover:-translate-y-1 hover:border-[#9bb8ca] hover:shadow-[0_22px_46px_rgba(26,68,104,0.13)]",
    active ? "border-[#255f85] bg-[#eaf3f8] ring-1 ring-[#c7dcea]" : "border-[#d7e4ee]",
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
