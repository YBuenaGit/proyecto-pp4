import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { addMonths, buildCalendarDays, firstDayOfMonth, formatLongMonth } from "@/lib/agenda-dates";
import { agendaHref, type AgendaQueryValues } from "@/lib/agenda-query";
import type { AppointmentWithRelations } from "@/lib/appointment-service";
import { CalendarDayCell } from "./calendar-day-cell";

const weekDays = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

export function CalendarMonthView({
  monthKey,
  selectedDay,
  todayKey,
  appointments,
  query,
}: {
  monthKey: string;
  selectedDay: string;
  todayKey: string;
  appointments: AppointmentWithRelations[];
  query: AgendaQueryValues;
}) {
  const days = buildCalendarDays(monthKey);
  const appointmentsByDate = appointments.reduce<Record<string, AppointmentWithRelations[]>>((acc, appointment) => {
    acc[appointment.date] = [...(acc[appointment.date] ?? []), appointment];
    return acc;
  }, {});
  const title = formatLongMonth(monthKey);
  const previousMonth = addMonths(monthKey, -1);
  const nextMonth = addMonths(monthKey, 1);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold capitalize text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{appointments.length} citas visibles</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={agendaHref(query, { month: todayKey.slice(0, 7), day: todayKey })} variant="secondary">
            <CalendarDays className="h-4 w-4" />
            Hoy
          </LinkButton>
          <LinkButton href={agendaHref(query, { month: previousMonth, day: firstDayOfMonth(previousMonth) })} variant="secondary">
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </LinkButton>
          <LinkButton href={agendaHref(query, { month: nextMonth, day: firstDayOfMonth(nextMonth) })} variant="secondary">
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </LinkButton>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {weekDays.map((day) => (
              <div key={day} className="border-r border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => (
              <CalendarDayCell
                key={day.dateKey}
                dateKey={day.dateKey}
                dayNumber={day.dayNumber}
                inCurrentMonth={day.inCurrentMonth}
                selected={day.dateKey === selectedDay}
                today={day.dateKey === todayKey}
                appointments={appointmentsByDate[day.dateKey] ?? []}
                href={agendaHref(query, { day: day.dateKey, month: day.dateKey.slice(0, 7) })}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
