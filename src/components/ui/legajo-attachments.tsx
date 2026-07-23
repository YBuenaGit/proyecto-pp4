import { FileText } from "lucide-react";
import { AttachmentPreviewButton } from "./attachment-preview-button";

export type LegajoAttachmentItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: {
    name: string;
  };
};

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function attachmentCountLabel(count: number) {
  if (count === 0) return "Sin archivos";
  if (count === 1) return "1 archivo";
  return `${count} archivos`;
}

export function LegajoAttachmentCount({ count }: { count: number }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-[#b7dfee] bg-[#eefaff] px-2.5 py-1 text-xs font-semibold text-[#06577d]">
      <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {attachmentCountLabel(count)}
    </span>
  );
}

export function LegajoAttachmentList({
  attachments,
  title = "Archivos vinculados",
}: {
  attachments: LegajoAttachmentItem[];
  title?: string;
}) {
  if (!attachments.length) return null;

  return (
    <section className="rounded-sm border border-[#dee2e6] bg-[#f8f9fa] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#212529]">
          {title}
        </h3>
        <span className="rounded-full border border-[#ced4da] bg-white px-2.5 py-1 text-xs font-semibold text-[#495057]">
          {attachmentCountLabel(attachments.length)}
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {attachments.map((attachment) => (
          <li
            key={attachment.id}
            className="flex min-w-0 flex-col gap-3 rounded-sm border border-[#d7dee5] bg-white p-3 shadow-sm"
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

            <div className="flex justify-end">
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
    </section>
  );
}
