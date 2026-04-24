import { Search } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
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
import { agendaHref, type AgendaQueryValues } from "@/lib/agenda-query";
import type { AgendaFilters, AgendaUserOption } from "@/lib/appointment-service";

export function AppointmentFilters({
  scopes,
  activeScope,
  monthKey,
  selectedDay,
  filters,
  users,
  lawyers,
}: {
  scopes: AgendaViewScope[];
  activeScope: AgendaViewScope;
  monthKey: string;
  selectedDay: string;
  filters: AgendaFilters;
  users: AgendaUserOption[];
  lawyers: AgendaUserOption[];
}) {
  const baseQuery: AgendaQueryValues = { scope: activeScope, month: monthKey, day: selectedDay };

  return (
    <form className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="month" value={monthKey} />
      <input type="hidden" name="day" value={selectedDay} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-8">
        <label className="block xl:col-span-2">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Buscar</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              name="q"
              className={`${inputClass} pl-9`}
              defaultValue={filters.q ?? ""}
              placeholder="Buscar cliente, expediente, abogado o tarea"
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Agenda</span>
          <select name="scope" className={inputClass} defaultValue={activeScope}>
            {scopes.map((scope) => (
              <option key={scope} value={scope}>
                {CALENDAR_SCOPE_LABELS[scope]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tipo</span>
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
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Estado</span>
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
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Abogado</span>
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
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Usuario</span>
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
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Area</span>
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
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Fecha</span>
          <input name="date" type="date" className={inputClass} defaultValue={filters.date ?? ""} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="submit">Filtrar</Button>
        <LinkButton href={agendaHref(baseQuery, { q: undefined, type: undefined, status: undefined, assignedLawyerId: undefined, assignedUserId: undefined, assignedArea: undefined, date: undefined })} variant="secondary">
          Limpiar
        </LinkButton>
      </div>
    </form>
  );
}
