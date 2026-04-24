import { Ban, BriefcaseBusiness, CalendarDays, Edit3, FileText, MapPin, Scale, StickyNote, Trash2, UserRound, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { labelFromValue } from "@/lib/format";
import type { CurrentUser } from "@/lib/types";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONES,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_TONES,
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
  return cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", tones[value] ?? "bg-slate-100 text-slate-700 ring-slate-200");
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

function DetailLine({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 text-sm leading-6 text-slate-700">
      <Icon className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
      <div>{children}</div>
    </div>
  );
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
  const assignedName = appointment.assignedUser?.name ?? appointment.assignedLawyer?.name;
  const assignedArea = appointment.assignedArea === "lawyers" ? "Abogados" : appointment.assignedArea === "dispatch" ? "Despacho" : null;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-950">{appointment.startTime}</span>
            {appointment.endTime ? <span className="text-sm text-slate-500">a {appointment.endTime}</span> : null}
            <span className={badgeClass(appointment.calendarScope, CALENDAR_SCOPE_BADGE_CLASS)}>{scopeLabel(appointment.calendarScope)}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold text-slate-950">{appointment.title}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={badgeClass(appointment.type, APPOINTMENT_TYPE_TONES)}>
            {appointmentTypeLabel(appointment.type)}
          </span>
          <span className={badgeClass(appointment.status, APPOINTMENT_STATUS_TONES)}>
            {appointmentStatusLabel(appointment.status)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <DetailLine icon={UserRound}>{appointment.clientName ? `Cliente: ${appointment.clientName}` : null}</DetailLine>
        <DetailLine icon={Scale}>
          {appointment.lawyerName ?? appointment.assignedLawyer?.name
            ? `Abogado: ${appointment.lawyerName ?? appointment.assignedLawyer?.name}`
            : null}
        </DetailLine>
        <DetailLine icon={BriefcaseBusiness}>{assignedName ? `Usuario asignado: ${assignedName}` : null}</DetailLine>
        <DetailLine icon={CalendarDays}>{assignedArea ? `Area asignada: ${assignedArea}` : null}</DetailLine>
        <DetailLine icon={MapPin}>{appointment.location ? `Lugar: ${appointment.location}` : null}</DetailLine>
        <DetailLine icon={FileText}>
          {[appointment.caseTitle, appointment.expedienteNumber].filter(Boolean).join(" · ") || null}
        </DetailLine>
      </div>

      {appointment.notes ? (
        <div className="mt-3 flex gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
          <StickyNote className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
          <p>{appointment.notes}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500">
          Creada por {appointment.createdBy.name}
          {appointment.owner ? ` · Dueño: ${appointment.owner.name}` : ""}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {canEdit && appointment.status !== "CANCELADA" ? (
            <form action={cancelAppointment.bind(null, appointment.id)}>
              <Button type="submit" variant="secondary" className="h-9 px-3">
                <Ban className="h-4 w-4" />
                Cancelar
              </Button>
            </form>
          ) : null}
          {canDelete ? (
            <form action={deleteAppointment.bind(null, appointment.id)}>
              <Button type="submit" variant="danger" className="h-9 px-3">
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      {canEdit ? (
        <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
            <Edit3 className="h-4 w-4" />
            Editar cita
          </summary>
          <div className="mt-4">
            <AppointmentForm
              action={updateAppointment.bind(null, appointment.id)}
              allowedScopes={allowedScopes}
              users={users}
              lawyers={lawyers}
              defaultDate={appointment.date}
              appointment={appointment}
              compact
            />
          </div>
        </details>
      ) : null}
    </article>
  );
}
