import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { Button } from "./button";
import { SubmitButton } from "./submit-button";
import { formatDateTime } from "@/lib/format";
import type { DirectUploadIntent } from "@/lib/direct-upload-shared";
import { DirectUploadInput } from "./direct-upload-input";

export function AttachmentList({
  attachments,
}: {
  attachments: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    createdAt: Date;
    uploadedBy: { name: string };
    isPrivate: boolean;
  }>;
}) {
  if (!attachments.length) return <p className="text-sm font-medium text-[#212529]">Sin adjuntos.</p>;
  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <Link
          key={attachment.id}
          href={`/adjuntos/${attachment.id}`}
          className="block rounded-sm border border-[#dee2e6] bg-white px-3 py-2.5 text-sm transition duration-150 hover:bg-[#e9ecef]"
          title={attachment.originalName}
        >
          <span className="flex min-w-0 items-start gap-2">
            <FileText className="mt-1 h-4 w-4 shrink-0 text-[#0667b0]" />
            <span className="min-w-0 flex-1">
              <span className="block break-words font-semibold leading-6 text-[#212529]">{attachment.originalName}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-medium text-[#212529]">
                {attachment.isPrivate ? (
                  <span className="rounded-sm border border-[#bee5eb] bg-[#d1ecf1] px-1.5 py-0.5 font-semibold text-[#0c5460]">Privado</span>
                ) : null}
                <span>{Math.ceil(attachment.size / 1024)} KB</span>
                <span>{attachment.uploadedBy.name}</span>
                <span>{formatDateTime(attachment.createdAt)}</span>
              </span>
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function UploadForm({
  action,
  intent,
  modal = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  intent: DirectUploadIntent;
  modal?: boolean;
}) {
  return (
    <form action={action} className="flex flex-col gap-3 rounded-sm border border-dashed border-[#17a2b8] bg-[#d1ecf1]/40 p-3">
      <DirectUploadInput intent={intent} required label="Adjuntar archivos" />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton variant="secondary" className="w-fit" pendingLabel="Subiendo...">
          <Upload className="h-4 w-4" />
          Subir
        </SubmitButton>
        {modal ? (
          <Button type="button" variant="secondary" data-modal-close>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
