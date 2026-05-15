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
    <section className="rounded-2xl border border-[#d7e4ee] bg-[#fbfdff]/[0.96] shadow-[0_18px_42px_rgba(26,68,104,0.08)] md:sticky md:top-24">
      <div className="flex items-start justify-between gap-3 border-b border-[#d7e4ee] bg-gradient-to-r from-[#f7fbfd] to-[#edf5f9] px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-[#172033]">Agenda del {formatDayTitle(dateKey)}</h2>
          <p className="mt-1 text-xs font-medium text-[#607589]">{appointments.length} citas para este día</p>
        </div>
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#d7e4ee] bg-white text-[#255f85]">
          <CalendarDays className="h-4 w-4" />
        </div>
      </div>
      <div className="space-y-3 p-3 md:max-h-[calc(100vh-12rem)] md:overflow-y-auto">
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
          <div className="rounded-2xl border border-dashed border-[#9bb8ca] bg-[#f3f8fb] px-4 py-10 text-center text-sm font-medium text-[#607589]">
            No hay citas para este día.
          </div>
        )}
      </div>
      {appointments.length ? (
        <div className="border-t border-[#e6eef4] px-4 py-3 text-xs font-semibold text-[#255f85]">
          Ver todas las citas del día
        </div>
      ) : null}
    </section>
  );
}
