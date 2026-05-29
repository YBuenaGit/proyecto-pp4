import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, buildCalendarDays, firstDayOfMonth, formatLongMonth } from "@/lib/agenda-dates";
import { agendaHref, type AgendaQueryValues } from "@/lib/agenda-query";
import type { AppointmentWithRelations } from "@/lib/appointment-service";
import { AppointmentTypeLegend } from "./appointment-type-legend";
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
    <section className="overflow-hidden rounded-sm border border-[#dee2e6] bg-white shadow-sm">
      <div className="grid min-h-12 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-[#dee2e6] bg-[#e9ecef] px-3 py-2">
        <Link
          href={agendaHref(query, { month: previousMonth, day: firstDayOfMonth(previousMonth) })}
          aria-label="Mes anterior"
          className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-[#6c757d] transition hover:bg-white hover:text-[#0667b0]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h2 className="text-center text-lg font-semibold capitalize tracking-normal text-[#212529]">{title}</h2>
        <div className="flex items-center justify-end gap-2">
          <Link
            href={agendaHref(query, { month: todayKey.slice(0, 7), day: todayKey })}
            className="inline-flex h-9 items-center justify-center rounded-sm border border-[#6c757d] bg-white px-3 text-xs font-semibold text-[#495057] transition hover:bg-[#e9ecef]"
          >
            Hoy
          </Link>
          <Link
            href={agendaHref(query, { month: nextMonth, day: firstDayOfMonth(nextMonth) })}
            aria-label="Mes siguiente"
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-[#6c757d] transition hover:bg-white hover:text-[#0667b0]"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="w-full">
        <div className="grid grid-cols-7 border-b border-[#dee2e6] bg-[#f8f9fa]">
          {weekDays.map((day) => (
            <div key={day} className="border-r border-[#dee2e6] px-1.5 py-2 text-center text-[11px] font-semibold text-[#6c757d] last:border-r-0 sm:px-3 sm:text-xs">
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
      <AppointmentTypeLegend />
    </section>
  );
}
