"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { inputClass } from "@/components/ui/form-controls";
import { CODIGOS_EXPEDIENTES } from "@/lib/constants/codigosExpedientes";
import { normalizeName } from "@/lib/format";

function optionText(item: (typeof CODIGOS_EXPEDIENTES)[number]) {
  return `${item.codigo} - ${item.descripcion}`;
}

function matchesOption(item: (typeof CODIGOS_EXPEDIENTES)[number], query: string) {
  const normalizedQuery = normalizeName(query);
  if (!normalizedQuery) return false;
  return normalizeName(item.descripcion).startsWith(normalizedQuery) || normalizeName(item.codigo).startsWith(normalizedQuery);
}

function codeOption(code: string) {
  return CODIGOS_EXPEDIENTES.find((item) => item.codigo === code) ?? null;
}

export function ExpedientCodeCombobox({ defaultValue }: { defaultValue?: string | null }) {
  const [selectedCode, setSelectedCode] = useState(defaultValue ?? "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedOption = selectedCode ? codeOption(selectedCode) : null;
  const filteredOptions = useMemo(() => CODIGOS_EXPEDIENTES.filter((item) => matchesOption(item, query)), [query]);
  const showResults = open && query.trim().length > 0;

  function selectOption(item: (typeof CODIGOS_EXPEDIENTES)[number]) {
    setSelectedCode(item.codigo);
    setQuery(optionText(item));
    setOpen(false);
  }

  function clearFilter() {
    setQuery("");
    setSelectedCode("");
    setOpen(false);
  }

  return (
    <div className="relative space-y-2">
      <input type="hidden" name="codigo" value={selectedCode} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6c757d]" />
        <input
          type="text"
          value={query}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setSelectedCode("");
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && showResults && filteredOptions[0]) {
              event.preventDefault();
              selectOption(filteredOptions[0]);
            }
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Escribi la primera letra del tramite"
          className={`${inputClass} pl-8 pr-9`}
        />
        {query ? (
          <button
            type="button"
            aria-label="Limpiar filtro de codigo"
            onClick={clearFilter}
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-[#6c757d] hover:bg-[#e9ecef] hover:text-[#212529]"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {selectedOption ? (
        <p className="rounded-sm border border-[#c7d2de] bg-[#edf5fb] px-2.5 py-1.5 text-xs font-semibold text-[#263544]">
          Seleccionado: {optionText(selectedOption)}
        </p>
      ) : null}

      {showResults ? (
        <div className="absolute z-30 max-h-80 w-full overflow-y-auto rounded-sm border border-[#ced4da] bg-white shadow-lg">
          {filteredOptions.length ? (
            filteredOptions.map((item) => (
              <button
                key={item.codigo}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(item)}
                className="block w-full px-3 py-2 text-left text-sm text-[#212529] transition hover:bg-[#e9ecef] focus:bg-[#e9ecef] focus:outline-none"
              >
                {optionText(item)}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm font-medium text-[#6c757d]">Sin codigos coincidentes.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
