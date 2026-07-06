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
    <section className="overflow-hidden rounded-sm border border-[#dee2e6] bg-white shadow-sm">
      <div className="flex min-h-10 items-center justify-between gap-3 border-b border-[#c7d2de] bg-[#a1bbcf] px-3 py-2">
        <h2 className="text-base font-semibold tracking-normal text-[#263544]">{title}</h2>
        {action}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">{children}</dl>;
}

export function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-[#212529]">{label}</dt>
      <dd className="mt-0.5 text-sm leading-6 text-[#212529]">{value || "-"}</dd>
    </div>
  );
}
