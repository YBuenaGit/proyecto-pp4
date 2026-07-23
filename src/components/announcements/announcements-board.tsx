"use client";

import Image from "next/image";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  createAnnouncement,
  deleteAnnouncement,
  permanentlyDeleteAnnouncement,
  restoreAnnouncement,
  updateAnnouncement,
} from "@/app/(app)/actions";
import { AttachmentPreviewButton } from "@/components/ui/attachment-preview-button";
import { DirectUploadInput } from "@/components/ui/direct-upload-input";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar } from "@/components/layout/profile-avatar-menu";
import { formatDateTime } from "@/lib/format";
import {
  initialAnnouncementActionState,
  type AnnouncementActionState,
  type AnnouncementAttachmentItem,
  type AnnouncementItem,
} from "@/lib/announcement-types";

type Flash = { tone: "success" | "error"; message: string } | null;

function formatContent(content: string) {
  return content
    .replace(/(?<!Dr|Sr|Sra|Jr|Dpto)\.\s+(?=[A-ZÁÉÍÓÚÑ])/g, ".\n\n")
    .replace(/(?<!\n)\s*\n{2,}/g, "\n\n")
    .replace(/([!?])\s+(?=[A-ZÁÉÍÓÚÑ])/g, "$1\n\n")
    .trim();
}

function imageAttachments(attachments: AnnouncementAttachmentItem[]) {
  return attachments.filter((attachment) => attachment.mimeType.startsWith("image/"));
}

function videoAttachments(attachments: AnnouncementAttachmentItem[]) {
  return attachments.filter((attachment) => attachment.mimeType.startsWith("video/"));
}

function otherAttachments(attachments: AnnouncementAttachmentItem[]) {
  return attachments.filter(
    (attachment) =>
      !attachment.mimeType.startsWith("image/") &&
      !attachment.mimeType.startsWith("video/"),
  );
}

