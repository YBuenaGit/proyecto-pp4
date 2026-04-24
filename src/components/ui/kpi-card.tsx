import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
          {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <div className="rounded-md bg-sky-50 p-2 text-sky-700">{icon}</div>
      </div>
    </div>
  );
}
