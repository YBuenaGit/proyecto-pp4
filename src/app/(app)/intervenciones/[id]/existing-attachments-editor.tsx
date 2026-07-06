"use client";

import type { MouseEvent } from "react";
import { FileText, Trash2 } from "lucide-react";
import { AttachmentPreviewButton } from "./attachment-preview-button";

export type EditableAttachment = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export function ExistingAttachmentsEditor({
  attachments,
  deleteAction,
}: {
  attachments: EditableAttachment[];
  deleteAction?: (formData: FormData) => void | Promise<void>;
}) {
  if (!attachments.length || !deleteAction) return null;

  function confirmDelete(event: MouseEvent<HTMLButtonElement>) {
    if (
      !window.confirm(
        "Vas a eliminar este archivo adjunto. Esta accion no se puede deshacer. Continuar?",
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-[#9bb8ca] bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#607589]">
        Archivos ya adjuntados
      </p>
      <ul className="space-y-2">
        {attachments.map((attachment) => (
          <li
            key={attachment.id}
            className="flex items-center justify-between gap-3 rounded-md border border-[#e4edf4] bg-[#f6fafc] px-3 py-2"
          >
            <span className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-[#0667b0]" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[#212529]">
                  {attachment.originalName}
                </span>
                <span className="block text-xs text-[#607589]">
                  {Math.ceil(attachment.size / 1024)} KB
                </span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <AttachmentPreviewButton
                href={`/adjuntos/${attachment.id}`}
                name={attachment.originalName}
                mimeType={attachment.mimeType}
                compact
              />
              <button
                type="submit"
                formAction={deleteAction}
                formNoValidate
                name="attachmentId"
                value={attachment.id}
                onClick={confirmDelete}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-rose-100 bg-white px-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
