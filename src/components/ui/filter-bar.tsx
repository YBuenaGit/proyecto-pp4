import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { AppModal } from "./app-modal";
import { Button, LinkButton } from "./button";

export function FilterBar({ children, resetHref }: { children: ReactNode; resetHref: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
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
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#d7e4ee] pt-4">
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
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#607589]">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-lg border border-[#c9d9e5] bg-white/95 px-3 text-sm text-[#172033] shadow-[inset_0_1px_0_rgba(255,255,255,0.70)] outline-none transition duration-200 hover:border-[#9bb8ca] focus:border-[#255f85] focus:ring-[3px] focus:ring-[#c7dcea]"
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
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#607589]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-11 w-full rounded-lg border border-[#c9d9e5] bg-white/95 px-3 text-sm text-[#172033] shadow-[inset_0_1px_0_rgba(255,255,255,0.70)] outline-none transition duration-200 hover:border-[#9bb8ca] focus:border-[#255f85] focus:ring-[3px] focus:ring-[#c7dcea]"
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
