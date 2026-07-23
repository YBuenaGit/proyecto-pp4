"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, UserRound, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { updateProfileAvatar } from "@/app/(app)/profile-actions";
import { DirectUploadInput } from "@/components/ui/direct-upload-input";
import { Spinner } from "@/components/ui/spinner";
import { initialProfileAvatarActionState } from "@/lib/profile-types";

export function UserAvatar({
  attachmentId,
  name,
  size = "md",
  className = "",
}: {
  attachmentId?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "lg" ? "h-12 w-12" : size === "sm" ? "h-9 w-9" : "h-10 w-10";

  return (
    <span
      className={`${sizeClass} relative inline-flex shrink-0 overflow-hidden rounded-full border border-white/55 bg-[#d8f2f8] shadow-[0_4px_16px_rgba(3,63,107,0.18)] ${className}`}
      aria-label={`Foto de perfil de ${name}`}
    >
      {attachmentId ? (
        <Image
          src={`/adjuntos/${attachmentId}`}
          alt={`Foto de perfil de ${name}`}
          fill
          unoptimized
          sizes={size === "lg" ? "48px" : size === "sm" ? "36px" : "40px"}
          className="object-cover"
        />
      ) : (
        <UserRound className="m-auto h-1/2 w-1/2 text-[#0667b0]" aria-hidden="true" />
      )}
    </span>
  );
}

export function ProfileAvatarMenu({
  userId,
  userName,
  avatarAttachmentId,
}: {
  userId: string;
  userName: string;
  avatarAttachmentId?: string | null;
}) {
  const router = useRouter();
  const submitLockedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [actionState, formAction, pending] = useActionState(
    updateProfileAvatar,
    initialProfileAvatarActionState,
  );
  const panelVisible = open && actionState.status !== "success";

  useEffect(() => {
    if (actionState.status === "error") submitLockedRef.current = false;
    if (actionState.status === "success") router.refresh();
  }, [actionState, router]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={panelVisible}
        aria-label="Cambiar foto de perfil"
        className="group relative rounded-full outline-none transition duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#80bdff] active:translate-y-0"
      >
        <UserAvatar
          attachmentId={avatarAttachmentId}
          name={userName}
          className="ring-2 ring-white"
        />
        <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-[#0667b0] text-white shadow-sm">
          <Camera className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      </button>

      {actionState.status === "success" ? (
        <p className="fixed right-3 top-16 z-50 flex w-56 items-center gap-2 rounded-md border border-[#badbcc] bg-[#d1e7dd] px-3 py-2 text-xs font-semibold text-[#0f5132] shadow-lg sm:absolute sm:right-0 sm:top-12">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {actionState.message}
        </p>
      ) : null}

      {panelVisible ? (
        <div className="fixed left-3 right-3 top-16 z-50 rounded-xl border border-[#9fdbe5] bg-white p-4 shadow-[0_18px_50px_rgba(3,63,107,0.24)] sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[22rem]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#0c5460]">Foto de perfil</p>
              <p className="mt-0.5 text-xs text-[#5b6770]">Se mostrara junto a tus anuncios.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar cambio de foto"
              className="grid h-8 w-8 place-items-center rounded-md text-[#495057] transition hover:bg-[#e8f7fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            action={formAction}
            onSubmit={(event) => {
              if (submitLockedRef.current) {
                event.preventDefault();
                return;
              }
              submitLockedRef.current = true;
            }}
            className="space-y-3"
          >
            {actionState.status === "error" ? (
              <p role="alert" className="rounded-md border border-[#f5c2c7] bg-[#f8d7da] px-3 py-2 text-xs font-semibold text-[#842029]">
                {actionState.message}
              </p>
            ) : null}
            <DirectUploadInput
              intent={{ module: "PERFIL", entityType: "UserAvatar", scopeId: userId }}
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              label="Seleccionar imagen"
              helperText="JPG, PNG, WebP, GIF o AVIF. Maximo 10 MB."
              maxFiles={1}
              required
              showPreviews
            />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md bg-[#0667b0] px-4 py-2 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(6,103,176,0.25)] transition hover:bg-[#07578f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? <><Spinner /> Guardando...</> : "Guardar foto"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
