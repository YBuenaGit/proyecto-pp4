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
    <section className="overflow-hidden rounded-2xl border border-[#d7e4ee] bg-[#fbfdff]/[0.96] shadow-[0_18px_42px_rgba(26,68,104,0.08)]">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[#d7e4ee] bg-gradient-to-r from-[#f7fbfd] to-[#edf5f9] px-4 py-3 sm:px-5">
        <h2 className="text-base font-semibold tracking-[-0.01em] text-[#172033]">{title}</h2>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</dl>;
}

export function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-[#607589]">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-[#172033]">{value || "-"}</dd>
    </div>
  );
}
