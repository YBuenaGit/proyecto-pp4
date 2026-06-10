import { Search } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button, LinkButton } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { inputClass } from "@/components/ui/form-controls";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPES,
  ASSIGNED_AREA_LABELS,
  ASSIGNED_AREAS,
  CALENDAR_SCOPE_LABELS,
  type AgendaViewScope,
} from "@/lib/appointment-constants";
import { agendaHref } from "@/lib/agenda-query";
import type { AgendaFilters, AgendaUserOption } from "@/lib/appointment-service";

export function AppointmentFilters({
  scopes,
  activeScope,
  monthKey,
  selectedDay,
  todayKey,
  filters,
  users,
  lawyers,
  className,
}: {
  scopes: AgendaViewScope[];
  activeScope: AgendaViewScope;
  monthKey: string;
  selectedDay: string;
  todayKey: string;
  filters: AgendaFilters;
  users: AgendaUserOption[];
  lawyers: AgendaUserOption[];
  className?: string;
}) {
  const resetHref = agendaHref({ scope: activeScope }, {
    month: todayKey.slice(0, 7),
    day: todayKey,
    q: undefined,
    type: undefined,
    status: undefined,
    assignedLawyerId: undefined,
    assignedUserId: undefined,
    assignedArea: undefined,
    date: undefined,
  });

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <AppModal
        title="Filtrar agenda"
        description="Busca y filtra las citas respetando la agenda seleccionada."
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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="block md:col-span-2 xl:col-span-3">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#6c757d]">Buscar</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#adb5bd]" />
                  <input
                    name="q"
                    className={`${inputClass} pl-9`}
                    defaultValue={filters.q ?? ""}
                    placeholder="Buscar cliente, expediente, abogado o tarea"
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#6c757d]">Agenda</span>
                <select name="scope" className={inputClass} defaultValue={activeScope}>
                  {scopes.map((scope) => (
                    <option key={scope} value={scope}>
                      {CALENDAR_SCOPE_LABELS[scope]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#6c757d]">Tipo</span>
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
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#6c757d]">Estado</span>
                <select name="status" className={inputClass} defaultValue={filters.status ?? ""}>
                  <option value="">Todos</option>
                  {APPOINTMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {APPOINTMENT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#6c757d]">Abogado</span>
                <select name="assignedLawyerId" className={inputClass} defaultValue={filters.assignedLawyerId ?? ""}>
                  <option value="">Todos</option>
                  {lawyers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#6c757d]">Usuario</span>
                <select name="assignedUserId" className={inputClass} defaultValue={filters.assignedUserId ?? ""}>
                  <option value="">Todos</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#6c757d]">Area</span>
                <select name="assignedArea" className={inputClass} defaultValue={filters.assignedArea ?? ""}>
                  <option value="">Todas</option>
                  {ASSIGNED_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {ASSIGNED_AREA_LABELS[area]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#6c757d]">Fecha</span>
                <input name="date" type="date" className={inputClass} defaultValue={filters.date ?? ""} />
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
      <LinkButton href={resetHref} variant="secondary" className="bg-white shadow-none">
        Limpiar
      </LinkButton>
    </div>
  );
}
