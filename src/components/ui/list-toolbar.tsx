import type { ReactNode } from "react";

export function ListToolbar({
  actions,
  children,
}: {
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-full">{children}</div>
        {actions ? <div className="flex flex-wrap items-center justify-end gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
