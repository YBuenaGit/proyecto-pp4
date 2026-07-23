"use client";

import { useRef, useState, type FormEvent } from "react";
import { MessageSquarePlus } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { DetailSection } from "@/components/ui/detail-section";
import {
  DirectUploadInput,
  type DirectUploadState,
} from "@/components/ui/direct-upload-input";
import {
  LegajoObservationList,
  type LegajoObservationItem,
} from "@/components/ui/legajo-observations";
import { Spinner } from "@/components/ui/spinner";

type FollowUpAction = (formData: FormData) => void | Promise<void>;

const EMPTY_UPLOAD_STATE: DirectUploadState = {
  totalFiles: 0,
  uploadingFiles: 0,
  readyFiles: 0,
  errorFiles: 0,
};

function ExpedientFollowUpForm({
  action,
  expedientId,
}: {
  action: FollowUpAction;
  expedientId: string;
}) {
  const submitLockedRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadState, setUploadState] =
    useState<DirectUploadState>(EMPTY_UPLOAD_STATE);
  const uploadsReady =
    uploadState.readyFiles > 0 &&
    uploadState.readyFiles === uploadState.totalFiles &&
    uploadState.uploadingFiles === 0 &&
    uploadState.errorFiles === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (submitLockedRef.current || !uploadsReady) {
      event.preventDefault();
      return;
    }
    submitLockedRef.current = true;
    setIsSubmitting(true);
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm font-semibold text-[#212529]">
        Seguimiento / observación
        <textarea
          name="content"
          required
          minLength={3}
          className="mt-1 min-h-36 w-full resize-y rounded-sm border border-[#ced4da] bg-white px-3 py-2 text-sm leading-6 text-[#212529] outline-none focus:border-[#80bdff] focus:ring-2 focus:ring-[rgba(0,123,255,.25)]"
          placeholder="Registrá la respuesta recibida, el avance o una aclaración del expediente."
        />
      </label>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#212529]">
          Archivos de respaldo
        </p>
        <DirectUploadInput
          intent={{
            module: "DESPACHO",
            entityType: "LegajoObservation",
            scopeId: expedientId,
            scopeEntityType: "InternalExpedient",
          }}
          required
          onUploadStateChange={setUploadState}
          helperText="Obligatorio: entre 1 y 30 archivos de hasta 1 GB cada uno."
        />
      </div>

      {!uploadsReady ? (
        <p className="text-xs font-semibold text-[#6c757d]" aria-live="polite">
          El botón se habilitará cuando al menos un archivo termine de cargarse
          correctamente.
        </p>
      ) : null}

      <div className="flex justify-end gap-2 border-t border-[#dee2e6] pt-3">
        <Button
          type="button"
          variant="secondary"
          data-modal-close
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || !uploadsReady}>
          {isSubmitting ? (
            <>
              <Spinner />
              Guardando...
            </>
          ) : (
            "Guardar seguimiento"
          )}
        </Button>
      </div>
    </form>
  );
}

export function ExpedientFollowUps({
  expedientId,
  observations,
  action,
}: {
  expedientId: string;
  observations: LegajoObservationItem[];
  action: FollowUpAction;
}) {
  return (
    <DetailSection
      title="Seguimientos / observaciones"
      action={
        <AppModal
          title="Agregar seguimiento"
          description="El texto y sus archivos quedarán registrados con autor y fecha. No podrán editarse ni eliminarse."
          trigger={
            <>
              <MessageSquarePlus className="h-4 w-4" />
              Agregar seguimiento
            </>
          }
          triggerVariant="secondary"
          size="md"
        >
          <ExpedientFollowUpForm action={action} expedientId={expedientId} />
        </AppModal>
      }
    >
      <LegajoObservationList observations={observations} />
    </DetailSection>
  );
}
