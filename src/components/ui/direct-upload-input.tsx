"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Image from "next/image";
import { RefreshCw, Trash2, Upload } from "lucide-react";
import {
  DIRECT_UPLOAD_CONCURRENCY,
  DIRECT_UPLOAD_RETRIES,
  MAX_DIRECT_UPLOAD_FILE_BYTES,
  MAX_DIRECT_UPLOAD_FILES,
  type DirectUploadIntent,
  type DirectUploadSessionResponse,
} from "@/lib/direct-upload-shared";
import { cn } from "./cn";

type UploadStatus = "uploading" | "ready" | "error";

type UploadItem = {
  key: string;
  file: File;
  status: UploadStatus;
  progress: number;
  sessionId?: string;
  error?: string;
};

class UploadSemaphore {
  private active = 0;
  private waiting: Array<() => void> = [];

  async acquire() {
    if (this.active < DIRECT_UPLOAD_CONCURRENCY) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.active += 1;
  }

  release() {
    this.active = Math.max(0, this.active - 1);
    this.waiting.shift()?.();
  }
}

const uploadSemaphore = new UploadSemaphore();

function LocalFilePreview({ file }: { file: File }) {
  const [url] = useState(() => URL.createObjectURL(file));

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  if (file.type.startsWith("image/")) {
    return (
      <Image
        src={url}
        alt={`Vista previa de ${file.name}`}
        width={88}
        height={88}
        unoptimized
        className="h-20 w-20 shrink-0 rounded-sm border border-[#bee5eb] object-cover"
      />
    );
  }
  if (file.type.startsWith("video/")) {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        className="h-20 w-28 shrink-0 rounded-sm border border-[#bee5eb] bg-black object-cover"
      />
    );
  }
  return null;
}

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function fileSizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "No se pudo subir el archivo.");
  }
  return data as T;
}

