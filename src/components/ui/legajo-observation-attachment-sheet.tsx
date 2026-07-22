import { CheckCircle2, FileText } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { AttachmentPreviewButton } from "./attachment-preview-button";
import type { LegajoObservationItem } from "./legajo-observations";

export type BookObservationAttachment = {
  id: string;
  originalName: string;
  mimeType: string;
  observationId: string;
  observationContent: string;
  observationCreatedAt: Date | string;
  observationCreatedBy: string;
};

export function flattenObservationAttachments(
  observations: LegajoObservationItem[],
): BookObservationAttachment[] {
  return observations.flatMap((observation) =>
    observation.attachments.map((attachment) => ({
      ...attachment,
      observationId: observation.id,
      observationContent: observation.content,
      observationCreatedAt: observation.createdAt,
      observationCreatedBy: observation.createdBy.name,
    })),
  );
}

export function LegajoObservationAttachmentSheet({
  sectionLabel,
  attachments,
  pageNumber = 1,
  pageCount = 1,
}: {
  sectionLabel: string;
  attachments: BookObservationAttachment[];
  pageNumber?: number;
  pageCount?: number;
}) {
  return (
    <article className="book-leaf rounded-sm border border-amber-200 bg-amber-50 shadow-[0_12px_34px_rgba(0,0,0,0.22)]">
      <div className="border-b border-amber-200 bg-amber-100 px-4 py-4 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
          {sectionLabel}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[#212529]">
          Archivos de observaciones
          {pageCount > 1 ? ` · hoja ${pageNumber} de ${pageCount}` : ""}
        </h3>
        <p className="mt-1 text-sm text-[#495057]">
          Archivos cargados como respaldo de observaciones posteriores.
        </p>
      </div>
      <div className="book-leaf-body grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5">
        {attachments.map((attachment) => (
          <div
            key={`${attachment.observationId}-${attachment.id}`}
            className="min-w-0 rounded-sm border border-amber-200 bg-white px-3 py-3 shadow-sm"
          >
            <div className="flex min-w-0 items-start gap-2">
              <FileText className="mt-1 h-4 w-4 shrink-0 text-[#0667b0]" />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-semibold text-[#212529]"
                  title={attachment.originalName}
                >
                  {attachment.originalName}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#218838]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Archivo cargado
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#495057]">
                  Observación: {attachment.observationContent}
                </p>
                <p className="mt-1 text-[11px] text-[#6c757d]">
                  {attachment.observationCreatedBy} ·{" "}
                  {formatDateTime(attachment.observationCreatedAt)}
                </p>
                <div className="mt-2">
                  <AttachmentPreviewButton
                    href={`/adjuntos/${attachment.id}`}
                    name={attachment.originalName}
                    mimeType={attachment.mimeType}
                    compact
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
