"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText, X } from "lucide-react";

function canPreview(mimeType: string) {
  return mimeType === "application/pdf" || mimeType.startsWith("image/") || mimeType.startsWith("text/");
}

export function AttachmentPreviewButton({
  href,
  name,
  mimeType,
  compact = false,
}: {
  href: string;
  name: string;
  mimeType: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const previewable = canPreview(mimeType);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-sm border border-[#17a2b8] bg-[#17a2b8] px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-[#138496] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff]"
      >
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className={compact ? "truncate" : ""}>{compact ? "Abrir archivo" : name}</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-3 sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            className="flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-sm border border-[#0f8a9b] bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={`Vista previa de ${name}`}
          >
            <div className="flex items-center justify-between gap-3 bg-[#17a2b8] px-3 py-2 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="text-xs text-white/80">{mimeType}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-8 items-center gap-1 rounded-sm border border-white/40 px-2.5 py-1 text-xs font-semibold hover:bg-white/15"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Nueva pestaña
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/40 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Cerrar archivo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 bg-[#e9ecef] p-3">
              {previewable ? (
                <iframe title={name} src={href} className="h-full w-full rounded-sm border border-[#ced4da] bg-white" />
              ) : (
                <div className="flex h-full items-center justify-center rounded-sm border border-[#ced4da] bg-white p-6 text-center">
                  <div>
                    <FileText className="mx-auto h-10 w-10 text-[#17a2b8]" />
                    <p className="mt-3 text-sm font-semibold text-[#212529]">Este tipo de archivo no se puede previsualizar.</p>
                    <a href={href} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-sm border border-[#17a2b8] bg-[#17a2b8] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#138496]">
                      Abrir archivo
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
