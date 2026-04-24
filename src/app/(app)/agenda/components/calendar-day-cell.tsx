import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { APPOINTMENT_TYPE_TONES, CALENDAR_SCOPE_LABELS, type AppointmentType } from "@/lib/appointment-constants";
import { isCalendarScope } from "@/lib/appointment-permissions";
import type { AppointmentWithRelations } from "@/lib/appointment-service";

function eventTone(type: string) {
  return APPOINTMENT_TYPE_TONES[type as AppointmentType] ?? "bg-slate-100 text-slate-700 ring-slate-200";
}

export function CalendarDayCell({
  dayNumber,
  dateKey,
  inCurrentMonth,
  selected,
  today,
  appointments,
  href,
}: {
  dayNumber: number;
  dateKey: string;
  inCurrentMonth: boolean;
  selected: boolean;
  today: boolean;
  appointments: AppointmentWithRelations[];
  href: string;
}) {
  const visibleAppointments = appointments.slice(0, 3);
  const hiddenCount = appointments.length - visibleAppointments.length;

  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-32 flex-col border-b border-r border-slate-200 bg-white p-2 transition hover:bg-slate-50",
        !inCurrentMonth && "bg-slate-50 text-slate-400",
        selected && "bg-sky-50 ring-2 ring-inset ring-sky-500",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
            today ? "bg-sky-700 text-white" : inCurrentMonth ? "text-slate-800" : "text-slate-400",
          )}
        >
          {dayNumber}
        </span>
        {appointments.length ? <span className="text-xs font-medium text-slate-500">{appointments.length}</span> : null}
      </div>
      <div className="space-y-1 overflow-hidden">
        {visibleAppointments.map((appointment) => (
          <div
            key={appointment.id}
            className={cn("truncate rounded px-2 py-1 text-xs font-medium ring-1 ring-inset", eventTone(appointment.type))}
            title={`${appointment.startTime} ${appointment.title}`}
          >
            <span className="font-semibold">{appointment.startTime}</span> {appointment.title}
            {isCalendarScope(appointment.calendarScope) ? (
              <span className="ml-1 text-[10px] uppercase text-slate-500">{CALENDAR_SCOPE_LABELS[appointment.calendarScope]}</span>
            ) : null}
          </div>
        ))}
        {hiddenCount > 0 ? <div className="px-2 text-xs font-medium text-slate-500">+{hiddenCount} mas</div> : null}
      </div>
      <span className="sr-only">{dateKey}</span>
    </Link>
  );
}
