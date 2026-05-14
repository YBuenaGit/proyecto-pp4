import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2.5 border-b border-slate-200 pb-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-sky-700">
          Secretaria de Seguridad
        </p>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}
