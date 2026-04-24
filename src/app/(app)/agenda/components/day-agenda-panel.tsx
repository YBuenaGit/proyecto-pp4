import { CalendarDays } from "lucide-react";
import { formatDayTitle } from "@/lib/agenda-dates";
import type { CalendarScope } from "@/lib/appointment-constants";
import type { AgendaUserOption, AppointmentWithRelations } from "@/lib/appointment-service";
import type { CurrentUser } from "@/lib/types";
import { AppointmentCard } from "./appointment-card";

export function DayAgendaPanel({
  dateKey,
  appointments,
  user,
  allowedScopes,
  users,
  lawyers,
}: {
  dateKey: string;
  appointments: AppointmentWithRelations[];
  user: CurrentUser;
  allowedScopes: CalendarScope[];
  users: AgendaUserOption[];
  lawyers: AgendaUserOption[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm md:sticky md:top-20">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-[#14213d]">Agenda del {formatDayTitle(dateKey)}</h2>
          <p className="mt-1 text-xs font-medium text-slate-600">{appointments.length} citas para este día</p>
        </div>
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500">
          <CalendarDays className="h-4 w-4" />
        </div>
      </div>
      <div className="space-y-2 p-3 md:max-h-[calc(100vh-12rem)] md:overflow-y-auto">
        {appointments.length ? (
          appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              user={user}
              allowedScopes={allowedScopes}
              users={users}
              lawyers={lawyers}
            />
          ))
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No hay citas para este día.
          </div>
        )}
      </div>
      {appointments.length ? (
        <div className="border-t border-slate-100 px-4 py-3 text-xs font-semibold text-[#0b4f9c]">
          Ver todas las citas del día
        </div>
      ) : null}
    </section>
  );
}
