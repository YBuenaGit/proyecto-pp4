"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { Children, cloneElement, isValidElement } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "./cn";

type TableProps = {
  headers: string[];
  children: ReactNode;
  empty?: boolean;
  minWidth?: number;
  title?: string;
  total?: number;
  page?: number;
  pageSize?: number;
  itemLabel?: string;
  showPagination?: boolean;
  onPageChange?: (page: number) => void;
  onRefresh?: () => void;
  rowClick?: boolean;
};

type TdProps = {
  children: ReactNode;
  className?: string;
  mobileLabel?: string;
};

function rowCount(children: ReactNode) {
  return Children.toArray(children).filter(Boolean).length;
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("a,button,input,select,textarea,label,summary,[role='button'],[data-row-action]"));
}

function paginationHref(pathname: string, params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  if (page <= 1) {
    next.delete("page");
  } else {
    next.set("page", String(page));
  }
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange?: (page: number) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const previousDisabled = safePage <= 1;
  const nextDisabled = safePage >= totalPages;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-[#c7d2de] bg-[#f4f8fb] px-3 py-3 text-sm font-semibold text-[#263544] sm:flex-row">
      <span>
        Página {safePage} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        {previousDisabled ? (
          <span className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-[#c7d2de] bg-[#d9dee4] px-3 py-1.5 text-[#78828c]">
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </span>
        ) : onPageChange ? (
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-[#b6cfeb] bg-white px-3 py-1.5 text-[#1877f2] transition duration-150 hover:bg-[#e8f2ff]"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
        ) : (
          <Link
            href={paginationHref(pathname, new URLSearchParams(searchParams.toString()), safePage - 1)}
            className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-[#b6cfeb] bg-white px-3 py-1.5 text-[#1877f2] transition duration-150 hover:bg-[#e8f2ff]"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Link>
        )}
        {nextDisabled ? (
          <span className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-[#c7d2de] bg-[#d9dee4] px-3 py-1.5 text-[#78828c]">
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </span>
        ) : onPageChange ? (
          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-[#b6cfeb] bg-white px-3 py-1.5 text-[#1877f2] transition duration-150 hover:bg-[#e8f2ff]"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <Link
            href={paginationHref(pathname, new URLSearchParams(searchParams.toString()), safePage + 1)}
            className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-[#b6cfeb] bg-white px-3 py-1.5 text-[#1877f2] transition duration-150 hover:bg-[#e8f2ff]"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

function withMobileLabels(children: ReactNode, headers: string[], rowClick: boolean) {
  return Children.map(children, (row) => {
    if (!isValidElement(row)) return row;
    const rowElement = row as ReactElement<{ children?: ReactNode; className?: string }>;
    const cells = Children.map(rowElement.props.children, (cell, index) => {
      if (!isValidElement(cell)) return cell;
      return cloneElement(cell as ReactElement<TdProps>, {
        mobileLabel: headers[index] ?? "",
      });
    });

    return cloneElement(rowElement, {
      className: cn(
        "transition duration-150 hover:bg-[#c4e7f3]/65 focus-within:bg-[#c4e7f3]/65 max-lg:block max-lg:cursor-default max-lg:overflow-hidden max-lg:rounded-sm max-lg:border max-lg:border-[#c7d2de] max-lg:bg-white max-lg:shadow-sm",
        rowClick && "cursor-pointer",
        rowElement.props.className,
      ),
      children: cells,
    });
  });
}

export function Table({
  headers,
  children,
  empty,
  minWidth = 960,
  title = "Registros",
  total,
  page = 1,
  pageSize = 10,
  itemLabel = "registros",
  showPagination,
  onPageChange,
  onRefresh,
  rowClick = true,
}: TableProps) {
  const router = useRouter();
  const displayed = rowCount(children);
  const resolvedTotal = total ?? displayed;
  const shouldPaginate = showPagination ?? resolvedTotal > pageSize;
  const labelledChildren = withMobileLabels(children, headers, rowClick);

  function handleBodyClick(event: MouseEvent<HTMLTableSectionElement>) {
    if (!rowClick) return;
    if (isInteractiveTarget(event.target)) return;
    const row = event.target instanceof Element ? event.target.closest("tr") : null;
    const link = row?.querySelector<HTMLAnchorElement>("a[href]");
    const href = link?.getAttribute("href");
    if (!href) return;
    if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      window.location.href = href;
      return;
    }
    router.push(href);
  }

  return (
    <section className="overflow-hidden rounded-sm border border-[#c7d2de] bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[#c7d2de] bg-[#edf5fb] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-[#263544]">{title}</h2>
          <p className="text-xs font-medium text-[#5c6875]">
            Total de {itemLabel}: {resolvedTotal} · Mostrando {displayed} en esta página
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (onRefresh) {
              onRefresh();
              return;
            }
            router.refresh();
          }}
          className="inline-flex min-h-9 w-fit items-center gap-1.5 rounded-sm border border-[#b6cfeb] bg-white px-3 py-1.5 text-sm font-semibold text-[#1877f2] shadow-sm transition duration-150 hover:bg-[#e8f2ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ec5ff]"
        >
          <RefreshCw className="h-4 w-4" />
          Recargar
        </button>
      </div>
      <div className="max-w-full overflow-hidden">
        <table className="w-full table-fixed border-collapse text-sm max-lg:block" style={{ minWidth: `min(100%, ${minWidth}px)` }}>
          <thead className="bg-[#d7e0ea] max-lg:hidden">
            <tr>
              {headers.map((header) => (
                <th key={header} className="border border-[#c7d2de] px-2.5 py-2 text-left text-xs font-semibold uppercase tracking-normal text-[#263544]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white max-lg:block max-lg:space-y-3 max-lg:bg-[#f4f8fb] max-lg:p-3" onClick={handleBodyClick}>
            {labelledChildren}
          </tbody>
        </table>
      </div>
      {empty ? <div className="border-t border-[#c7d2de] px-4 py-8 text-center text-sm font-medium text-[#5c6875]">No hay registros para mostrar.</div> : null}
      {shouldPaginate ? <TablePagination page={page} pageSize={pageSize} total={resolvedTotal} onPageChange={onPageChange} /> : null}
    </section>
  );
}

export function Td({ children, className, mobileLabel }: TdProps) {
  return (
    <td
      className={cn(
        "whitespace-normal break-words border border-[#c7d2de] px-2.5 py-2 align-top text-[#212529] [overflow-wrap:anywhere] max-lg:block max-lg:border-0 max-lg:border-b max-lg:border-[#d7e0ea] max-lg:px-3 max-lg:py-2.5 max-lg:last:border-b-0",
        className,
      )}
    >
      {mobileLabel ? <span className="mb-1 hidden text-[11px] font-semibold uppercase tracking-normal text-[#5c6875] max-lg:block">{mobileLabel}</span> : null}
      {children}
    </td>
  );
}
