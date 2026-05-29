"use client";

import Link from "next/link";
import { Children, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { cn } from "@/components/ui/cn";

export type LegajoBookItem = {
  sheetNumber: number;
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
}: {
  items: LegajoBookItem[];
  children: ReactNode;
  downloadHref: string;
  headerAction?: ReactNode;
}) {
  const pages = Children.toArray(children);
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(0);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items
      .map((item, index) => ({ ...item, index }))
      .filter((item) => {
        if (!normalized) return true;
        return `${item.title} ${item.dateText} ${item.statusText ?? ""} ${item.searchText}`.toLowerCase().includes(normalized);
      });
  }, [items, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
        return;
      }
      if (event.key === "ArrowLeft") setCurrent((value) => Math.max(0, value - 1));
      if (event.key === "ArrowRight") setCurrent((value) => Math.min(filteredItems.length - 1, value + 1));
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredItems.length]);

  const safeCurrent = Math.min(current, Math.max(filteredItems.length - 1, 0));
  const currentItem = filteredItems[safeCurrent];
  const nextItem = filteredItems[safeCurrent + 1];

  return (
    <section className="overflow-hidden rounded-sm border border-[#dee2e6] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dee2e6] bg-[#e9ecef] px-3 py-2.5">
        <div>
          <h2 className="text-lg font-semibold text-[#212529]">Legajo de la intervencion</h2>
          <p className="text-sm text-[#6c757d]">Vista documental con indice, busqueda y navegacion por hojas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerAction}
          <Link
            href={downloadHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-sm border border-[#6c757d] bg-white px-3 py-1.5 text-sm font-semibold text-[#495057] shadow-sm transition hover:bg-[#e9ecef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80bdff]"
          >
            <Download className="h-4 w-4" />
            Descargar legajo
          </Link>
        </div>
      </div>

      <div className="grid bg-[#521e00] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.10),_transparent_24rem)] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-[#7a4b2f] bg-[#17a2b8] text-white lg:border-b-0 lg:border-r">
          <div className="border-b border-white/20 p-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/85">Buscar en actuaciones</span>
              <span className="flex items-center gap-2 rounded-sm bg-white px-2.5 py-1.5 text-[#212529]">
                <Search className="h-4 w-4 shrink-0 text-[#17a2b8]" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setCurrent(0);
                  }}
                  className="h-7 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-[#6c757d]"
                  placeholder="Actuacion, fecha o texto"
                  type="search"
                />
              </span>
            </label>
          </div>

          <div className="max-h-[420px] overflow-y-auto lg:max-h-[calc(100dvh-18rem)]">
            {filteredItems.length ? (
              filteredItems.map((item, index) => (
                <button
                  key={`${item.sheetNumber}-${item.index}`}
                  type="button"
                  onClick={() => setCurrent(index)}
                  className={cn(
                    "block w-full border-b border-white/15 px-3 py-2 text-left text-sm transition hover:bg-[#116c7a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                    index === safeCurrent && "bg-[#116c7a]",
                  )}
                >
                  <span className="block font-semibold">Hoja {item.sheetNumber} · {item.title}</span>
                  <span className="mt-0.5 block text-xs text-white/85">{item.dateText}</span>
                  {item.statusText ? <span className="mt-0.5 block text-xs text-white/85">{item.statusText}</span> : null}
                </button>
              ))
            ) : (
              <p className="px-3 py-8 text-center text-sm font-medium text-white/85">No hay hojas que coincidan.</p>
            )}
          </div>
        </aside>

        <div className="min-w-0 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-white">
            <div className="text-sm font-semibold">
              {filteredItems.length ? `Hoja ${safeCurrent + 1} de ${filteredItems.length}` : "Sin resultados"}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrent((value) => Math.max(0, value - 1))}
                disabled={!filteredItems.length || safeCurrent === 0}
                className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-white/40 bg-black/20 px-3 py-1.5 text-sm font-semibold transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setCurrent((value) => Math.min(filteredItems.length - 1, value + 1))}
                disabled={!filteredItems.length || safeCurrent >= filteredItems.length - 1}
                className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-white/40 bg-black/20 px-3 py-1.5 text-sm font-semibold transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {currentItem ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="min-w-0">{pages[currentItem.index]}</div>
              <div className="hidden min-w-0 lg:block">
                {nextItem ? pages[nextItem.index] : <div className="min-h-[680px] rounded-sm border border-[#e3d6bd] bg-[#fffdf7] shadow-[0_12px_34px_rgba(0,0,0,0.22)]" />}
              </div>
            </div>
          ) : (
            <div className="rounded-sm border border-[#e3d6bd] bg-[#fffdf7] px-4 py-16 text-center text-sm font-medium text-[#6c757d]">
              No hay hojas para mostrar.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
