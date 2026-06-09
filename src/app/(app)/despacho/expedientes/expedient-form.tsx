import { Button, LinkButton } from "@/components/ui/button";
import { DetailSection } from "@/components/ui/detail-section";
import { FormField, FormGrid, inputClass, textareaClass } from "@/components/ui/form-controls";
import { EXPEDIENT_AREAS, EXPEDIENT_STATUSES } from "@/lib/constants";
import { labelFromValue } from "@/lib/format";

type ExpedientRecord = {
  expedienteNumber?: string | null;
  category?: string | null;
  area?: string | null;
  description?: string | null;
  observation?: string | null;
  status?: string | null;
};

export function ExpedientForm({
  action,
  record,
  categories,
  backHref,
  modal = false,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  record?: ExpedientRecord;
  categories: Array<{ value: string; label: string }>;
  backHref: string;
  modal?: boolean;
  submitLabel?: string;
}) {
  return (
    <form action={action} encType="multipart/form-data" className="space-y-5">
      <DetailSection title="Expediente interno">
        <FormGrid>
          <FormField label="Numero de expediente">
            <input name="expedienteNumber" defaultValue={record?.expedienteNumber ?? ""} className={inputClass} />
          </FormField>
          <FormField label="Categoria">
            <select name="category" defaultValue={record?.category ?? ""} className={inputClass} required>
              <option value="">Seleccionar</option>
              {categories.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Area">
            <select name="area" defaultValue={record?.area ?? ""} className={inputClass} required>
              <option value="">Seleccionar</option>
              {EXPEDIENT_AREAS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Descripcion">
            <input name="description" defaultValue={record?.description ?? ""} className={inputClass} required />
          </FormField>
          <FormField label="Estado">
            <select name="status" defaultValue={record?.status ?? "INICIADO"} className={inputClass}>
              {EXPEDIENT_STATUSES.map((item) => (
                <option key={item} value={item}>{labelFromValue(item)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Observacion" className="md:col-span-2 xl:col-span-3">
            <textarea name="observation" defaultValue={record?.observation ?? ""} className={textareaClass} />
          </FormField>
          {!record ? (
            <FormField label="Adjuntos" className="md:col-span-2 xl:col-span-3">
              <input
                name="attachments"
                type="file"
                multiple
                className="block w-full text-sm text-[#212529] file:mr-3 file:rounded-sm file:border-0 file:bg-[#0667b0] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[#0a61b9]"
              />
            </FormField>
          ) : null}
        </FormGrid>
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
