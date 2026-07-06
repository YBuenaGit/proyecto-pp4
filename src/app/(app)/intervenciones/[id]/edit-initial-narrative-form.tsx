"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField, textareaClass } from "@/components/ui/form-controls";

const autosizeTextareaClass = `${textareaClass} resize-none overflow-hidden`;

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export function EditInitialNarrativeForm({
  action,
  initialValues,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialValues: {
    description: string;
    guidanceProvided?: string | null;
  };
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
      <FormField label="Descripcion del relato">
        <textarea
          name="description"
          className={autosizeTextareaClass}
          defaultValue={initialValues.description}
          data-autosize="true"
          onInput={handleTextareaInput}
          required
        />
      </FormField>
      <FormField label="Lo que se instruyo">
        <textarea
          name="guidanceProvided"
          className={autosizeTextareaClass}
          defaultValue={initialValues.guidanceProvided ?? ""}
          data-autosize="true"
          onInput={handleTextareaInput}
        />
      </FormField>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="secondary" data-modal-close>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
