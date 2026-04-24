import { Button, LinkButton } from "@/components/ui/button";
import { DetailSection } from "@/components/ui/detail-section";
import { FormField, FormGrid, inputClass, textareaClass } from "@/components/ui/form-controls";
import { DISPATCH_STATUSES, PRIORITIES } from "@/lib/constants";
import { labelFromValue, toDateInputValue } from "@/lib/format";

type DispatchFormRecord = {
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
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  priority?: string | null;
  status?: string | null;
  referredArea?: string | null;
  notes?: string | null;
  confidentialSummary?: string | null;
};

export function DispatchForm({
  action,
  record,
  categories,
  areas,
  backHref,
}: {
  action: (formData: FormData) => void | Promise<void>;
  record?: DispatchFormRecord;
  categories: Array<{ value: string; label: string }>;
  areas: Array<{ value: string; label: string }>;
  backHref: string;
}) {
  const firstName = record?.person?.firstName ?? record?.nameSnapshot?.split(" ")[0] ?? "";
  const lastName = record?.person?.lastName ?? record?.nameSnapshot?.split(" ").slice(1).join(" ") ?? "";

  return (
    <form action={action} className="space-y-5">
      <DetailSection title="Datos de atencion">
        <FormGrid>
          <FormField label="Fecha y hora">
            <input name="attendedAt" type="datetime-local" defaultValue={toDateInputValue(record?.attendedAt ?? new Date())} className={inputClass} />
          </FormField>
          <FormField label="Categoria">
            <select name="category" defaultValue={record?.category ?? ""} className={inputClass} required>
              <option value="">Seleccionar</option>
              {categories.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Subcategoria">
            <input name="subcategory" defaultValue={record?.subcategory ?? ""} className={inputClass} />
          </FormField>
          <FormField label="Prioridad">
            <select name="priority" defaultValue={record?.priority ?? "MEDIA"} className={inputClass}>
              {PRIORITIES.map((item) => (
                <option key={item} value={item}>{labelFromValue(item)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Estado">
            <select name="status" defaultValue={record?.status ?? "RECIBIDO"} className={inputClass}>
              {DISPATCH_STATUSES.map((item) => (
                <option key={item} value={item}>{labelFromValue(item)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Area derivada">
            <select name="referredArea" defaultValue={record?.referredArea ?? ""} className={inputClass}>
              <option value="">Sin derivacion</option>
              {areas.map((item) => (
                <option key={item.value} value={item.label}>{item.label}</option>
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

      <DetailSection title="Contenido">
        <div className="space-y-4">
          <FormField label="Descripcion redactada">
            <textarea name="description" defaultValue={record?.description ?? ""} className={textareaClass} required />
          </FormField>
          <FormField label="Notas internas de Despacho">
            <textarea name="notes" defaultValue={record?.notes ?? ""} className={textareaClass} />
          </FormField>
          <FormField label="Resumen confidencial opcional">
            <textarea name="confidentialSummary" defaultValue={record?.confidentialSummary ?? ""} className={textareaClass} />
          </FormField>
          {!record ? (
            <FormField label="Adjuntos">
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
        <Button type="submit">Guardar</Button>
        <LinkButton href={backHref} variant="secondary">Cancelar</LinkButton>
      </div>
    </form>
  );
}
