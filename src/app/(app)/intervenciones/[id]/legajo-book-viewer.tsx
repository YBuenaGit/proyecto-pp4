"use client";

import Link from "next/link";
import { Children, useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Download, X } from "lucide-react";

export type LegajoBookItem = {
  sheetNumber: number;
  label?: string;
  title: string;
  dateText: string;
  statusText?: string | null;
  searchText: string;
};

export function LegajoBookViewer({
  items,
  children,
  downloadHref,
  headerAction,
  title = "Expediente virtual Â· Legajo de intervencion",
  itemLabel = "Intervencion",
}: {
  items: LegajoBookItem[];
  children: ReactNode;
  downloadHref?: string;
  headerAction?: ReactNode;
  title?: string;
  itemLabel?: string;
}) {
  const pages = Children.toArray(children);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  const indexedItems = useMemo(() => items.map((item, index) => ({ ...item, index })), [items]);

  const safeCurrent = Math.min(current, Math.max(indexedItems.length - 1, 0));

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
        return;
      }
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") setCurrent(Math.max(0, safeCurrent - 1));
      if (event.key === "ArrowRight") setCurrent(Math.min(indexedItems.length - 1, safeCurrent + 1));
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [indexedItems.length, open, safeCurrent]);

  const currentItem = indexedItems[safeCurrent];
  const nextItem = indexedItems[safeCurrent + 1];
  const currentLabel = currentItem?.label ?? (currentItem ? `${itemLabel} N° ${currentItem.sheetNumber}` : "Sin resultados");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-sm border border-[#17a2b8] bg-[#17a2b8] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#138496] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff]"
      >
        <BookOpen className="h-4 w-4" />
        Modo libro
      </button>

      {open ? (
        <section
          className="fixed inset-0 z-[60] flex flex-col bg-[#6a3c1c] bg-[url('/mesa.webp')] bg-cover bg-center"
          role="dialog"
          aria-modal="true"
          aria-label="Modo libro del legajo"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#17a2b8] px-3 py-2 text-white shadow">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">{title}</h2>
              <p className="text-xs text-white/85">{currentLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {headerAction}
              {downloadHref ? (
                <Link
                  href={downloadHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-sm border border-white/45 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/45 text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Cerrar modo libro"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-black/25 px-3 py-2 text-white">
            <select
              value={currentItem?.index ?? ""}
              onChange={(event) => {
                const nextIndex = indexedItems.findIndex((item) => item.index === Number(event.target.value));
                if (nextIndex >= 0) setCurrent(nextIndex);
              }}
              className="h-10 min-w-[260px] rounded-sm border border-white/40 bg-white px-2 text-sm font-semibold text-[#212529] outline-none"
            >
              {indexedItems.map((item) => (
                <option key={`${item.sheetNumber}-${item.index}`} value={item.index}>
                  {item.label ?? `${itemLabel} N° ${item.sheetNumber}`} · {item.title}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrent(Math.max(0, safeCurrent - 1))}
                disabled={!indexedItems.length || safeCurrent === 0}
                className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-white/40 bg-black/20 px-3 py-1.5 text-sm font-semibold transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setCurrent(Math.min(indexedItems.length - 1, safeCurrent + 1))}
                disabled={!indexedItems.length || safeCurrent >= indexedItems.length - 1}
                className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-white/40 bg-black/20 px-3 py-1.5 text-sm font-semibold transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-3 py-4 sm:px-5 sm:py-6">
            {currentItem ? (
              <div className="mx-auto grid w-full max-w-[1560px] gap-5 xl:grid-cols-2">
                <div className="min-w-0">{pages[currentItem.index]}</div>
                <div className="hidden min-w-0 xl:block">
                  {nextItem ? pages[nextItem.index] : <div className="min-h-[720px] rounded-sm border border-[#b7dfee] bg-[#eefaff] shadow-[0_16px_38px_rgba(0,0,0,0.30)]" />}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl rounded-sm border border-[#b7dfee] bg-[#eefaff] px-4 py-16 text-center text-sm font-medium text-[#6c757d]">
                No hay intervenciones que coincidan.
              </div>
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}
