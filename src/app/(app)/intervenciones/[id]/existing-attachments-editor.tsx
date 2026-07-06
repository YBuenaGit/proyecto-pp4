"use client";

import { useState, useTransition } from "react";
import { FileText, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
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
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!attachments.length || !deleteAction) return null;
  const action = deleteAction;

  function handleDelete(id: string) {
    if (
      !window.confirm(
        "Vas a eliminar este archivo adjunto. Quedara registrado en la auditoria pero se quitara de la tabla. Continuar?",
      )
    ) {
      return;
    }
    const formData = new FormData();
    formData.set("attachmentId", id);
    setPendingId(id);
    startTransition(async () => {
      await action(formData);
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-[#9bb8ca] bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#607589]">
        Archivos ya adjuntados
      </p>
      <ul className="space-y-2">
        {attachments.map((attachment) => {
          const deleting = isPending && pendingId === attachment.id;
          return (
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
                  type="button"
                  onClick={() => handleDelete(attachment.id)}
                  disabled={deleting}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-rose-100 bg-white px-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? (
                    <Spinner className="h-3.5 w-3.5" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  {deleting ? "Eliminando..." : "Eliminar"}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
