import { Button, LinkButton } from "@/components/ui/button";
import { DetailSection } from "@/components/ui/detail-section";
import { FormField, FormGrid, inputClass, textareaClass } from "@/components/ui/form-controls";
import { EXPEDIENT_STATUSES } from "@/lib/constants";
import { labelFromValue } from "@/lib/format";

type ExpedientRecord = {
  expedienteNumber?: string | null;
  category?: string | null;
  description?: string | null;
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
          <FormField label="Estado">
            <select name="status" defaultValue={record?.status ?? "INICIADO"} className={inputClass}>
              {EXPEDIENT_STATUSES.map((item) => (
                <option key={item} value={item}>{labelFromValue(item)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Descripcion" className="md:col-span-2 xl:col-span-3">
            <textarea name="description" defaultValue={record?.description ?? ""} className={textareaClass} required />
          </FormField>
          {!record ? (
            <FormField label="Adjuntos" className="md:col-span-2 xl:col-span-3">
              <input
                name="attachments"
                type="file"
                multiple
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-sky-800"
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
