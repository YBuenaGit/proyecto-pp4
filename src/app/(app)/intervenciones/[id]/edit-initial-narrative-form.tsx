"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, textareaClass } from "@/components/ui/form-controls";
import {
  ExistingAttachmentsEditor,
  type EditableAttachment,
} from "./existing-attachments-editor";

const autosizeTextareaClass = `${textareaClass} resize-none overflow-hidden`;

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function attachmentKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function EditInitialNarrativeForm({
  action,
  initialValues,
  existingAttachments,
  deleteAttachmentAction,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialValues: {
    description: string;
    guidanceProvided?: string | null;
  };
  existingAttachments?: EditableAttachment[];
  deleteAttachmentAction?: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitLockedRef = useRef(false);
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    formRef.current
      ?.querySelectorAll<HTMLTextAreaElement>("textarea[data-autosize='true']")
      .forEach(resizeTextarea);
  }, []);

  function handleTextareaInput(event: FormEvent<HTMLTextAreaElement>) {
    resizeTextarea(event.currentTarget);
  }

  function syncAttachmentInput(files: File[]) {
    if (!fileInputRef.current) return;
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    fileInputRef.current.files = dataTransfer.files;
  }

  function addAttachments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    if (!files.length) return;

    setSelectedAttachments((current) => {
      const existingKeys = new Set(current.map(attachmentKey));
      const next = [...current];
      files.forEach((file) => {
        const key = attachmentKey(file);
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          next.push(file);
        }
      });
      syncAttachmentInput(next);
      return next;
    });
  }

  function removeAttachment(indexToRemove: number) {
    setSelectedAttachments((current) => {
      const next = current.filter((_, index) => index !== indexToRemove);
      syncAttachmentInput(next);
      return next;
    });
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
      <FormField label="Adjuntos de esta hoja">
        <div className="space-y-2 rounded-lg border border-dashed border-[#9bb8ca] bg-[#f3f8fb] p-3">
          <ExistingAttachmentsEditor
            attachments={existingAttachments ?? []}
            deleteAction={deleteAttachmentAction}
          />
          <input
            ref={fileInputRef}
            name="attachments"
            type="file"
            multiple
            onChange={addAttachments}
            className="block w-full text-sm text-[#212529] file:mr-2 file:rounded-sm file:border-0 file:bg-[#0667b0] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[#0a61b9]"
          />
          <p className="text-xs text-[#607589]">
            {selectedAttachments.length
              ? `${selectedAttachments.length} archivo(s) seleccionado(s).`
              : "Sin adjuntos seleccionados."}
          </p>
          {selectedAttachments.length ? (
            <ul className="space-y-1 rounded-md bg-white px-3 py-2 text-sm text-[#495057]">
              {selectedAttachments.map((file, index) => (
                <li
                  key={`${attachmentKey(file)}-${index}`}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="min-w-0 truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-rose-100 bg-white px-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
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
