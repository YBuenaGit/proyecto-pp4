import { CalendarDays } from "lucide-react";
import { formatDayTitle } from "@/lib/agenda-dates";
import type { CalendarScope } from "@/lib/appointment-constants";
import type { AppointmentWithRelations } from "@/lib/appointment-service";
import type { CurrentUser } from "@/lib/types";
import { AppointmentCard } from "./appointment-card";

export function DayAgendaPanel({
  dateKey,
  appointments,
  user,
  allowedScopes,
}: {
  dateKey: string;
  appointments: AppointmentWithRelations[];
  user: CurrentUser;
  allowedScopes: CalendarScope[];
}) {
  return (
    <section className="rounded-sm border border-[#dee2e6] bg-white shadow-sm md:sticky md:top-20">
      <div className="flex items-start justify-between gap-3 border-b border-[#dee2e6] bg-[#e9ecef] px-3 py-2.5">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-[#212529]">Agenda del {formatDayTitle(dateKey)}</h2>
          <p className="mt-1 text-xs font-medium text-[#6c757d]">{appointments.length} citas para este día</p>
        </div>
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-[#dee2e6] bg-white text-[#0667b0]">
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
            />
          ))
        ) : (
          <div className="rounded-sm border border-dashed border-[#17a2b8] bg-[#d1ecf1]/40 px-4 py-10 text-center text-sm font-medium text-[#6c757d]">
            No hay citas para este día.
          </div>
        )}
      </div>
      {appointments.length ? (
        <div className="border-t border-[#dee2e6] px-4 py-3 text-xs font-semibold text-[#0667b0]">
          Ver todas las citas del día
        </div>
      ) : null}
    </section>
  );
}
