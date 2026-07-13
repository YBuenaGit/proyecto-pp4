import Link from "next/link";
import { cn } from "@/components/ui/cn";
import type { AppointmentType } from "@/lib/appointment-constants";
import type { AppointmentWithRelations } from "@/lib/appointment-service";

const eventDots: Record<AppointmentType, string> = {
  AUDIENCIA: "bg-indigo-500",
  CAPACITACION: "bg-fuchsia-500",
  CONSULTA: "bg-emerald-500",
  CUMPLEANOS: "bg-pink-500",
  DIAS_FESTIVOS: "bg-red-500",
  EVENTOS_MUNI: "bg-lime-600",
  FIRMA_DOCUMENTACION: "bg-teal-500",
  GESTION_DOCUMENTAL: "bg-slate-500",
  LLAMADA: "bg-blue-500",
  MEDIACION: "bg-violet-500",
  MUNI_EN_TU_BARRIO: "bg-green-600",
  RECORDATORIO: "bg-amber-500",
  REUNION: "bg-sky-600",
  TAREA_ADMINISTRATIVA: "bg-cyan-500",
  VENCIMIENTO: "bg-orange-500",
  OTRO: "bg-zinc-400",
};

function eventDot(type: string) {
  return eventDots[type as AppointmentType] ?? "bg-[#adb5bd]";
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
        "flex min-h-16 min-w-0 flex-col items-center justify-start border-b border-r border-[#e6eef4] bg-white/[0.86] p-1.5 text-center transition duration-200 hover:bg-[#f4f9fc] sm:min-h-[4.6rem] sm:p-2",
        !inCurrentMonth && "bg-[#f3f8fb]/60 text-[#8da2b3]",
        selected && "bg-[#e4f0f7]",
      )}
    >
      <div className="flex justify-center">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
            selected || today
              ? "bg-[#0667b0] text-white"
              : inCurrentMonth
                ? "text-[#212529]"
                : "text-[#8da2b3]",
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
        {hiddenCount > 0 ? <span className="text-[10px] font-semibold leading-none text-[#607589]">+{hiddenCount}</span> : null}
      </div>
      <span className="sr-only">{dateKey}</span>
    </Link>
  );
}
