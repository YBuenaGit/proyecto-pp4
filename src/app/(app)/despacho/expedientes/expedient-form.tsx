import { Button, LinkButton } from "@/components/ui/button";
import { FormField, FormGrid, inputClass, textareaClass } from "@/components/ui/form-controls";
import { SelectedFilesInput } from "@/components/ui/selected-files-input";
import { EXPEDIENT_AREAS, EXPEDIENT_STATUSES } from "@/lib/constants";
import { labelFromValue } from "@/lib/format";
import { sortByLabel } from "@/lib/text";
import { ExpedientCodeCombobox } from "./expedient-code-combobox";

type ExpedientRecord = {
  expedienteNumber?: string | null;
  codigo?: string | null;
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
  const sortedCategories = sortByLabel(categories, (item) => item.label);

  return (
    <form action={action} className="space-y-5">
      <FormGrid>
        <FormField label="Numero de expediente">
          <input name="expedienteNumber" defaultValue={record?.expedienteNumber ?? ""} className={inputClass} required />
        </FormField>
        <FormField label="Codigo">
          <ExpedientCodeCombobox defaultValue={record?.codigo} />
        </FormField>
        <FormField label="Categoria">
          <select name="category" defaultValue={record?.category ?? ""} className={inputClass} required>
            <option value="">Seleccionar</option>
            {sortedCategories.map((item) => (
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
          <input name="description" defaultValue={record?.description ?? ""} className={inputClass} />
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
            <SelectedFilesInput name="attachments" />
          </FormField>
        ) : null}
      </FormGrid>
      <div className="flex items-center justify-end gap-2">
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