function putPart(input: {
  url: string;
  body: Blob;
  onProgress: (loaded: number) => void;
  register: (xhr: XMLHttpRequest) => void;
  unregister: (xhr: XMLHttpRequest) => void;
}) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    input.register(xhr);
    xhr.open("PUT", input.url);
    xhr.upload.onprogress = (event) => input.onProgress(event.loaded);
    xhr.onerror = () => reject(new Error("Se interrumpio la conexion con Cloudflare R2."));
    xhr.onabort = () => reject(new DOMException("Carga cancelada.", "AbortError"));
    xhr.onload = () => {
      input.unregister(xhr);
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Cloudflare R2 rechazo una parte del archivo (${xhr.status}).`));
        return;
      }
      const eTag = xhr.getResponseHeader("ETag");
      if (!eTag) {
        reject(new Error("Cloudflare R2 no expuso el ETag. Revisa la configuracion CORS del bucket."));
        return;
      }
      resolve(eTag);
    };
    xhr.send(input.body);
  });
}

export function DirectUploadInput({
  intent,
  accept,
  required = false,
  className,
  label = "Seleccionar archivos",
  onFilesChange,
  showPreviews = false,
}: {
  intent: DirectUploadIntent;
  accept?: string;
  required?: boolean;
  className?: string;
  label?: string;
  onFilesChange?: (files: File[]) => void;
  showPreviews?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<UploadItem[]>([]);
  const activeRequestsRef = useRef(new Map<string, Set<XMLHttpRequest>>());
  const canceledRef = useRef(new Set<string>());
  const [items, setItems] = useState<UploadItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  function syncItems(updater: (current: UploadItem[]) => UploadItem[]) {
    setItems((current) => {
      const next = updater(current);
      itemsRef.current = next;
      onFilesChange?.(next.map((item) => item.file));
      return next;
    });
  }

  function updateItem(key: string, patch: Partial<UploadItem>) {
    syncItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function registerRequest(key: string, xhr: XMLHttpRequest) {
    const requests = activeRequestsRef.current.get(key) ?? new Set<XMLHttpRequest>();
    requests.add(xhr);
    activeRequestsRef.current.set(key, requests);
  }

  function unregisterRequest(key: string, xhr: XMLHttpRequest) {
    const requests = activeRequestsRef.current.get(key);
    requests?.delete(xhr);
    if (!requests?.size) activeRequestsRef.current.delete(key);
  }

  async function partUrls(sessionId: string, partNumbers: number[]) {
    const response = await apiJson<{ parts: Array<{ partNumber: number; url: string }> }>(
      `/api/uploads/${sessionId}/parts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partNumbers }),
      },
    );
    return new Map(response.parts.map((part) => [part.partNumber, part.url]));
  }

  async function uploadFile(itemKey: string, file: File) {
    let sessionId: string | undefined;
    try {
      setFormError(null);
      const session = await apiJson<DirectUploadSessionResponse>("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          name: file.name,
          type: file.type,
          size: file.size,
        }),
      });
      sessionId = session.id;
      if (canceledRef.current.has(itemKey)) {
        await fetch(`/api/uploads/${session.id}`, { method: "DELETE" }).catch(() => undefined);
        return;
      }
      updateItem(itemKey, { sessionId: session.id });

      const numbers = Array.from({ length: session.partCount }, (_, index) => index + 1);
      let urls = await partUrls(session.id, numbers);
      const loadedByPart = new Map<number, number>();
      const completedParts: Array<{ partNumber: number; eTag: string }> = [];
      let nextPartIndex = 0;

      function updateProgress(partNumber: number, loaded: number) {
        loadedByPart.set(partNumber, loaded);
        const totalLoaded = [...loadedByPart.values()].reduce((sum, value) => sum + value, 0);
        updateItem(itemKey, { progress: Math.min(99, Math.round((totalLoaded / file.size) * 100)) });
      }

      async function uploadOne(partNumber: number) {
        const start = (partNumber - 1) * session.partSize;
        const body = file.slice(start, Math.min(file.size, start + session.partSize));
        let lastError: unknown;
        for (let attempt = 1; attempt <= DIRECT_UPLOAD_RETRIES; attempt += 1) {
          if (canceledRef.current.has(itemKey)) throw new DOMException("Carga cancelada.", "AbortError");
          if (attempt > 1) {
            urls = await partUrls(session.id, [partNumber]);
          }
          const url = urls.get(partNumber);
          if (!url) throw new Error("No se pudo autorizar una parte del archivo.");
          await uploadSemaphore.acquire();
          try {
            const eTag = await putPart({
              url,
              body,
              onProgress: (loaded) => updateProgress(partNumber, loaded),
              register: (xhr) => registerRequest(itemKey, xhr),
              unregister: (xhr) => unregisterRequest(itemKey, xhr),
            });
            updateProgress(partNumber, body.size);
            completedParts.push({ partNumber, eTag });
            return;
          } catch (error) {
            lastError = error;
            if (error instanceof DOMException && error.name === "AbortError") throw error;
          } finally {
            uploadSemaphore.release();
          }
        }
        throw lastError instanceof Error ? lastError : new Error("No se pudo subir una parte del archivo.");
      }

      async function worker() {
        while (nextPartIndex < numbers.length) {
          const partNumber = numbers[nextPartIndex];
          nextPartIndex += 1;
          await uploadOne(partNumber);
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(DIRECT_UPLOAD_CONCURRENCY, numbers.length) }, () => worker()),
      );
      if (canceledRef.current.has(itemKey)) return;
      await apiJson(`/api/uploads/${session.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts: completedParts }),
      });
      updateItem(itemKey, { status: "ready", progress: 100, error: undefined });
    } catch (error) {
      if (canceledRef.current.has(itemKey)) return;
      updateItem(itemKey, {
        status: "error",
        error: error instanceof Error ? error.message : "No se pudo subir el archivo.",
      });
      if (sessionId) {
        await fetch(`/api/uploads/${sessionId}`, { method: "DELETE" }).catch(() => undefined);
      }
    }
  }

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!selected.length) return;
    const existing = new Set(itemsRef.current.map((item) => item.key));
    const available = Math.max(0, MAX_DIRECT_UPLOAD_FILES - itemsRef.current.length);
    const accepted = selected
      .filter((file) => !existing.has(fileKey(file)))
      .slice(0, available);
    if (selected.length > accepted.length) {
      setFormError(`Se permiten hasta ${MAX_DIRECT_UPLOAD_FILES} archivos por formulario.`);
    }
    const valid: UploadItem[] = [];
    for (const file of accepted) {
      if (file.size <= 0 || file.size > MAX_DIRECT_UPLOAD_FILE_BYTES) {
        setFormError(`El archivo ${file.name} supera el maximo de 1 GB.`);
        continue;
      }
      valid.push({ key: fileKey(file), file, status: "uploading", progress: 0 });
    }
    if (!valid.length) return;
    syncItems((current) => [...current, ...valid]);
    valid.forEach((item) => void uploadFile(item.key, item.file));
  }

  async function removeItem(item: UploadItem) {
    canceledRef.current.add(item.key);
    activeRequestsRef.current.get(item.key)?.forEach((xhr) => xhr.abort());
    activeRequestsRef.current.delete(item.key);
    syncItems((current) => current.filter((candidate) => candidate.key !== item.key));
    if (item.sessionId) {
      await fetch(`/api/uploads/${item.sessionId}`, { method: "DELETE" }).catch(() => undefined);
    }
  }

  async function retryItem(item: UploadItem) {
    canceledRef.current.delete(item.key);
    updateItem(item.key, { status: "uploading", progress: 0, error: undefined, sessionId: undefined });
    await uploadFile(item.key, item.file);
  }

  useEffect(() => {
    const form = containerRef.current?.closest("form");
    if (!form) return;
    const blockIncompleteUpload = (event: Event) => {
      const current = itemsRef.current;
      const incomplete = current.some((item) => item.status !== "ready");
      if ((required && current.length === 0) || incomplete) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setFormError(
          required && current.length === 0
            ? "Selecciona al menos un archivo."
            : "Espera a que terminen todas las cargas o quita los archivos con error.",
        );
      }
    };
    form.addEventListener("submit", blockIncompleteUpload, true);
    return () => form.removeEventListener("submit", blockIncompleteUpload, true);
  }, [required]);

  return (
    <div ref={containerRef} className={cn("space-y-2", className)}>
      {items.filter((item) => item.status === "ready").map((item) => (
        <input key={item.key} type="hidden" name="uploadSessionIds" value={item.sessionId} />
      ))}
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-[#17a2b8] bg-[#d1ecf1]/40 px-3 py-3 text-sm font-semibold text-[#0c5460] transition hover:bg-[#d1ecf1] focus-within:ring-2 focus-within:ring-[#80bdff]">
        <Upload className="h-4 w-4" />
        {label}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          onChange={addFiles}
        />
      </label>
      <p className="text-xs font-medium text-[#495057]">
        Hasta {MAX_DIRECT_UPLOAD_FILES} archivos de 1 GB cada uno.
      </p>
      {formError ? (
        <p role="alert" className="rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-2.5 py-2 text-xs font-semibold text-[#721c24]">
          {formError}
        </p>
      ) : null}
      {items.length ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key} className="rounded-sm border border-[#dee2e6] bg-white px-3 py-2 text-sm">
              <div className="flex min-w-0 items-start gap-3">
                {showPreviews ? <LocalFilePreview file={item.file} /> : null}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium" title={item.file.name}>
                      {item.file.name} · {fileSizeLabel(item.file.size)}
                    </span>
                    {item.status === "error" ? (
                      <button
                        type="button"
                        onClick={() => void retryItem(item)}
                        className="inline-flex min-h-8 items-center gap-1 rounded-sm border border-[#6c757d] px-2 text-xs font-semibold text-[#495057] hover:bg-[#e9ecef]"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Reintentar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void removeItem(item)}
                      className="inline-flex min-h-8 items-center gap-1 rounded-sm border border-[#dc3545] px-2 text-xs font-semibold text-[#c82333] hover:bg-[#f8d7da]"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Quitar
                    </button>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e9ecef]">
                    <div
                      className={cn(
                        "h-full transition-[width]",
                        item.status === "error" ? "bg-[#dc3545]" : item.status === "ready" ? "bg-[#28a745]" : "bg-[#0667b0]",
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[#6c757d]">
                    {item.status === "ready"
                      ? "Listo para guardar"
                      : item.status === "error"
                        ? item.error
                        : `Subiendo ${item.progress}%`}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
