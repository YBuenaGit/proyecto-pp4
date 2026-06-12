import type { ReactNode } from "react";
import type { BreadcrumbItem } from "./breadcrumbs";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  eyebrow?: string;
}) {
  return (
    <header className="mb-4">
      <div className="flex flex-col gap-3 border-b border-[#dee2e6] pb-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6c757d]">{eyebrow}</p> : null}
          <h1 className="text-2xl font-semibold tracking-normal text-[#212529] sm:text-3xl">{title}</h1>
          {description ? <p className="mt-1 max-w-4xl text-sm leading-6 text-[#6c757d]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
