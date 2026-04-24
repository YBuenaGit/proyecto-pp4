import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { AppModal } from "./app-modal";
import { Button, LinkButton } from "./button";

export function FilterBar({ children, resetHref }: { children: ReactNode; resetHref: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <AppModal
        title="Filtrar resultados"
        description="Ajusta los criterios de busqueda y listado."
        trigger={(
          <>
            <SlidersHorizontal className="h-4 w-4" />
            Filtrar
          </>
        )}
        size="lg"
      >
        <form className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" data-modal-close>
              Cancelar
            </Button>
            <LinkButton href={resetHref} variant="secondary">
              Limpiar
            </LinkButton>
            <Button type="submit" variant="primary">
              Aplicar filtros
            </Button>
          </div>
        </form>
      </AppModal>
      <LinkButton href={resetHref} variant="secondary">
        Limpiar
      </LinkButton>
      </div>
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
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
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
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
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
