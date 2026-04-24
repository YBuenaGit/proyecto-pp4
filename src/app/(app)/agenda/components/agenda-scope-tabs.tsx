import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { CALENDAR_SCOPE_LABELS, type AgendaViewScope } from "@/lib/appointment-constants";
import { agendaHref, type AgendaQueryValues } from "@/lib/agenda-query";

export function AgendaScopeTabs({
  scopes,
  activeScope,
  query,
}: {
  scopes: AgendaViewScope[];
  activeScope: AgendaViewScope;
  query: AgendaQueryValues;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {scopes.map((scope) => (
        <Link
          key={scope}
          href={agendaHref(query, { scope })}
          className={cn(
            "rounded-md border px-3 py-2 text-sm font-medium transition",
            activeScope === scope
              ? "border-sky-700 bg-sky-700 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          {CALENDAR_SCOPE_LABELS[scope]}
        </Link>
      ))}
    </div>
  );
}
