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
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <Link
          key={attachment.id}
          href={`/adjuntos/${attachment.id}`}
          className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm transition hover:border-sky-300 hover:bg-sky-50"
        >
          <span className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-sky-700" />
            <span className="truncate font-medium text-slate-800">{attachment.originalName}</span>
            {attachment.isPrivate ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Privado</span> : null}
          </span>
          <span className="shrink-0 text-xs text-slate-500">
            {Math.ceil(attachment.size / 1024)} KB · {attachment.uploadedBy.name} · {formatDateTime(attachment.createdAt)}
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
    <form action={action} className="flex flex-col gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Adjuntar archivos</span>
        <input
          type="file"
          name="attachments"
          multiple
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-sky-800"
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
