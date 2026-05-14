import type { ReactNode } from "react";

export function DetailSection({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-10 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 sm:px-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">{children}</dl>;
}

export function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm leading-6 text-slate-900">{value || "-"}</dd>
    </div>
  );
}
