import { Search } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button, LinkButton } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { inputClass } from "@/components/ui/form-controls";
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPES,
  CALENDAR_SCOPE_LABELS,
  type AgendaViewScope,
} from "@/lib/appointment-constants";
import type { AgendaFilters } from "@/lib/appointment-service";
import { sortByLabel } from "@/lib/text";

export function AppointmentFilters({
  scopes,
  activeScope,
  monthKey,
  selectedDay,
  filters,
  resetHref,
  className,
}: {
  scopes: AgendaViewScope[];
  activeScope: AgendaViewScope;
  monthKey: string;
  selectedDay: string;
  filters: AgendaFilters;
  resetHref: string;
  className?: string;
}) {
  const sortedScopes = sortByLabel(scopes, (scope) => CALENDAR_SCOPE_LABELS[scope]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <AppModal
        title="Filtrar agenda"
        description="Filtra las citas respetando la agenda seleccionada."
        trigger={(
          <>
            <Search className="h-4 w-4" />
            Buscar
          </>
        )}
        triggerVariant="success"
        triggerClassName="shadow-sm"
        size="xl"
      >
        <form className="space-y-4">
            <input type="hidden" name="month" value={monthKey} />
            <input type="hidden" name="day" value={selectedDay} />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#212529]">Agenda</span>
                <select name="scope" className={inputClass} defaultValue={activeScope}>
                  {sortedScopes.map((scope) => (
                    <option key={scope} value={scope}>
                      {CALENDAR_SCOPE_LABELS[scope]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#212529]">Tipo</span>
                <select name="type" className={inputClass} defaultValue={filters.type ?? ""}>
                  <option value="">Todos</option>
                  {APPOINTMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {APPOINTMENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#212529]">Fecha desde</span>
                <input name="dateFrom" type="date" className={inputClass} defaultValue={filters.dateFrom ?? ""} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#212529]">Fecha hasta</span>
                <input name="dateTo" type="date" className={inputClass} defaultValue={filters.dateTo ?? ""} />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#dee2e6] pt-4">
              <Button type="button" variant="secondary" data-modal-close>
                Cancelar
              </Button>
              <LinkButton href={resetHref} variant="secondary">
                Limpiar
              </LinkButton>
              <Button type="submit">Aplicar filtros</Button>
            </div>
        </form>
      </AppModal>
    </div>
  );
}
