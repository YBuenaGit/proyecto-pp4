import Link from "next/link";
import { cn } from "@/components/ui/cn";
import type { AppointmentType } from "@/lib/appointment-constants";
import type { AppointmentWithRelations } from "@/lib/appointment-service";

const eventDots: Record<AppointmentType, string> = {
  CONSULTA: "bg-emerald-500",
  AUDIENCIA: "bg-indigo-500",
  VENCIMIENTO: "bg-orange-500",
  REUNION: "bg-sky-600",
  MEDIACION: "bg-violet-500",
  FIRMA_DOCUMENTACION: "bg-teal-500",
  LLAMADA: "bg-blue-500",
  TAREA_ADMINISTRATIVA: "bg-cyan-500",
  GESTION_DOCUMENTAL: "bg-slate-500",
  RECORDATORIO: "bg-amber-500",
  OTRO: "bg-zinc-400",
};

function eventDot(type: string) {
  return eventDots[type as AppointmentType] ?? "bg-slate-400";
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
        "flex min-h-16 min-w-0 flex-col items-center justify-start border-b border-r border-slate-100 bg-white p-1.5 text-center transition hover:bg-slate-50 sm:min-h-[4.6rem] sm:p-2",
        !inCurrentMonth && "bg-slate-50/60 text-slate-400",
        selected && "bg-sky-50",
      )}
    >
      <div className="flex justify-center">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
            selected || today
              ? "bg-[#0b2a55] text-white"
              : inCurrentMonth
                ? "text-[#14213d]"
                : "text-slate-400",
          )}
        >
          {dayNumber}
        </span>
      </div>
      <div className="mt-2 flex min-h-3 max-w-full flex-wrap justify-center gap-1 overflow-hidden">
        {visibleAppointments.map((appointment) => (
          <span
            key={appointment.id}
            className={cn("h-1.5 w-1.5 rounded-full", eventDot(appointment.type))}
            title={`${appointment.startTime} ${appointment.title}`}
          />
        ))}
        {hiddenCount > 0 ? <span className="text-[10px] font-semibold leading-none text-slate-500">+{hiddenCount}</span> : null}
      </div>
      <span className="sr-only">{dateKey}</span>
    </Link>
  );
}
