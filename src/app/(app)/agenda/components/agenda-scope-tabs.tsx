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
              ? "border-[#3b64bb] bg-[#4d4fce] text-white shadow-sm"
              : "border-[#c7d2de] bg-white text-[#14213d] hover:bg-[#e8f2ff]",
          )}
        >
          {CALENDAR_SCOPE_LABELS[scope]}
        </Link>
      ))}
    </div>
  );
}
