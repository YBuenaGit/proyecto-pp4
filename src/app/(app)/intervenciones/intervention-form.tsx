import { Button, LinkButton } from "@/components/ui/button";
import { DetailSection } from "@/components/ui/detail-section";
import { FormField, FormGrid, inputClass, textareaClass } from "@/components/ui/form-controls";
import { COUNTERPART_TYPES, JURIDICAL_STATUSES, PRIORITIES } from "@/lib/constants";
import { labelFromValue, toDateInputValue } from "@/lib/format";

type InterventionRecord = {
  attendedAt?: Date | null;
  dniSnapshot?: string | null;
  nameSnapshot?: string | null;
  manualPersonName?: string | null;
  person?: {
    dni: string | null;
    firstName: string;
    lastName: string;
    phone1: string | null;
    phone2: string | null;
    address: string | null;
  } | null;
  type?: string | null;
  subType?: string | null;
  urgency?: string | null;
  status?: string | null;
  oficioNumber?: string | null;
  expedienteNumber?: string | null;
  interventionContext?: string | null;
  counterpartType?: string | null;
  description?: string | null;
  guidanceProvided?: string | null;
  referredToAgency?: string | null;
};

export function InterventionForm({
  action,
  record,
  types,
  contexts,
  backHref,
  modal = false,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  record?: InterventionRecord;
  types: Array<{ value: string; label: string }>;
  contexts: Array<{ value: string; label: string }>;
  backHref: string;
  modal?: boolean;
  submitLabel?: string;
}) {
  const firstName = record?.person?.firstName ?? record?.nameSnapshot?.split(" ")[0] ?? "";
  const lastName = record?.person?.lastName ?? record?.nameSnapshot?.split(" ").slice(1).join(" ") ?? "";

  return (
    <form action={action} className="space-y-5">
      <DetailSection title="Datos de intervencion">
        <FormGrid>
          <FormField label="Fecha y hora">
            <input name="attendedAt" type="datetime-local" defaultValue={toDateInputValue(record?.attendedAt ?? new Date())} className={inputClass} />
          </FormField>
          <FormField label="Tipo">
            <select name="type" defaultValue={record?.type ?? ""} className={inputClass} required>
              <option value="">Seleccionar</option>
              {types.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Subtipo">
            <input name="subType" defaultValue={record?.subType ?? ""} className={inputClass} />
          </FormField>
          <FormField label="Urgencia">
            <select name="urgency" defaultValue={record?.urgency ?? "MEDIA"} className={inputClass}>
              {PRIORITIES.map((item) => (
                <option key={item} value={item}>{labelFromValue(item)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Estado">
            <select name="status" defaultValue={record?.status ?? "RECIBIDO"} className={inputClass}>
              {JURIDICAL_STATUSES.map((item) => (
                <option key={item} value={item}>{labelFromValue(item)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Contexto">
            <select name="interventionContext" defaultValue={record?.interventionContext ?? ""} className={inputClass}>
              <option value="">Sin especificar</option>
              {contexts.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Numero de oficio">
            <input name="oficioNumber" defaultValue={record?.oficioNumber ?? ""} className={inputClass} />
          </FormField>
          <FormField label="Numero de expediente">
            <input name="expedienteNumber" defaultValue={record?.expedienteNumber ?? ""} className={inputClass} />
          </FormField>
          <FormField label="Parte vinculada">
            <select name="counterpartType" defaultValue={record?.counterpartType ?? ""} className={inputClass}>
              <option value="">Sin especificar</option>
              {COUNTERPART_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FormField>
        </FormGrid>
      </DetailSection>

      <DetailSection title="Persona vinculada">
        <FormGrid>
          <FormField label="DNI">
            <input name="dni" defaultValue={record?.person?.dni ?? record?.dniSnapshot ?? ""} className={inputClass} />
          </FormField>
          <FormField label="Nombre">
            <input name="firstName" defaultValue={firstName} className={inputClass} />
          </FormField>
          <FormField label="Apellido">
            <input name="lastName" defaultValue={lastName} className={inputClass} />
          </FormField>
          <FormField label="Telefono 1">
            <input name="phone1" defaultValue={record?.person?.phone1 ?? ""} className={inputClass} />
          </FormField>
          <FormField label="Telefono 2">
            <input name="phone2" defaultValue={record?.person?.phone2 ?? ""} className={inputClass} />
          </FormField>
          <FormField label="Domicilio">
            <input name="address" defaultValue={record?.person?.address ?? ""} className={inputClass} />
          </FormField>
          <FormField label="Nombre manual excepcional" className="md:col-span-2 xl:col-span-3">
            <input name="manualPersonName" defaultValue={record?.manualPersonName ?? ""} className={inputClass} />
          </FormField>
        </FormGrid>
      </DetailSection>

      <DetailSection title="Contenido de la intervencion">
        <div className="space-y-4">
          <FormField label="Descripcion">
            <textarea name="description" defaultValue={record?.description ?? ""} className={textareaClass} required />
          </FormField>
          <FormField label="Orientacion o intervencion realizada">
            <textarea name="guidanceProvided" defaultValue={record?.guidanceProvided ?? ""} className={textareaClass} />
          </FormField>
          <FormField label="Derivado a organismo / agencia">
            <input name="referredToAgency" defaultValue={record?.referredToAgency ?? ""} className={inputClass} />
          </FormField>
          {!record ? (
            <FormField label="Adjuntos privados">
              <input
                name="attachments"
                type="file"
                multiple
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-sky-800"
              />
            </FormField>
          ) : null}
        </div>
      </DetailSection>

      <div className="flex items-center gap-2">
        <Button type="submit">{submitLabel ?? (record ? "Guardar cambios" : "Crear")}</Button>
        {modal ? (
          <Button type="button" variant="secondary" data-modal-close>
            Cancelar
          </Button>
        ) : (
          <LinkButton href={backHref} variant="secondary">Cancelar</LinkButton>
        )}
      </div>
    </form>
  );
}
