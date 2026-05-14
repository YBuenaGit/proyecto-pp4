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
  if (!attachments.length) return <p className="text-sm text-slate-500">Sin adjuntos.</p>;
  return (
    <div className="space-y-1.5">
      {attachments.map((attachment) => (
        <Link
          key={attachment.id}
          href={`/adjuntos/${attachment.id}`}
          className="block rounded-md border border-slate-200 px-2.5 py-2 text-sm transition hover:border-sky-300 hover:bg-sky-50"
          title={attachment.originalName}
        >
          <span className="flex min-w-0 items-start gap-2">
            <FileText className="mt-1 h-4 w-4 shrink-0 text-sky-700" />
            <span className="min-w-0 flex-1">
              <span className="block break-words font-semibold leading-6 text-slate-900">{attachment.originalName}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
                {attachment.isPrivate ? (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">Privado</span>
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
    <form action={action} encType="multipart/form-data" className="flex flex-col gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-2.5">
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Adjuntar archivos</span>
        <input
          type="file"
          name="attachments"
          multiple
          required
          className="block w-full text-sm text-slate-700 file:mr-2 file:rounded-md file:border-0 file:bg-sky-700 file:px-2.5 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-sky-800"
        />
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
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
