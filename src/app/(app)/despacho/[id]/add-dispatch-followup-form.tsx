"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { DirectUploadInput } from "@/components/ui/direct-upload-input";
import { Spinner } from "@/components/ui/spinner";
import {
  FormField,
  inputClass,
  textareaClass,
} from "@/components/ui/form-controls";
import { DISPATCH_STATUSES } from "@/lib/constants";
import { labelFromValue } from "@/lib/format";
import { toArgentinaDateTimeInputValue } from "@/lib/argentina-time";

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

const autosizeTextareaClass = `${textareaClass} resize-none overflow-hidden`;
const followUpStatuses = DISPATCH_STATUSES.filter(
  (status) => status !== "DERIVADO",
);

function nowInputValue() {
  return toArgentinaDateTimeInputValue(new Date());
}

export function AddDispatchFollowUpForm({
  action,
  recordId,
  submitLabel = "Crear intervencion",
}: {
  action: (formData: FormData) => void | Promise<void>;
  recordId: string;
  submitLabel?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitLockedRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    formRef.current
      ?.querySelectorAll<HTMLTextAreaElement>("textarea[data-autosize='true']")
      .forEach(resizeTextarea);
  }, []);

  function handleTextareaInput(event: FormEvent<HTMLTextAreaElement>) {
    resizeTextarea(event.currentTarget);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (submitLockedRef.current) {
      event.preventDefault();
      return;
    }
    submitLockedRef.current = true;
    setIsSubmitting(true);
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Fecha y hora">
          <input
            name="createdAt"
            type="datetime-local"
            className={inputClass}
            defaultValue={nowInputValue()}
          />
        </FormField>
        <FormField label="Plazo">
          <input
            name="deadlineAt"
            type="datetime-local"
            className={inputClass}
            defaultValue=""
          />
        </FormField>
        <FormField label="Estado">
          <select
            name="statusAfter"
            className={inputClass}
            defaultValue=""
          >
            <option value="">Sin cambio</option>
            {followUpStatuses.map((status) => (
              <option key={status} value={status}>
                {labelFromValue(status)}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField label="Descripcion / relato">
        <textarea
          name="description"
          className={autosizeTextareaClass}
          data-autosize="true"
          onInput={handleTextareaInput}
          required
        />
      </FormField>
      <FormField label="Intervencion realizada / orientacion brindada">
        <textarea
          name="guidanceProvided"
          className={autosizeTextareaClass}
          data-autosize="true"
          onInput={handleTextareaInput}
        />
      </FormField>
      <FormField label="Adjuntos de esta hoja">
        <DirectUploadInput
          intent={{ module: "DESPACHO", entityType: "DispatchFollowUp", scopeId: recordId }}
        />
      </FormField>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="secondary" data-modal-close>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner />
              Guardando...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
