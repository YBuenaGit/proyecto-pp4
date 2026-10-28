"use client";

import { useId, useState } from "react";
import { CalendarPlus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormField, FormGrid, inputClass, textareaClass } from "@/components/ui/form-controls";
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPES,
  CALENDAR_SCOPE_LABELS,
  type CalendarScope,
} from "@/lib/appointment-constants";
import { isCalendarScope } from "@/lib/appointment-permissions";
import type { AppointmentWithRelations } from "@/lib/appointment-service";
import { sortByLabel } from "@/lib/text";

type AppointmentFormProps = {
  action: (formData: FormData) => Promise<void>;
  allowedScopes: CalendarScope[];
  defaultDate: string;
  appointment?: AppointmentWithRelations;
  submitLabel?: string;
  modal?: boolean;
};

export function AppointmentForm({
  action,
  allowedScopes,
  defaultDate,
  appointment,
  submitLabel,
  modal = false,
}: AppointmentFormProps) {
  const [scopeError, setScopeError] = useState(false);
  const scopeErrorId = useId();
  const scope = isCalendarScope(appointment?.calendarScope)
    ? appointment.calendarScope
    : "";
  const sortedScopes = sortByLabel(allowedScopes, (item) => CALENDAR_SCOPE_LABELS[item]);

  return (
    <form action={action} className="space-y-4">
      <FormGrid className="xl:grid-cols-4">
        <FormField label="Agenda destino" className="rounded-sm border-2 border-[#0667b0] bg-[#e8f2ff] p-2 xl:col-span-2">
          <select
            name="calendarScope"
            className={cn(
              inputClass,
              "font-semibold text-[#064f87]",
              scopeError ? "border-[#dc3545] focus:border-[#dc3545]" : "border-[#0667b0]",
            )}
            defaultValue={scope}
            required
            aria-invalid={scopeError || undefined}
            aria-describedby={scopeError ? scopeErrorId : undefined}
            onInvalid={(event) => {
              event.preventDefault();
              setScopeError(true);
              event.currentTarget.focus();
            }}
            onChange={() => setScopeError(false)}
          >
            <option value="" disabled>Seleccione destino</option>
            {sortedScopes.map((item) => (
              <option key={item} value={item}>
                {CALENDAR_SCOPE_LABELS[item]}
              </option>
            ))}
          </select>
          {scopeError ? (
            <p id={scopeErrorId} role="alert" className="mt-1 text-xs font-medium text-[#dc3545]">
              Seleccione una agenda de destino.
            </p>
          ) : null}
        </FormField>
        <FormField label="Titulo" className="xl:col-span-2">
          <input name="title" className={inputClass} defaultValue={appointment?.title ?? ""} required />
        </FormField>
        <FormField label="Fecha">
          <input name="date" type="date" className={inputClass} defaultValue={appointment?.date ?? defaultDate} required />
        </FormField>
        <FormField label="Hora inicio">
          <input name="startTime" type="time" className={inputClass} defaultValue={appointment?.startTime ?? "09:00"} required />
        </FormField>
        <FormField label="Cliente">
          <input name="clientName" className={inputClass} defaultValue={appointment?.clientName ?? ""} />
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
        <FormField label="Lugar" className="xl:col-span-2">
          <input name="location" className={inputClass} defaultValue={appointment?.location ?? ""} />
        </FormField>
      </FormGrid>
      <FormField label="Notas">
        <textarea name="notes" className={textareaClass} defaultValue={appointment?.notes ?? ""} />
      </FormField>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#dee2e6] pt-4">
        {modal ? (
          <Button type="button" variant="secondary" className="w-full sm:w-auto" data-modal-close>
            Cancelar
          </Button>
        ) : null}
        <SubmitButton
          className="w-full sm:w-auto"
          pendingLabel={appointment ? "Guardando..." : "Creando cita..."}
        >
          {appointment ? <Save className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
          {submitLabel ?? (appointment ? "Guardar cambios" : "Crear cita")}
        </SubmitButton>
      </div>
    </form>
  );
}
