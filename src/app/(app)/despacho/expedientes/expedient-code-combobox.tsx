"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { inputClass } from "@/components/ui/form-controls";
import { CODIGOS_EXPEDIENTES, codigoExpedienteLabel } from "@/lib/constants/codigosExpedientes";
import { normalizeName } from "@/lib/format";

function optionText(item: (typeof CODIGOS_EXPEDIENTES)[number]) {
  return `${item.codigo} - ${item.descripcion}`;
}

function matchesOption(item: (typeof CODIGOS_EXPEDIENTES)[number], query: string) {
  const normalizedQuery = normalizeName(query);
  if (!normalizedQuery) return true;
  const normalizedCode = normalizeName(item.codigo);
  const normalizedDescription = normalizeName(item.descripcion);
  return normalizedDescription.startsWith(normalizedQuery) || normalizedDescription.includes(normalizedQuery) || normalizedCode.includes(normalizedQuery);
}

export function ExpedientCodeCombobox({ defaultValue }: { defaultValue?: string | null }) {
  const initialLabel = codigoExpedienteLabel(defaultValue);
  const [selectedCode, setSelectedCode] = useState(defaultValue ?? "");
  const [query, setQuery] = useState(defaultValue ? initialLabel : "");
  const [open, setOpen] = useState(false);

  const filteredOptions = useMemo(() => CODIGOS_EXPEDIENTES.filter((item) => matchesOption(item, query)).slice(0, 12), [query]);
  const selectOption = (item: (typeof CODIGOS_EXPEDIENTES)[number]) => {
    setSelectedCode(item.codigo);
    setQuery(optionText(item));
    setOpen(false);
  };

  return (
    <div className="relative">
      <input type="hidden" name="codigo" value={selectedCode} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6c757d]" />
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setSelectedCode("");
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && open && filteredOptions[0]) {
              event.preventDefault();
              selectOption(filteredOptions[0]);
            }
          }}
          placeholder="Buscar por codigo o descripcion"
          className={`${inputClass} pl-8 pr-9`}
        />
        {query ? (
          <button
            type="button"
            aria-label="Limpiar codigo"
            onClick={() => {
              setQuery("");
              setSelectedCode("");
              setOpen(true);
            }}
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-[#6c757d] hover:bg-[#e9ecef] hover:text-[#212529]"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-sm border border-[#ced4da] bg-white shadow-lg">
          {filteredOptions.length ? (
            filteredOptions.map((item) => (
              <button
                key={item.codigo}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(item)}
                className="block w-full px-3 py-2 text-left text-sm text-[#212529] transition hover:bg-[#e9ecef] focus:bg-[#e9ecef] focus:outline-none"
              >
                <span className="block font-semibold">{item.descripcion}</span>
                <span className="text-xs font-medium text-[#6c757d]">{item.codigo}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm font-medium text-[#6c757d]">Sin codigos coincidentes.</p>
          )}
        </div>
      ) : null}
      <p className="mt-1 text-xs font-medium text-[#6c757d]">
        Escribe una letra o palabra de la descripcion para encontrar el codigo.
      </p>
    </div>
  );
}
