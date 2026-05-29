import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  eyebrow = "Sistema interno",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  eyebrow?: string;
}) {
  return (
    <header className="mb-4">
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-3 border-b border-[#dee2e6] pb-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6c757d]">{eyebrow}</p>
          <h1 className="text-2xl font-semibold tracking-normal text-[#212529] sm:text-3xl">{title}</h1>
          {description ? <p className="mt-1 max-w-4xl text-sm leading-6 text-[#6c757d]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
