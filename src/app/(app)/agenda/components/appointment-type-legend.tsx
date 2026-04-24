import { cn } from "@/components/ui/cn";
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_TONES,
  APPOINTMENT_TYPES,
  type AppointmentType,
} from "@/lib/appointment-constants";

export function AppointmentTypeLegend() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Tipos de evento</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {APPOINTMENT_TYPES.map((type) => (
          <span
            key={type}
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
              APPOINTMENT_TYPE_TONES[type as AppointmentType],
            )}
          >
            {APPOINTMENT_TYPE_LABELS[type]}
          </span>
        ))}
      </div>
    </div>
  );
}
