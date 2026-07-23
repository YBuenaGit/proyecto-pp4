import { FileText } from "lucide-react";
import { AttachmentPreviewButton } from "./attachment-preview-button";
import {
  formatFileSize,
  type LegajoAttachmentItem,
} from "./legajo-attachments";

export function LegajoBookAttachmentSheet({
  attachments,
  sectionLabel,
  title,
  pageNumber = 1,
  pageCount = 1,
  totalAttachments = attachments.length,
}: {
  attachments: LegajoAttachmentItem[];
  sectionLabel: string;
  title: string;
  pageNumber?: number;
  pageCount?: number;
  totalAttachments?: number;
}) {
  return (
    <article className="book-leaf rounded-sm border border-[#b7dfee] bg-[#eefaff] shadow-[0_12px_34px_rgba(0,0,0,0.22)]">
      <header className="border-b border-[#b7dfee] bg-[#dff3fb] px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0c5460]">
              {sectionLabel}
            </p>
            <h3 className="mt-1 text-lg font-semibold leading-snug text-[#212529]">
              {title}
            </h3>
          </div>
          <span className="shrink-0 rounded-full border border-[#b7dfee] bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-[#06577d]">
            {totalAttachments === 1
              ? "1 archivo"
              : `${totalAttachments} archivos`}
          </span>
        </div>
        {pageCount > 1 ? (
          <p className="mt-1.5 text-xs font-medium tabular-nums text-[#52616d]">
            Hoja {pageNumber} de {pageCount}
          </p>
        ) : null}
      </header>

      <div className="book-leaf-body px-4 py-4 sm:px-5">
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex min-w-0 flex-col gap-2.5 rounded-sm border border-[#d7dee5] bg-white p-3 shadow-sm"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#e4f5fa] text-[#0f8799]">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold leading-snug text-[#212529] [overflow-wrap:anywhere]">
                    {attachment.originalName}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-[#5f6871]">
                    {formatFileSize(attachment.size)} · Subido por{" "}
                    {attachment.uploadedBy.name}
                  </p>
                </div>
              </div>

              <div className="mt-auto flex justify-end">
                <AttachmentPreviewButton
                  href={`/adjuntos/${attachment.id}`}
                  name={attachment.originalName}
                  mimeType={attachment.mimeType}
                  compact
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
