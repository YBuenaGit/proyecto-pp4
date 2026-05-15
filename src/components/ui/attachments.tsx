import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { Button } from "./button";
import { formatDateTime } from "@/lib/format";

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
  if (!attachments.length) return <p className="text-sm font-medium text-[#607589]">Sin adjuntos.</p>;
  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <Link
          key={attachment.id}
          href={`/adjuntos/${attachment.id}`}
          className="block rounded-xl border border-[#d7e4ee] bg-white/80 px-3 py-2.5 text-sm transition duration-200 hover:border-[#9bb8ca] hover:bg-[#f4f9fc]"
          title={attachment.originalName}
        >
          <span className="flex min-w-0 items-start gap-2">
            <FileText className="mt-1 h-4 w-4 shrink-0 text-[#255f85]" />
            <span className="min-w-0 flex-1">
              <span className="block break-words font-semibold leading-6 text-[#172033]">{attachment.originalName}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-medium text-[#607589]">
                {attachment.isPrivate ? (
                  <span className="rounded-full bg-[#eaf3f8] px-1.5 py-0.5 font-semibold text-[#2f4c63]">Privado</span>
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
  modal = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  modal?: boolean;
}) {
  return (
    <form action={action} encType="multipart/form-data" className="flex flex-col gap-3 rounded-2xl border border-dashed border-[#9bb8ca] bg-[#f3f8fb] p-3">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#607589]">Adjuntar archivos</span>
        <input
          type="file"
          name="attachments"
          multiple
          required
          className="block w-full text-sm text-[#334b5f] file:mr-2 file:rounded-lg file:border-0 file:bg-[#173f63] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#225b80]"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="secondary" className="w-fit">
          <Upload className="h-4 w-4" />
          Subir
        </Button>
        {modal ? (
          <Button type="button" variant="secondary" data-modal-close>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
