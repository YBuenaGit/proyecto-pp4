import { CalendarPlus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, FormGrid, inputClass, textareaClass } from "@/components/ui/form-controls";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPES,
  ASSIGNED_AREA_LABELS,
  ASSIGNED_AREAS,
  CALENDAR_SCOPE_LABELS,
  type CalendarScope,
} from "@/lib/appointment-constants";
import { isCalendarScope } from "@/lib/appointment-permissions";
import type { AgendaUserOption, AppointmentWithRelations } from "@/lib/appointment-service";

type AppointmentFormProps = {
  action: (formData: FormData) => Promise<void>;
  allowedScopes: CalendarScope[];
  users: AgendaUserOption[];
  lawyers: AgendaUserOption[];
  defaultDate: string;
  appointment?: AppointmentWithRelations;
  submitLabel?: string;
  compact?: boolean;
  modal?: boolean;
};

export function AppointmentForm({
  action,
  allowedScopes,
  users,
  lawyers,
  defaultDate,
  appointment,
  submitLabel,
  compact,
  modal = false,
}: AppointmentFormProps) {
  const scope = isCalendarScope(appointment?.calendarScope)
    ? appointment.calendarScope
    : allowedScopes.includes("personal")
      ? "personal"
      : allowedScopes[0];

  return (
    <form action={action} className="space-y-4">
      <FormGrid>
        <FormField label="Titulo" className="xl:col-span-2">
          <input name="title" className={inputClass} defaultValue={appointment?.title ?? ""} required />
        </FormField>
        <FormField label="Agenda destino">
          <select name="calendarScope" className={inputClass} defaultValue={scope} required>
            {allowedScopes.map((item) => (
              <option key={item} value={item}>
                {CALENDAR_SCOPE_LABELS[item]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Fecha">
          <input name="date" type="date" className={inputClass} defaultValue={appointment?.date ?? defaultDate} required />
        </FormField>
        <FormField label="Hora inicio">
          <input name="startTime" type="time" className={inputClass} defaultValue={appointment?.startTime ?? "09:00"} required />
        </FormField>
        <FormField label="Hora fin">
          <input name="endTime" type="time" className={inputClass} defaultValue={appointment?.endTime ?? ""} />
        </FormField>
        <FormField label="Cliente">
          <input name="clientName" className={inputClass} defaultValue={appointment?.clientName ?? ""} />
        </FormField>
        <FormField label="Abogado asignado">
          <select name="assignedLawyerId" className={inputClass} defaultValue={appointment?.assignedLawyerId ?? ""}>
            <option value="">Sin asignar</option>
            {lawyers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Usuario asignado">
          <select name="assignedUserId" className={inputClass} defaultValue={appointment?.assignedUserId ?? ""}>
            <option value="">Sin asignar</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Area asignada">
          <select name="assignedArea" className={inputClass} defaultValue={appointment?.assignedArea ?? ""}>
            <option value="">Sin asignar</option>
            {ASSIGNED_AREAS.map((area) => (
              <option key={area} value={area}>
                {ASSIGNED_AREA_LABELS[area]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Tipo de evento">
          <select name="type" className={inputClass} defaultValue={appointment?.type ?? "CONSULTA"} required>
            {APPOINTMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {APPOINTMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Estado">
          <select name="status" className={inputClass} defaultValue={appointment?.status ?? "PENDIENTE"} required>
            {APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {APPOINTMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Lugar">
          <input name="location" className={inputClass} defaultValue={appointment?.location ?? ""} />
        </FormField>
        <FormField label="Caso / ID interno">
          <input name="caseId" className={inputClass} defaultValue={appointment?.caseId ?? ""} />
        </FormField>
        <FormField label="Caso / expediente vinculado">
          <input name="caseTitle" className={inputClass} defaultValue={appointment?.caseTitle ?? ""} />
        </FormField>
        <FormField label="Numero de expediente">
          <input name="expedienteNumber" className={inputClass} defaultValue={appointment?.expedienteNumber ?? ""} />
        </FormField>
      </FormGrid>
      <FormField label="Notas">
        <textarea name="notes" className={textareaClass} defaultValue={appointment?.notes ?? ""} />
      </FormField>
      <Button type="submit" className={compact ? "w-full sm:w-auto" : ""}>
        {appointment ? <Save className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
        {submitLabel ?? (appointment ? "Guardar cambios" : "Crear cita")}
      </Button>
      {modal ? (
        <Button type="button" variant="secondary" className={compact ? "w-full sm:w-auto" : ""} data-modal-close>
          Cancelar
        </Button>
      ) : null}
    </form>
  );
}
