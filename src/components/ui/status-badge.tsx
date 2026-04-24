import { cn } from "./cn";
import { labelFromValue } from "@/lib/format";

const toneByStatus: Record<string, string> = {
  RECIBIDO: "bg-slate-100 text-slate-700 ring-slate-200",
  EN_ANALISIS: "bg-sky-50 text-sky-800 ring-sky-200",
  DERIVADO: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  EN_GESTION: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  RESUELTO: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CERRADO: "bg-slate-200 text-slate-800 ring-slate-300",
  ARCHIVADO: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  EN_ORIENTACION: "bg-sky-50 text-sky-800 ring-sky-200",
  PENDIENTE_DOCUMENTACION: "bg-amber-50 text-amber-800 ring-amber-200",
  DERIVADO_EXTERNAMENTE: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  EN_SEGUIMIENTO: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  CONCLUIDO: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  INICIADO: "bg-slate-100 text-slate-700 ring-slate-200",
  EN_TRAMITE: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  OBSERVADO: "bg-amber-50 text-amber-800 ring-amber-200",
  EN_APROBACION: "bg-sky-50 text-sky-800 ring-sky-200",
  APROBADO: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  FINALIZADO: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  URGENTE: "bg-rose-50 text-rose-800 ring-rose-200",
  ALTA: "bg-orange-50 text-orange-800 ring-orange-200",
  MEDIA: "bg-sky-50 text-sky-800 ring-sky-200",
  BAJA: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function StatusBadge({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return <span className="text-slate-400">-</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        toneByStatus[value] ?? "bg-slate-100 text-slate-700 ring-slate-200",
        className,
      )}
    >
      {labelFromValue(value)}
    </span>
  );
}
