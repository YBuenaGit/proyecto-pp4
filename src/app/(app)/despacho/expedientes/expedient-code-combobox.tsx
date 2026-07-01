"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { ChevronDown, X } from "lucide-react";
import { inputClass } from "@/components/ui/form-controls";
import { CODIGOS_EXPEDIENTES } from "@/lib/constants/codigosExpedientes";
import { normalizeName } from "@/lib/format";
import { cn } from "@/components/ui/cn";

function optionText(item: (typeof CODIGOS_EXPEDIENTES)[number]) {
  return `${item.codigo} - ${item.descripcion}`;
}

function codeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function matchesOption(item: (typeof CODIGOS_EXPEDIENTES)[number], query: string) {
  const normalizedQuery = normalizeName(query);
  if (!normalizedQuery) return true;
  const normalizedDescription = normalizeName(item.descripcion);
  const normalizedCode = normalizeName(item.codigo);
  const queryDigits = codeDigits(normalizedQuery);

  return (
    normalizedDescription.startsWith(normalizedQuery) ||
    normalizedCode.startsWith(normalizedQuery) ||
    Boolean(queryDigits && codeDigits(normalizedCode).includes(queryDigits))
  );
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

  function selectOption(item: (typeof CODIGOS_EXPEDIENTES)[number]) {
    setSelectedCode(item.codigo);
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }

    if (event.key === "Enter" && open && filteredOptions[0]) {
      event.preventDefault();
      selectOption(filteredOptions[0]);
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      setOpen(true);
      setQuery((current) => current.slice(0, -1));
      return;
    }

    if (event.key === "ArrowDown" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (event.key.length === 1) {
      event.preventDefault();
      setOpen(true);
      setSelectedCode("");
      setQuery((current) => `${current}${event.key}`);
    }
  }

  return (
    <div
      className="relative"
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <input type="hidden" name="codigo" value={selectedCode} />
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setOpen((current) => !current);
        }}
        className={cn(inputClass, "flex items-center justify-between gap-2 text-left")}
      >
        <span className={cn("min-w-0 flex-1 truncate", selectedOption ? "text-[#212529]" : "text-[#6c757d]")}>
          {selectedOption ? optionText(selectedOption) : "Seleccionar"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#6c757d]" />
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-sm border border-[#ced4da] bg-white shadow-lg">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[#dee2e6] bg-[#f8f9fa] px-3 py-2 text-xs font-semibold text-[#495057]">
            <span>{query ? `Filtrando por: ${query}` : `Todos los codigos (${CODIGOS_EXPEDIENTES.length})`}</span>
            {query ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setQuery("")}
                className="inline-flex items-center gap-1 rounded-sm px-1.5 py-1 text-[#6c757d] hover:bg-[#e9ecef] hover:text-[#212529]"
              >
                <X className="h-3.5 w-3.5" />
                Ver todos
              </button>
            ) : null}
          </div>
          {filteredOptions.length ? (
            filteredOptions.map((item) => (
              <button
                key={item.codigo}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(item)}
                className={cn(
                  "block w-full px-3 py-2 text-left text-sm text-[#212529] transition hover:bg-[#e9ecef] focus:bg-[#e9ecef] focus:outline-none",
                  item.codigo === selectedCode ? "bg-[#edf5fb] font-semibold" : "",
                )}
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
