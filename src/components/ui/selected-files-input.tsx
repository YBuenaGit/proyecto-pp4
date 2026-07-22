"use client";

import type { DirectUploadIntent } from "@/lib/direct-upload-shared";
import { DirectUploadInput } from "./direct-upload-input";

export function SelectedFilesInput({
  intent,
  accept,
  required = false,
  className,
  onFilesChange,
}: {
  intent: DirectUploadIntent;
  accept?: string;
  required?: boolean;
  className?: string;
  onFilesChange?: (files: File[]) => void;
}) {
  return (
    <DirectUploadInput
      intent={intent}
      accept={accept}
      required={required}
      className={className}
      onFilesChange={onFilesChange}
      label="Seleccionar imagenes o archivos"
    />
  );
}
