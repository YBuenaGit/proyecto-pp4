import { cn } from "./cn";
import { labelFromValue } from "@/lib/format";

const toneByStatus: Record<string, string> = {
  RECIBIDO: "bg-[#eef3f6] text-[#3c5368] ring-[#d7e4ee]",
  EN_ANALISIS: "bg-[#e4f0f7] text-[#173f63] ring-[#b9d2e2]",
  DERIVADO: "bg-[#e7ecf8] text-[#334c7d] ring-[#c7d3ef]",
  EN_GESTION: "bg-[#e4f3f4] text-[#1c5961] ring-[#bddfe3]",
  RESUELTO: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CERRADO: "bg-[#dfe8ee] text-[#2f4c63] ring-[#c9d9e5]",
  ARCHIVADO: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  EN_ORIENTACION: "bg-[#e4f0f7] text-[#173f63] ring-[#b9d2e2]",
  PENDIENTE_DOCUMENTACION: "bg-amber-50 text-amber-800 ring-amber-200",
  DERIVADO_EXTERNAMENTE: "bg-[#e7ecf8] text-[#334c7d] ring-[#c7d3ef]",
  EN_SEGUIMIENTO: "bg-[#e4f3f4] text-[#1c5961] ring-[#bddfe3]",
  CONCLUIDO: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  INICIADO: "bg-[#eef3f6] text-[#3c5368] ring-[#d7e4ee]",
  EN_TRAMITE: "bg-[#e4f3f4] text-[#1c5961] ring-[#bddfe3]",
  OBSERVADO: "bg-amber-50 text-amber-800 ring-amber-200",
  EN_APROBACION: "bg-[#e4f0f7] text-[#173f63] ring-[#b9d2e2]",
  APROBADO: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  FINALIZADO: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  URGENTE: "bg-rose-50 text-rose-800 ring-rose-200",
  ALTA: "bg-orange-50 text-orange-800 ring-orange-200",
  MEDIA: "bg-sky-50 text-sky-800 ring-sky-200",
  BAJA: "bg-[#eef3f6] text-[#3c5368] ring-[#d7e4ee]",
  ACTIVO: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  INACTIVO: "bg-[#eef3f6] text-[#3c5368] ring-[#d7e4ee]",
};

export function StatusBadge({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return <span className="text-slate-400">-</span>;
  const isMultiline = value === "PENDIENTE_DOCUMENTACION";
  const label = isMultiline ? (
    <>
      <span>Pendiente</span>
      <span>Documentación</span>
    </>
  ) : (
    labelFromValue(value)
  );

  return (
    <span
      className={cn(
        "inline-flex w-full min-w-[96px] max-w-[110px] items-center justify-center rounded-full px-2.5 py-1 text-center text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.70)] ring-1 ring-inset",
        isMultiline ? "flex-col justify-center whitespace-normal py-1.5 text-center leading-tight" : "whitespace-nowrap",
        toneByStatus[value] ?? "bg-[#eef3f6] text-[#3c5368] ring-[#d7e4ee]",
        className,
      )}
    >
      {label}
    </span>
  );
}
