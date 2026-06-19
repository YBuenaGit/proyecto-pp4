import type { ReactNode } from "react";
import type { BookTextBlock } from "@/lib/book-pagination";

// Full-page divider sheet ("caratula") that opens every section of the legajo,
// the way a printed case file uses a title sheet before each intervention.
export function BookSectionCover({
  eyebrow,
  ordinal,
  subtitle,
  meta,
}: {
  eyebrow?: string | null;
  ordinal: string;
  subtitle?: string | null;
  meta: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <article className="book-leaf rounded-sm border border-[#b7dfee] bg-[#eef7fc] shadow-[0_16px_38px_rgba(0,0,0,0.28)]">
      <div className="book-leaf-body flex flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
          <div className="mb-5 h-1 w-16 rounded-full bg-[#17688f]" />
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0c5460]">{eyebrow}</p> : null}
          <h3 className="mt-3 text-3xl font-bold uppercase tracking-wide text-[#0b2a55] sm:text-4xl">{ordinal}</h3>
          {subtitle ? <p className="mt-2 text-base font-semibold text-[#17688f]">{subtitle}</p> : null}
          {meta.length ? (
            <dl className="mt-7 w-full max-w-md space-y-2 text-left">
              {meta.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-[#cfe6f1] pb-1.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#6c757d]">{row.label}</dt>
                  <dd className="text-right text-sm font-semibold text-[#212529]">{row.value || "-"}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        <div className="border-t border-[#cfe6f1] px-6 py-3 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-[#6c757d]">
          Secretaria de Seguridad Municipal
        </div>
      </div>
    </article>
  );
}

// Content sheet: the whole page is one white sheet of fixed height (so every
// content page looks identical), with the writing flowing on it from the top
// down to a small margin before the bottom edge.
export function BookContentSheet({
  sectionLabel,
  pageNumber = 1,
  pageCount = 1,
  textBlocks,
  footer,
}: {
  sectionLabel: string;
  pageNumber?: number;
  pageCount?: number;
  textBlocks: BookTextBlock[];
  footer?: ReactNode;
}) {
  return (
    <article className="book-leaf rounded-sm border border-[#b7dfee] bg-white shadow-[0_12px_34px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#e6eef4] px-5 py-1.5 sm:px-7">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[#0c5460]">{sectionLabel}</p>
        {pageCount > 1 ? <span className="shrink-0 text-[11px] font-medium text-[#9aa7b0]">Hoja {pageNumber} de {pageCount}</span> : null}
      </div>
      <div className="book-leaf-body px-5 pb-12 pt-5 sm:px-7">
        {textBlocks.length ? (
          <div className="space-y-5">
            {textBlocks.map((block, index) => (
              <section key={`${block.label}-${index}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#17688f]">{block.label}</p>
                <p className="book-leaf-text mt-1.5 whitespace-pre-wrap text-[15px] leading-7 text-[#1f2937]">{block.text}</p>
              </section>
            ))}
          </div>
        ) : (
          <p className="text-sm font-medium text-[#6c757d]">Sin contenido textual cargado.</p>
        )}
        {footer ? <div className="mt-5">{footer}</div> : null}
      </div>
    </article>
  );
}
