"use client";

import { useEffect, useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField, inputClass, textareaClass } from "@/components/ui/form-controls";
import { ACTION_TYPES, JURIDICAL_STATUSES } from "@/lib/constants";
import { labelFromValue } from "@/lib/format";

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

const autosizeTextareaClass = `${textareaClass} resize-none overflow-hidden`;

export function AddJuridicalActionForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (contentRef.current) resizeTextarea(contentRef.current);
  }, []);

  function handleContentInput(event: FormEvent<HTMLTextAreaElement>) {
    resizeTextarea(event.currentTarget);
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Tipo de actuacion">
          <select name="actionType" className={inputClass} defaultValue="SEGUIMIENTO">
            {ACTION_TYPES.map((item) => (
              <option key={item} value={item}>
                {labelFromValue(item)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Estado">
          <select name="statusAfter" className={inputClass} defaultValue="">
            <option value="">Sin cambio</option>
            {JURIDICAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {labelFromValue(status)}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField label="Contenido">
        <textarea ref={contentRef} name="content" className={autosizeTextareaClass} onInput={handleContentInput} required />
      </FormField>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit">Guardar</Button>
        <Button type="button" variant="secondary" data-modal-close>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
