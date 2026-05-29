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
    <div className="inline-flex max-w-full flex-wrap gap-2">
      {scopes.map((scope) => (
        <Link
          key={scope}
          href={agendaHref(query, { scope })}
          className={cn(
            "inline-flex h-9 items-center rounded-md border px-4 text-xs font-semibold transition",
            activeScope === scope
              ? "border-[#0b2a55] bg-[#0b2a55] text-white shadow-sm"
              : "border-[#dee2e6] bg-white text-[#14213d] hover:bg-[#f8f9fa]",
          )}
        >
          {CALENDAR_SCOPE_LABELS[scope]}
        </Link>
      ))}
    </div>
  );
}
