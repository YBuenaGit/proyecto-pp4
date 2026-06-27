"use client";

import type { FormEvent, FormEventHandler, ReactNode } from "react";
import { Search } from "lucide-react";
import { sortByLabel } from "@/lib/text";
import { AppModal } from "./app-modal";
import { Button, LinkButton } from "./button";

function ClearControl({
  onClear,
  resetHref,
}: {
  onClear?: () => void;
  resetHref: string;
}) {
  if (onClear) {
    return (
      <Button type="button" variant="secondary" onClick={onClear}>
        Limpiar
      </Button>
    );
  }

  return (
    <LinkButton href={resetHref} variant="secondary">
      Limpiar
    </LinkButton>
  );
}

export function FilterBar({
  children,
  resetHref,
  onSubmit,
  onClear,
  label = "Buscar",
  modal = false,
}: {
  children: ReactNode;
  resetHref: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  onClear?: () => void;
  label?: string;
  modal?: boolean;
}) {
  function form(close?: () => void) {
    return (
      <form
        className="p-3"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          onSubmit?.(event);
          if (onSubmit) close?.();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{children}</div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-[#c7d2de] pt-3">
          <ClearControl resetHref={resetHref} onClear={onClear} />
          <Button type="submit" variant="success">
            <Search className="h-4 w-4" />
            {label}
          </Button>
        </div>
      </form>
    );
  }

  if (modal) {
    return (
      <AppModal
        title="Filtros de busqueda"
        description="Completa uno o varios campos para limitar los resultados."
        trigger={<><Search className="h-4 w-4" />{label}</>}
        triggerVariant="success"
        size="xl"
      >
        {({ close }) => form(close)}
      </AppModal>
    );
  }

  return (
    <details className="group">
      <summary className="flex w-fit cursor-pointer list-none marker:hidden">
        <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border border-[#1f8f4d] bg-[#218c4f] px-3 py-1.5 text-sm font-semibold leading-tight text-white shadow-sm transition duration-150 hover:border-[#197a42] hover:bg-[#197a42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bd8b4]">
          <Search className="h-4 w-4" />
          {label}
        </span>
      </summary>

      <section className="mt-3 w-[min(calc(100vw-2rem),72rem)] overflow-hidden rounded-sm border border-[#c7d2de] bg-white shadow-sm">
        <div className="border-b border-[#c7d2de] bg-[#edf5fb] px-3 py-2 text-sm font-semibold text-[#263544]">
          Filtros de búsqueda
        </div>
        {form()}
      </section>
    </details>
  );
}

export function FilterInput({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[#495057]">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        className="h-9 w-full rounded-sm border border-[#b9c6d3] bg-white px-2.5 text-sm text-[#212529] outline-none transition duration-150 placeholder:text-[#6c757d] focus:border-[#0667b0] focus:ring-2 focus:ring-[rgba(6,103,176,.22)]"
      />
    </label>
  );
}

export function FilterSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<string | [string, string]>;
}) {
  const sortedOptions = sortByLabel(options, (option) => (Array.isArray(option) ? option[1] : option));

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[#495057]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-9 w-full rounded-sm border border-[#b9c6d3] bg-white px-2.5 text-sm text-[#212529] outline-none transition duration-150 focus:border-[#0667b0] focus:ring-2 focus:ring-[rgba(6,103,176,.22)]"
      >
        <option value="">Todos</option>
        {sortedOptions.map((option) => {
          const [value, labelText] = Array.isArray(option) ? option : [option, option];
          return (
            <option key={value} value={value}>
              {labelText}
            </option>
          );
        })}
      </select>
    </label>
  );
}
