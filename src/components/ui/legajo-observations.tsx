"use client";

import Link from "next/link";
import {
  useRef,
  useState,
  type FormEvent,
} from "react";
import { formatDateTime } from "@/lib/format";
import { AppModal } from "./app-modal";
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
            <div className="mt-2 flex flex-wrap gap-1.5">
              {observation.attachments.map((attachment) => (
                <Link
                  key={attachment.id}
                  href={`/adjuntos/${attachment.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="max-w-full truncate rounded-sm border border-[#ced4da] bg-white px-2 py-1 text-xs font-semibold text-[#0667b0] hover:bg-[#e9ecef]"
                  title={attachment.originalName}
                >
                  {attachment.originalName}
                </Link>
              ))}
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
