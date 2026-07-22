"use client";

import {
  useRef,
  useState,
  type FormEvent,
} from "react";
import { CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { AppModal } from "./app-modal";
import { AttachmentPreviewButton } from "./attachment-preview-button";
import { Button } from "./button";
import { DirectUploadInput } from "./direct-upload-input";
import { Spinner } from "./spinner";

export type LegajoObservationAttachment = {
  id: string;
  originalName: string;
  mimeType: string;
};

export type LegajoObservationItem = {
  id: string;
  entityType: string;
  entityId: string;
  content: string;
  createdAt: Date | string;
  createdBy: { name: string };
  attachments: LegajoObservationAttachment[];
};

type ObservationAction = (formData: FormData) => void | Promise<void>;

function excerpt(content: string, limit = 72) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > limit
    ? `${normalized.slice(0, limit - 1)}…`
    : normalized;
}

function ObservationAttachmentCards({
  attachments,
}: {
  attachments: LegajoObservationAttachment[];
}) {
  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="min-w-0 rounded-sm border border-[#ced4da] bg-white p-2"
        >
          <p
            className="truncate text-xs font-semibold text-[#212529]"
            title={attachment.originalName}
          >
            {attachment.originalName}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#218838]">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Archivo cargado
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
      ))}
    </div>
  );
}

function ObservationAttachmentHistory({
  observations,
}: {
  observations: LegajoObservationItem[];
}) {
  const observationsWithAttachments = observations.filter(
    (observation) => observation.attachments.length > 0,
  );

  return (
    <ol className="min-w-0 space-y-3">
      {observationsWithAttachments.map((observation, index) => (
        <li
          key={observation.id}
          className="min-w-0 rounded-sm border border-amber-200 bg-amber-50 p-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            Observación {index + 1}
          </p>
          <p className="mt-0.5 text-xs text-[#6c757d]">
            {observation.createdBy.name} · {formatDateTime(observation.createdAt)}
          </p>
          <div className="mt-2">
            <ObservationAttachmentCards attachments={observation.attachments} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function LegajoObservationList({
  observations,
}: {
  observations: LegajoObservationItem[];
}) {
  if (!observations.length) {
    return <p className="text-sm text-[#6c757d]">Sin observaciones.</p>;
  }

  return (
    <ol className="space-y-2">
      {observations.map((observation) => (
        <li
          key={observation.id}
          className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2"
        >
          <p className="whitespace-pre-wrap text-sm leading-6 text-[#212529]">
            {observation.content}
          </p>
          {observation.attachments.length ? (
            <div className="mt-2">
              <ObservationAttachmentCards attachments={observation.attachments} />
            </div>
          ) : null}
          <p className="mt-1 text-xs text-[#6c757d]">
            {observation.createdBy.name} · {formatDateTime(observation.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}

function ObservationForm({
  action,
  entityType,
  entityId,
  uploadModule,
  scopeId,
}: {
  action: ObservationAction;
  entityType: string;
  entityId: string;
  uploadModule: "DESPACHO" | "JURIDICO";
  scopeId: string;
}) {
  const submitLockedRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (submitLockedRef.current) {
      event.preventDefault();
      return;
    }
    submitLockedRef.current = true;
    setIsSubmitting(true);
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <label className="block text-sm font-semibold text-[#212529]">
        Observación
        <textarea
          name="content"
          required
          minLength={3}
          className="mt-1 min-h-32 w-full resize-y rounded-sm border border-[#ced4da] bg-white px-3 py-2 text-sm leading-6 text-[#212529] outline-none focus:border-[#80bdff] focus:ring-2 focus:ring-[rgba(0,123,255,.25)]"
          placeholder="Describí la aclaración o corrección sin modificar el contenido original."
        />
      </label>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#212529]">Archivos adjuntos</p>
        <DirectUploadInput
          intent={{
            module: uploadModule,
            entityType: "LegajoObservation",
            scopeId,
          }}
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-[#dee2e6] pt-3">
        <Button
          type="button"
          variant="secondary"
          data-modal-close
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner />
              Guardando...
            </>
          ) : (
            "Guardar observación"
          )}
        </Button>
      </div>
    </form>
  );
}

export function LegajoObservationCell({
  observations,
  action,
  entityType,
  entityId,
  uploadModule,
  scopeId,
}: {
  observations: LegajoObservationItem[];
  action?: ObservationAction;
  entityType: string;
  entityId: string;
  uploadModule?: "DESPACHO" | "JURIDICO";
  scopeId?: string;
}) {
  const latest = observations.at(-1);
  const attachmentCount = observations.reduce(
    (total, observation) => total + observation.attachments.length,
    0,
  );

  return (
    <div className="w-full min-w-0 space-y-1.5 overflow-hidden" data-legajo-observation-cell>
      {latest ? (
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-[#495057]">
            {observations.length} {observations.length === 1 ? "observación" : "observaciones"}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[#6c757d]">
            {excerpt(latest.content)}
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-[#6c757d]">Sin observaciones</p>
      )}

      {attachmentCount > 0 ? (
        <AppModal
          title="Archivos de observaciones"
          description="Archivos cargados como respaldo de las observaciones de esta línea."
          size="md"
          trigger={`Ver ${attachmentCount} ${attachmentCount === 1 ? "archivo" : "archivos"}`}
          triggerVariant="info"
          triggerClassName="min-h-7 w-full max-w-full whitespace-nowrap px-1.5 py-1 text-[10px] leading-3"
        >
          <ObservationAttachmentHistory observations={observations} />
        </AppModal>
      ) : null}

      {action && uploadModule && scopeId ? (
        <AppModal
          title="Agregar observación"
          description="La observación y sus archivos quedarán registrados con autor y fecha y no podrán editarse ni eliminarse."
          size="md"
          trigger="Agregar observación"
          triggerVariant="secondary"
          triggerClassName="min-h-7 max-w-full whitespace-nowrap px-1.5 py-1 text-[10px] leading-3"
        >
          <ObservationForm
            action={action}
            entityType={entityType}
            entityId={entityId}
            uploadModule={uploadModule}
            scopeId={scopeId}
          />
        </AppModal>
      ) : null}
    </div>
  );
}
