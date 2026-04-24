import type { ReactNode } from "react";
import { Button, LinkButton } from "./button";

export function FilterBar({ children, resetHref }: { children: ReactNode; resetHref: string }) {
  return (
    <form className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">{children}</div>
      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" variant="primary">Filtrar</Button>
        <LinkButton href={resetHref} variant="secondary">Limpiar</LinkButton>
      </div>
    </form>
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
