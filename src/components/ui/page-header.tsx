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
    <div className="mb-5 flex flex-col gap-3 border-b border-[#d7e4ee] pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-[#255f85]">
          Secretaria de Seguridad
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-[#172033] sm:text-[2.35rem] sm:leading-[1.1]">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[#607589]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
