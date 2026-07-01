"use client";

import { useRef, useState } from "react";
import { Trash2, Upload, X } from "lucide-react";
import { cn } from "./cn";

function fileLabel(file: File) {
  const sizeKb = Math.max(1, Math.ceil(file.size / 1024));
  return `${file.name} - ${sizeKb} KB`;
}

function filesFromInput(input: HTMLInputElement | null) {
  return Array.from(input?.files ?? []);
}

export function SelectedFilesInput({
  name,
  accept,
  required = false,
  onFilesChange,
  className,
}: {
  name: string;
  accept?: string;
  required?: boolean;
  onFilesChange?: (files: File[]) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  function syncFiles(nextFiles: File[]) {
    setFiles(nextFiles);
    onFilesChange?.(nextFiles);
  }

  function removeFile(indexToRemove: number) {
    const input = inputRef.current;
    const nextFiles = files.filter((_, index) => index !== indexToRemove);
    if (input) {
      const dataTransfer = new DataTransfer();
      nextFiles.forEach((file) => dataTransfer.items.add(file));
      input.files = dataTransfer.files;
    }
    syncFiles(nextFiles);
  }

  return (
    <div className={className}>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-[#17a2b8] bg-[#d1ecf1]/40 px-3 py-3 text-sm font-semibold text-[#0c5460] transition hover:bg-[#d1ecf1] focus-within:ring-2 focus-within:ring-[#80bdff]">
        <Upload className="h-4 w-4" />
        Seleccionar imagenes o archivos
        <input
          ref={inputRef}
          name={name}
          type="file"
          multiple
          required={required}
          accept={accept}
          className="sr-only"
          onChange={(event) => syncFiles(filesFromInput(event.currentTarget))}
        />
      </label>
      <p className="mt-1 text-xs font-medium text-[#6c757d]">
        {files.length ? `${files.length} archivo(s) seleccionado(s).` : "Puedes seleccionar mas de un archivo."}
      </p>
      {files.length ? (
        <ul className="mt-2 space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className={cn(
                "flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-sm border border-[#dee2e6] bg-[#f8f9fa] px-3 py-2 text-sm",
              )}
            >
              <span className="min-w-0 flex-1 break-words font-medium text-[#212529]">{fileLabel(file)}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-[#dc3545] bg-white px-2 text-xs font-semibold text-[#c82333] transition hover:bg-[#f8d7da] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1aeb5]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Quitar
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
