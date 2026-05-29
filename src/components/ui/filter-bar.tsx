import type { ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button, LinkButton } from "./button";

export function FilterBar({ children, resetHref }: { children: ReactNode; resetHref: string }) {
  return (
    <section className="mb-4 overflow-hidden rounded-sm border border-[#dee2e6] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#dee2e6] bg-[#e9ecef] px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#212529]">
          <Search className="h-4 w-4 text-[#0667b0]" />
          Buscar registros
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <LinkButton href={resetHref} variant="secondary" className="min-h-8 px-2.5 py-1 text-xs">
            Limpiar
          </LinkButton>
        </div>
      </div>

      <form className="hidden p-3 md:block">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">{children}</div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-[#dee2e6] pt-3">
          <LinkButton href={resetHref} variant="secondary">
            Limpiar
          </LinkButton>
          <Button type="submit" variant="info">
            <Search className="h-4 w-4" />
            Buscar
          </Button>
        </div>
      </form>

      <details className="md:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-semibold text-[#0667b0] marker:hidden">
          <SlidersHorizontal className="h-4 w-4" />
          Mostrar filtros
        </summary>
        <form className="space-y-3 border-t border-[#dee2e6] p-3">
          <div className="grid gap-3">{children}</div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#dee2e6] pt-3">
            <LinkButton href={resetHref} variant="secondary">
              Limpiar
            </LinkButton>
            <Button type="submit" variant="info">
              <Search className="h-4 w-4" />
              Buscar
            </Button>
          </div>
        </form>
      </details>
    </section>
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
        className="h-9 w-full rounded-sm border border-[#ced4da] bg-white px-2.5 text-sm text-[#212529] outline-none transition duration-150 placeholder:text-[#6c757d] focus:border-[#80bdff] focus:ring-2 focus:ring-[rgba(0,123,255,.25)]"
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
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[#495057]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-9 w-full rounded-sm border border-[#ced4da] bg-white px-2.5 text-sm text-[#212529] outline-none transition duration-150 focus:border-[#80bdff] focus:ring-2 focus:ring-[rgba(0,123,255,.25)]"
      >
        <option value="">Todos</option>
        {options.map((option) => {
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
