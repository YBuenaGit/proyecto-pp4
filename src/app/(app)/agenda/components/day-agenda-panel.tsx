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
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Agenda del {formatDayTitle(dateKey)}</h2>
        <p className="mt-1 text-sm text-slate-500">{appointments.length} citas para el dia seleccionado</p>
      </div>
      <div className="space-y-3 p-4">
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
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No hay citas para este dia.
          </div>
        )}
      </div>
    </section>
  );
}