function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: AnnouncementAttachmentItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") {
        setIndex((current) => (current === 0 ? images.length - 1 : current - 1));
      }
      if (event.key === "ArrowRight") {
        setIndex((current) => (current === images.length - 1 ? 0 : current + 1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [images.length, onClose]);

  const current = images[index];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Imagen ${index + 1} de ${images.length}`}
        className="relative h-[92dvh] w-full max-w-6xl overflow-hidden rounded-sm border border-[#80bdff] bg-[#0b2239] shadow-2xl"
      >
        <Image
          src={`/adjuntos/${current.id}`}
          alt={current.originalName}
          fill
          unoptimized
          sizes="100vw"
          className="object-contain p-4 sm:p-8"
          priority
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-white/50 bg-[#dc3545] px-3 text-sm font-semibold text-white hover:bg-[#c82333]"
        >
          <X className="h-4 w-4" /> Cerrar imagen
        </button>
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => setIndex((currentIndex) => (currentIndex === 0 ? images.length - 1 : currentIndex - 1))}
              aria-label="Imagen anterior"
              className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm border border-white/50 bg-white/85 text-[#0667b0] hover:bg-white"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((currentIndex) => (currentIndex === images.length - 1 ? 0 : currentIndex + 1))}
              aria-label="Imagen siguiente"
              className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm border border-white/50 bg-white/85 text-[#0667b0] hover:bg-white"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        ) : null}
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-sm bg-black/65 px-3 py-1.5 text-sm font-semibold text-white">
          Imagen {index + 1} de {images.length}
        </p>
      </div>
    </div>
  );
}

function AnnouncementAttachments({
  attachments,
  tone = "light",
}: {
  attachments: AnnouncementAttachmentItem[];
  tone?: "light" | "glass";
}) {
  const images = useMemo(() => imageAttachments(attachments), [attachments]);
  const videos = useMemo(() => videoAttachments(attachments), [attachments]);
  const others = useMemo(() => otherAttachments(attachments), [attachments]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const glass = tone === "glass";

  if (!attachments.length) return null;

  return (
    <div className="space-y-4">
      {images.length ? (
        <section>
          <p className={glass ? "mb-2 text-sm font-semibold text-white/85" : "mb-2 text-sm font-semibold text-[#0c5460]"}>Imágenes adjuntas:</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {images.map((attachment, index) => (
              <div key={attachment.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className={glass ? "group block w-full overflow-hidden rounded-md border border-white/35 bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80" : "group block w-full overflow-hidden rounded-sm border border-[#9fdbe5] bg-[#eefaff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff]"}
                >
                  <Image
                    src={`/adjuntos/${attachment.id}`}
                    alt={attachment.originalName}
                    width={240}
                    height={180}
                    unoptimized
                    className="h-32 w-full object-cover transition group-hover:scale-[1.02]"
                  />
                </button>
                <a
                  href={`/adjuntos/${attachment.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={glass ? "mt-1 block truncate text-xs font-semibold text-[#d8f5ff] hover:text-white hover:underline" : "mt-1 block truncate text-xs font-semibold text-[#0667b0] hover:underline"}
                  title={attachment.originalName}
                >
                  Ver con más detalle
                </a>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {videos.length ? (
        <section>
          <p className={glass ? "mb-2 text-sm font-semibold text-white/85" : "mb-2 text-sm font-semibold text-[#0c5460]"}>Videos adjuntos:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {videos.map((attachment) => (
              <div key={attachment.id} className={glass ? "rounded-md border border-white/30 bg-white/10 p-2 backdrop-blur-sm" : "rounded-sm border border-[#bee5eb] bg-[#eefaff] p-2"}>
                <video
                  src={`/adjuntos/${attachment.id}`}
                  controls
                  preload="metadata"
                  className="max-h-80 w-full rounded-sm bg-black"
                />
                <p className={glass ? "mt-1 truncate text-xs font-semibold text-white/85" : "mt-1 truncate text-xs font-semibold text-[#495057]"} title={attachment.originalName}>
                  {attachment.originalName}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {others.length ? (
        <section>
          <p className={glass ? "mb-2 text-sm font-semibold text-white/85" : "mb-2 text-sm font-semibold text-[#0c5460]"}>Archivos adjuntos:</p>
          <div className="flex flex-wrap gap-2">
            {others.map((attachment) => (
              <AttachmentPreviewButton
                key={attachment.id}
                href={`/adjuntos/${attachment.id}`}
                name={attachment.originalName}
                mimeType={attachment.mimeType}
              />
            ))}
          </div>
        </section>
      ) : null}

      {lightboxIndex !== null ? (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </div>
  );
}

function ComposerForm({
  onPublished,
  currentUserName,
  currentUserAvatarAttachmentId,
}: {
  onPublished: (message: string) => void;
  currentUserName: string;
  currentUserAvatarAttachmentId?: string | null;
}) {
  const router = useRouter();
  const submitLockedRef = useRef(false);
  const [actionState, formAction, pending] = useActionState(
    createAnnouncement,
    initialAnnouncementActionState,
  );

  useEffect(() => {
    if (actionState.status === "error") {
      submitLockedRef.current = false;
      return;
    }
    if (actionState.status === "success") {
      onPublished(actionState.message);
      router.refresh();
    }
  }, [actionState, onPublished, router]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (submitLockedRef.current) {
          event.preventDefault();
          return;
        }
        submitLockedRef.current = true;
      }}
      className="relative mx-auto max-w-3xl space-y-4 rounded-2xl border border-white/15 bg-[#0b2239]/70 p-4 text-white shadow-[0_18px_45px_rgba(3,63,107,0.35)] ring-1 ring-inset ring-[#17a2b8]/30 backdrop-blur-2xl"
    >
      {actionState.status === "error" ? (
        <p role="alert" className="rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-3 py-2 text-sm font-semibold text-[#721c24]">
          {actionState.message}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <UserAvatar
          attachmentId={currentUserAvatarAttachmentId}
          name={currentUserName}
          size="lg"
          className="border-white/30 ring-2 ring-white/20"
        />
        <input
          name="title"
          required
          minLength={3}
          maxLength={160}
          className="h-10 min-w-0 flex-1 rounded-full border border-white/20 bg-[#0f2e4d]/90 px-4 text-sm text-white placeholder:text-[#9fdbe5]/60 outline-none focus:border-[#80bdff] focus:ring-2 focus:ring-[#80bdff]"
          placeholder="Título del anuncio"
        />
      </div>
      <textarea
        name="content"
        required
        minLength={3}
        maxLength={10_000}
        rows={3}
        onInput={(event) => {
          const el = event.currentTarget;
          el.style.height = "auto";
          el.style.height = `${el.scrollHeight}px`;
        }}
        className="min-h-28 w-full resize-none overflow-hidden rounded-sm border border-white/20 bg-[#0f2e4d]/90 px-4 py-3 text-sm leading-6 text-white placeholder:text-[#9fdbe5]/60 outline-none focus:border-[#80bdff] focus:ring-2 focus:ring-[#80bdff]"
        placeholder="Escribe algo..."
      />
      <DirectUploadInput
        intent={{ module: "ANUNCIOS", entityType: "Announcement" }}
        accept="image/*,application/pdf,video/*"
        label="Subir archivos"
        showPreviews
        tone="glass"
      />
      <div className="flex justify-end border-t border-white/15 pt-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-sm border border-[#0667b0] bg-[#0667b0] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0a61b9] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <><Spinner /> Publicando...</> : "Publicar anuncio"}
        </button>
      </div>
    </form>
  );
}

function AdminOperationButton({
  announcementId,
  action,
  confirmMessage,
  children,
  tone = "danger",
  onResult,
}: {
  announcementId: string;
  action: (id: string) => Promise<AnnouncementActionState>;
  confirmMessage: string;
  children: ReactNode;
  tone?: "danger" | "success";
  onResult: (result: AnnouncementActionState) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => onResult(await action(announcementId)));
      }}
      className={
        tone === "success"
          ? "inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-[#28a745] bg-white/90 px-2.5 text-xs font-semibold text-[#218838] hover:bg-[#d4edda] disabled:opacity-60"
          : "inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-[#dc3545] bg-white/90 px-2.5 text-xs font-semibold text-[#c82333] hover:bg-[#f8d7da] disabled:opacity-60"
      }
    >
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}

function AnnouncementCard({
  announcement,
  canAdminister,
  onResult,
}: {
  announcement: AnnouncementItem;
  canAdminister: boolean;
  onResult: (result: AnnouncementActionState) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateAnnouncement.bind(null, announcement.id),
    initialAnnouncementActionState,
  );
  const isEditing = editing && updateState.status !== "success";

  useEffect(() => {
    if (updateState.status !== "success") return;
    onResult(updateState);
    router.refresh();
  }, [onResult, router, updateState]);

  return (
    <article className="relative mx-auto my-5 max-w-3xl rounded-2xl border border-white/15 bg-[#0b2239]/70 p-4 text-white shadow-[0_18px_45px_rgba(3,63,107,0.35)] ring-1 ring-inset ring-[#17a2b8]/30 backdrop-blur-2xl">
      <div className="relative z-10">
      <div className="flex items-center gap-3">
        <UserAvatar
          attachmentId={announcement.authorAvatarAttachmentId}
          name={announcement.authorName}
          className="ring-2 ring-white/35"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {announcement.authorName} · {announcement.authorRole}
          </p>
          <p className="text-xs font-medium text-[#d8f5ff]">
            {formatDateTime(announcement.createdAt)}
          </p>
        </div>
      </div>

      {isEditing ? (
        <form action={updateAction} className="mt-4 space-y-3">
          {updateState.status === "error" ? (
            <p className="rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-3 py-2 text-sm font-semibold text-[#721c24]">
              {updateState.message}
            </p>
          ) : null}
          <input
            name="title"
            defaultValue={announcement.title}
            required
            minLength={3}
            maxLength={160}
            className="h-10 w-full rounded-sm border border-white/20 bg-[#0f2e4d]/90 px-3 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-[#80bdff]"
          />
          <textarea
            name="content"
            defaultValue={announcement.content}
            required
            minLength={3}
            maxLength={10_000}
            rows={5}
            className="min-h-32 w-full resize-y rounded-sm border border-white/20 bg-[#0f2e4d]/90 px-3 py-2 text-sm leading-6 text-white outline-none focus:ring-2 focus:ring-[#80bdff]"
          />
          <p className="text-xs font-medium text-white/75">Los archivos existentes se conservarán sin cambios.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={updatePending} className="rounded-sm border border-white/70 bg-white/90 px-3 py-1.5 text-sm font-semibold text-[#495057] hover:bg-white">
              Cancelar
            </button>
            <button type="submit" disabled={updatePending} className="inline-flex items-center gap-2 rounded-sm border border-[#28a745] bg-[#28a745] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#218838] disabled:opacity-60">
              {updatePending ? <><Spinner /> Guardando...</> : "Guardar"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <h2 className="my-4 text-center text-xl font-semibold tracking-[-0.01em] text-white">{announcement.title}</h2>
          <p className="mb-4 whitespace-pre-wrap text-sm leading-6 text-white/95 md:text-base">
            {formatContent(announcement.content)}
          </p>
          <AnnouncementAttachments attachments={announcement.attachments} tone="glass" />
        </>
      )}

      {canAdminister && !isEditing ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/25 pt-3">
          <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-white/60 bg-white/90 px-2.5 text-xs font-semibold text-[#0c5460] hover:bg-white">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
          <AdminOperationButton
            announcementId={announcement.id}
            action={deleteAnnouncement}
            confirmMessage="¿Estás seguro de que deseas eliminar este anuncio?"
            onResult={onResult}
          >
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </AdminOperationButton>
        </div>
      ) : null}
      </div>
    </article>
  );
}

function DeletedAnnouncements({
  announcements,
  onResult,
}: {
  announcements: AnnouncementItem[];
  onResult: (result: AnnouncementActionState) => void;
}) {
  return (
    <section className="mx-auto mt-8 max-w-4xl rounded-2xl border border-white/15 bg-[#0b2239] p-4 text-white shadow-[0_18px_45px_rgba(3,63,107,0.35)] ring-1 ring-inset ring-[#17a2b8]/30 sm:p-6">
      <h2 className="text-xl font-bold text-white">Mensajes borrados</h2>
      {!announcements.length ? (
        <p className="mt-3 text-sm text-[#9fdbe5]">No hay mensajes borrados.</p>
      ) : (
        <ul className="mt-4 space-y-5">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="rounded-sm border border-white/12 bg-[#0c3457]/70 p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white">{announcement.title}</h3>
                  <p className="text-xs text-[#9fdbe5]">
                    {announcement.authorName} · {announcement.authorRole} · {formatDateTime(announcement.createdAt)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#eaf4ff]">{announcement.content}</p>
                  <div className="mt-3">
                    <AnnouncementAttachments attachments={announcement.attachments} tone="glass" />
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <AdminOperationButton
                    announcementId={announcement.id}
                    action={restoreAnnouncement}
                    confirmMessage="¿Estás seguro de que deseas restaurar este anuncio?"
                    tone="success"
                    onResult={onResult}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                  </AdminOperationButton>
                  <AdminOperationButton
                    announcementId={announcement.id}
                    action={permanentlyDeleteAnnouncement}
                    confirmMessage="¿Estás seguro de que deseas eliminar definitivamente este anuncio y sus archivos? Esta acción no se puede deshacer."
                    onResult={onResult}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar definitivamente
                  </AdminOperationButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AnnouncementsBoard({
  currentUserName,
  currentUserAvatarAttachmentId,
  announcements,
  deletedAnnouncements,
  canAdminister,
}: {
  currentUserName: string;
  currentUserAvatarAttachmentId?: string | null;
  announcements: AnnouncementItem[];
  deletedAnnouncements: AnnouncementItem[];
  canAdminister: boolean;
}) {
  const router = useRouter();
  const [composerKey, setComposerKey] = useState(0);
  const [flash, setFlash] = useState<Flash>(null);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 4000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const handleResult = useCallback((result: AnnouncementActionState) => {
    setFlash({ tone: result.status === "success" ? "success" : "error", message: result.message });
    if (result.status === "success") router.refresh();
  }, [router]);

  const handlePublished = useCallback((message: string) => {
    setFlash({ tone: "success", message });
    setComposerKey((current) => current + 1);
  }, []);

  return (
    <div className="relative min-h-[calc(100dvh-6rem)] overflow-hidden rounded-sm border border-white/10 bg-[#061829] bg-[linear-gradient(135deg,#061829_0%,#0a1f36_45%,#0c3355_100%)] px-3 py-6 shadow-[0_18px_45px_rgba(3,25,47,0.45)] sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(23,162,184,0.16),transparent_42%),radial-gradient(circle_at_88%_84%,rgba(6,103,176,0.18),transparent_46%)]" />
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <Image
          src="/logo-gum1.png"
          alt=""
          aria-hidden
          width={520}
          height={490}
          className="h-auto w-[26rem] object-contain opacity-40 sm:w-[40rem]"
        />
      </div>
      <div className="relative z-10">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#cfe8ff]">Portal interno · {currentUserName}</p>
        <h1 className="mb-9 text-center text-3xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">ANUNCIOS IMPORTANTES</h1>

        {flash ? (
          <div className={flash.tone === "success" ? "fixed left-1/2 top-20 z-[90] -translate-x-1/2 rounded-sm border border-[#c3e6cb] bg-[#d4edda] px-4 py-3 text-sm font-semibold text-[#155724] shadow-lg" : "fixed left-1/2 top-20 z-[90] -translate-x-1/2 rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-4 py-3 text-sm font-semibold text-[#721c24] shadow-lg"}>
            {flash.message}
          </div>
        ) : null}

        <ComposerForm
          key={composerKey}
          onPublished={handlePublished}
          currentUserName={currentUserName}
          currentUserAvatarAttachmentId={currentUserAvatarAttachmentId}
        />

        <div className="mx-auto my-7 max-w-4xl">
          {announcements.length ? (
            announcements.map((announcement) => (
              <AnnouncementCard
                key={`${announcement.id}-${announcement.updatedAt}`}
                announcement={announcement}
                canAdminister={canAdminister}
                onResult={handleResult}
              />
            ))
          ) : (
            <p className="rounded-2xl border border-white/15 bg-[#0b2239]/70 px-4 py-8 text-center text-sm font-semibold text-[#eaf4ff] shadow-[0_18px_45px_rgba(3,63,107,0.35)] ring-1 ring-inset ring-[#17a2b8]/30 backdrop-blur-2xl">
              No hay mensajes disponibles.
            </p>
          )}
        </div>

        {canAdminister ? (
          <DeletedAnnouncements announcements={deletedAnnouncements} onResult={handleResult} />
        ) : null}
      </div>
    </div>
  );
}
