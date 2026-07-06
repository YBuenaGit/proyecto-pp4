import { cn } from "@/components/ui/cn";
import {
  APPOINTMENT_TYPE_LABELS,
  type AppointmentType,
} from "@/lib/appointment-constants";

const legendTypes: AppointmentType[] = [
  "CONSULTA",
  "AUDIENCIA",
  "VENCIMIENTO",
  "REUNION",
  "TAREA_ADMINISTRATIVA",
  "OTRO",
];

const legendDots: Record<AppointmentType, string> = {
  CONSULTA: "bg-emerald-500",
  AUDIENCIA: "bg-indigo-500",
  VENCIMIENTO: "bg-orange-500",
  REUNION: "bg-sky-600",
  MEDIACION: "bg-violet-500",
  FIRMA_DOCUMENTACION: "bg-teal-500",
  LLAMADA: "bg-blue-500",
  TAREA_ADMINISTRATIVA: "bg-cyan-500",
  GESTION_DOCUMENTAL: "bg-[#f8f9fa]0",
  RECORDATORIO: "bg-amber-500",
  OTRO: "bg-zinc-400",
};

export function AppointmentTypeLegend() {
  return (
    <div className="border-t border-[#dee2e6] bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {legendTypes.map((type) => (
          <span
            key={type}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#212529]"
          >
            <span className={cn("h-2.5 w-2.5 rounded-full", legendDots[type])} />
            {APPOINTMENT_TYPE_LABELS[type]}
          </span>
        ))}
      </div>
    </div>
  );
}
