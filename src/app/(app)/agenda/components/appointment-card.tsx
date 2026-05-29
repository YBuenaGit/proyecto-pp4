import {
  Ban,
  BriefcaseBusiness,
  CalendarClock,
  Circle,
  ClipboardList,
  Edit3,
  FileSignature,
  FileText,
  PhoneCall,
  Scale,
  Trash2,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { labelFromValue } from "@/lib/format";
import type { CurrentUser } from "@/lib/types";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONES,
  APPOINTMENT_TYPE_LABELS,
  CALENDAR_SCOPE_BADGE_CLASS,
  CALENDAR_SCOPE_LABELS,
  type AppointmentStatus,
  type AppointmentType,
  type CalendarScope,
} from "@/lib/appointment-constants";
import { canDeleteAppointment, canEditAppointment, isCalendarScope } from "@/lib/appointment-permissions";
import type { AgendaUserOption, AppointmentWithRelations } from "@/lib/appointment-service";
import { cancelAppointment, deleteAppointment, updateAppointment } from "../actions";
import { AppointmentForm } from "./appointment-form";

function badgeClass(value: string, tones: Record<string, string>) {
  return cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", tones[value] ?? "bg-[#eef3f6] text-[#3c5368] ring-[#d7e4ee]");
}

const typeVisuals: Record<AppointmentType, { border: string; iconBox: string; Icon: LucideIcon }> = {
  CONSULTA: { border: "border-l-emerald-400", iconBox: "bg-emerald-50 text-emerald-700", Icon: UsersRound },
  AUDIENCIA: { border: "border-l-indigo-400", iconBox: "bg-indigo-50 text-indigo-700", Icon: Scale },
  VENCIMIENTO: { border: "border-l-orange-400", iconBox: "bg-orange-50 text-orange-700", Icon: CalendarClock },
  REUNION: { border: "border-l-sky-400", iconBox: "bg-[#d1ecf1] text-[#0667b0]", Icon: BriefcaseBusiness },
  MEDIACION: { border: "border-l-violet-400", iconBox: "bg-violet-50 text-violet-700", Icon: Scale },
  FIRMA_DOCUMENTACION: { border: "border-l-teal-400", iconBox: "bg-teal-50 text-teal-700", Icon: FileSignature },
  LLAMADA: { border: "border-l-blue-400", iconBox: "bg-blue-50 text-blue-700", Icon: PhoneCall },
  TAREA_ADMINISTRATIVA: { border: "border-l-cyan-400", iconBox: "bg-cyan-50 text-cyan-700", Icon: ClipboardList },
  GESTION_DOCUMENTAL: { border: "border-l-[#adb5bd]", iconBox: "bg-[#e9ecef] text-[#495057]", Icon: FileText },
  RECORDATORIO: { border: "border-l-amber-400", iconBox: "bg-amber-50 text-amber-700", Icon: CalendarClock },
  OTRO: { border: "border-l-zinc-400", iconBox: "bg-zinc-100 text-zinc-700", Icon: Circle },
};

function typeVisual(type: string) {
  return typeVisuals[type as AppointmentType] ?? typeVisuals.OTRO;
}

function scopeLabel(scope: string) {
  return isCalendarScope(scope) ? CALENDAR_SCOPE_LABELS[scope] : labelFromValue(scope);
}

function appointmentTypeLabel(type: string) {
  return APPOINTMENT_TYPE_LABELS[type as AppointmentType] ?? labelFromValue(type);
}

function appointmentStatusLabel(status: string) {
  return APPOINTMENT_STATUS_LABELS[status as AppointmentStatus] ?? labelFromValue(status);
}

function MetaItem({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <span className="truncate">{children}</span>;
}

export function AppointmentCard({
  appointment,
  user,
  allowedScopes,
  users,
  lawyers,
}: {
  appointment: AppointmentWithRelations;
  user: CurrentUser;
  allowedScopes: CalendarScope[];
  users: AgendaUserOption[];
  lawyers: AgendaUserOption[];
}) {
  const canEdit = canEditAppointment(user, appointment);
  const canDelete = canDeleteAppointment(user, appointment);
  const lawyerName = appointment.lawyerName ?? appointment.assignedLawyer?.name;
  const assignedName = appointment.assignedUser?.name;
  const assignedArea = appointment.assignedArea === "lawyers" ? "Abogados" : appointment.assignedArea === "dispatch" ? "Despacho" : null;
  const caseLabel = [appointment.caseTitle, appointment.expedienteNumber].filter(Boolean).join(" · ");
  const timeLabel = appointment.endTime ? `${appointment.startTime} - ${appointment.endTime}` : appointment.startTime;
  const visual = typeVisual(appointment.type);
  const Icon = visual.Icon;

  return (
    <article className={cn("rounded-sm border border-l-4 border-[#dee2e6] bg-white p-3 shadow-sm transition duration-150 hover:bg-[#f8f9fa]", visual.border)}>
      <div className="flex min-w-0 gap-3">
        <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", visual.iconBox)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[#212529]">{timeLabel}</span>
                <span className="text-[11px] font-semibold text-[#607589]">{appointmentTypeLabel(appointment.type)}</span>
              </div>
              <h3 className="mt-0.5 truncate text-sm font-semibold text-[#212529]">{appointment.title}</h3>
            </div>
            <span className={cn("shrink-0", badgeClass(appointment.status, APPOINTMENT_STATUS_TONES))}>
              {appointmentStatusLabel(appointment.status)}
            </span>
          </div>

          <div className="mt-1 grid gap-x-2 gap-y-0.5 text-[11px] font-medium leading-5 text-[#607589]">
            <MetaItem>{appointment.clientName ? `Cliente: ${appointment.clientName}` : null}</MetaItem>
            <MetaItem>{lawyerName ? `Abogado: ${lawyerName}` : null}</MetaItem>
            <MetaItem>{assignedName ? `Usuario: ${assignedName}` : null}</MetaItem>
            <MetaItem>{assignedArea ? `Area: ${assignedArea}` : null}</MetaItem>
            <MetaItem>{appointment.location ? `Lugar: ${appointment.location}` : null}</MetaItem>
            <MetaItem>{caseLabel || null}</MetaItem>
          </div>
        </div>
      </div>

      {appointment.notes ? (
        <p className="mt-2 truncate rounded-lg bg-[#f3f8fb] px-2.5 py-1.5 text-xs leading-5 text-[#607589] ring-1 ring-[#e6eef4]">{appointment.notes}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#e6eef4] pt-2.5">
        <span className={badgeClass(appointment.calendarScope, CALENDAR_SCOPE_BADGE_CLASS)}>{scopeLabel(appointment.calendarScope)}</span>
        <div className="flex flex-wrap gap-1.5">
          {canEdit ? (
            <AppModal
              title="Editar cita"
              trigger={<Edit3 className="h-3.5 w-3.5" />}
              triggerVariant="secondary"
              triggerClassName="h-8 w-8 border-[#dee2e6] px-0 text-[#6c757d] shadow-none hover:text-[#0667b0]"
              size="xl"
            >
              <AppointmentForm
                action={updateAppointment.bind(null, appointment.id)}
                allowedScopes={allowedScopes}
                users={users}
                lawyers={lawyers}
                defaultDate={appointment.date}
                appointment={appointment}
                compact
                modal
              />
            </AppModal>
          ) : null}
          {canEdit && appointment.status !== "CANCELADA" ? (
            <form action={cancelAppointment.bind(null, appointment.id)}>
              <Button type="submit" variant="secondary" className="h-8 w-8 px-0 text-[#6c757d] shadow-none hover:text-[#0667b0]" title="Cancelar cita">
                <Ban className="h-3.5 w-3.5" />
              </Button>
            </form>
          ) : null}
          {canDelete ? (
            <form action={deleteAppointment.bind(null, appointment.id)}>
              <Button type="submit" variant="danger" className="h-8 w-8 px-0 shadow-none" title="Eliminar cita">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </article>
  );
}
