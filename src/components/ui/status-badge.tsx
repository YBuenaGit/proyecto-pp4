import { cn } from "./cn";
import { labelFromValue } from "@/lib/format";

const toneByStatus: Record<string, string> = {
  RECIBIDO: "border-[#dee2e6] bg-[#f8f9fa] text-[#495057]",
  EN_ANALISIS: "border-[#bee5eb] bg-[#d1ecf1] text-[#0c5460]",
  DERIVADO: "border-[#b8daff] bg-[#cce5ff] text-[#004085]",
  EN_GESTION: "border-[#bee5eb] bg-[#d1ecf1] text-[#0c5460]",
  RESUELTO: "border-[#c3e6cb] bg-[#d4edda] text-[#155724]",
  CERRADO: "border-[#d6d8db] bg-[#e2e3e5] text-[#383d41]",
  ARCHIVADO: "border-[#d6d8db] bg-[#e2e3e5] text-[#383d41]",
  EN_ORIENTACION: "border-[#bee5eb] bg-[#d1ecf1] text-[#0c5460]",
  PENDIENTE_DOCUMENTACION: "border-[#ffeeba] bg-[#fff3cd] text-[#856404]",
  DERIVADO_EXTERNAMENTE: "border-[#b8daff] bg-[#cce5ff] text-[#004085]",
  EN_SEGUIMIENTO: "border-[#bee5eb] bg-[#d1ecf1] text-[#0c5460]",
  CONCLUIDO: "border-[#c3e6cb] bg-[#d4edda] text-[#155724]",
  INICIADO: "border-[#dee2e6] bg-[#f8f9fa] text-[#495057]",
  EN_TRAMITE: "border-[#bee5eb] bg-[#d1ecf1] text-[#0c5460]",
  OBSERVADO: "border-[#ffeeba] bg-[#fff3cd] text-[#856404]",
  EN_APROBACION: "border-[#b8daff] bg-[#cce5ff] text-[#004085]",
  APROBADO: "border-[#c3e6cb] bg-[#d4edda] text-[#155724]",
  FINALIZADO: "border-[#c3e6cb] bg-[#d4edda] text-[#155724]",
  URGENTE: "border-[#f5c6cb] bg-[#f8d7da] text-[#721c24]",
  ALTA: "border-[#ffeeba] bg-[#fff3cd] text-[#856404]",
  MEDIA: "border-[#bee5eb] bg-[#d1ecf1] text-[#0c5460]",
  BAJA: "border-[#dee2e6] bg-[#f8f9fa] text-[#495057]",
  ACTIVO: "border-[#c3e6cb] bg-[#d4edda] text-[#155724]",
  INACTIVO: "border-[#d6d8db] bg-[#e2e3e5] text-[#383d41]",
};

export function StatusBadge({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return <span className="text-[#adb5bd]">-</span>;
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
        "inline-flex min-w-[86px] max-w-[138px] items-center justify-center rounded-sm border px-2 py-0.5 text-center text-xs font-semibold shadow-none",
        isMultiline ? "flex-col justify-center whitespace-normal py-1 text-center leading-tight" : "whitespace-nowrap",
        toneByStatus[value] ?? "border-[#dee2e6] bg-[#f8f9fa] text-[#495057]",
        className,
      )}
    >
      {label}
    </span>
  );
}
