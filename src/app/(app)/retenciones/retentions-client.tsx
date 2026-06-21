"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Edit3, Eye, FileText, Plus, Upload } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterInput, FilterSelect } from "@/components/ui/filter-bar";
import { FormField, FormGrid, inputClass, textareaClass } from "@/components/ui/form-controls";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Td } from "@/components/ui/table";
import { cn } from "@/components/ui/cn";
import {
  ACT_TYPES,
  BRANDS,
  COLORS,
  RETENTION_FIELD_LABELS,
  RETENTION_FILTER_KEYS,
  RETENTION_STATUSES,
  VEHICLE_TYPES,
  optionLabel,
  uppercaseIdentifier,
  type RetentionField,
  type RetentionInput,
  type RetentionStatus,
} from "@/lib/retentions";

type RetentionRecord = RetentionInput & {
  id: string;
  internalNumber: string;
  dateTime: string;
  createdBy: string;
  historyCount: number;
  attachmentCount: number;
};

type RetentionHistory = {
  id: string;
  field: RetentionField;
  oldValue: string;
  newValue: string;
  editedBy: string;
  editedAt: string;
};

type RetentionAttachment = {
  id: string;
  downloadUrl: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
};

type RetentionDetail = RetentionRecord & {
  histories: RetentionHistory[];
  attachments: RetentionAttachment[];
};

type RetentionFilters = Partial<Record<(typeof RETENTION_FILTER_KEYS)[number], string>>;

function formatDateTime(value: string) {
  const date = new Date(value);
  const argentinaDate = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const day = String(argentinaDate.getUTCDate()).padStart(2, "0");
  const month = String(argentinaDate.getUTCMonth() + 1).padStart(2, "0");
  const year = String(argentinaDate.getUTCFullYear()).slice(-2);
  const hours = String(argentinaDate.getUTCHours()).padStart(2, "0");
  const minutes = String(argentinaDate.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.ceil(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function textFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function cleanFilters(formData: FormData) {
  const filters: RetentionFilters = {};
  RETENTION_FILTER_KEYS.forEach((key) => {
    const value = textFromForm(formData, key);
    if (value) filters[key] = ["domain", "engineNumber", "chassisNumber"].includes(key) ? uppercaseIdentifier(value) : value;
  });
  return filters;
}

function retentionInputFromForm(formData: FormData): RetentionInput {
  return {
    actNumber: textFromForm(formData, "actNumber"),
    actType: textFromForm(formData, "actType"),
    recordNumber: textFromForm(formData, "recordNumber"),
    domain: uppercaseIdentifier(textFromForm(formData, "domain")),
    engineNumber: uppercaseIdentifier(textFromForm(formData, "engineNumber")),
    chassisNumber: uppercaseIdentifier(textFromForm(formData, "chassisNumber")),
    vehicleType: textFromForm(formData, "vehicleType"),
    brand: textFromForm(formData, "brand"),
    color: textFromForm(formData, "color"),
    description: textFromForm(formData, "description"),
    status: (textFromForm(formData, "status") || "PENDIENTE") as RetentionStatus,
  };
}

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "No se pudo completar la accion.");
  return data as T;
}

function RetentionForm({
  initial,
  onCancel,
  onSave,
  submitLabel,
}: {
  initial?: RetentionRecord;
  onCancel: () => void;
  onSave: (input: RetentionInput) => Promise<void>;
  submitLabel: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = retentionInputFromForm(new FormData(event.currentTarget));
    const hasIdentifier = Boolean(input.domain || input.engineNumber || input.chassisNumber);
    if (!hasIdentifier) {
      setError("Completa al menos dominio, motor o chasis.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la retencion.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <div className="rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-3 py-2 text-sm font-semibold text-[#721c24]">{error}</div> : null}
      <FormGrid>
        <FormField label="Nro de acta">
          <input name="actNumber" type="number" min="0" step="1" defaultValue={initial?.actNumber} required className={inputClass} />
        </FormField>
        <FormField label="Tipo de acta">
          <select name="actType" defaultValue={initial?.actType ?? ""} required className={inputClass}>
            <option value="">Seleccione tipo</option>
            {ACT_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Legajo">
          <input name="recordNumber" type="number" min="0" step="1" defaultValue={initial?.recordNumber} required className={inputClass} />
        </FormField>
        <FormField label="Dominio">
          <input name="domain" defaultValue={initial?.domain} className={inputClass} />
        </FormField>
        <FormField label="Nro de motor">
          <input name="engineNumber" defaultValue={initial?.engineNumber} className={inputClass} />
        </FormField>
        <FormField label="Nro de chasis">
          <input name="chassisNumber" defaultValue={initial?.chassisNumber} className={inputClass} />
        </FormField>
        <FormField label="Vehiculo">
          <select name="vehicleType" defaultValue={initial?.vehicleType ?? ""} required className={inputClass}>
            <option value="">Seleccione vehiculo</option>
            {VEHICLE_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Marca">
          <select name="brand" defaultValue={initial?.brand ?? ""} required className={inputClass}>
            <option value="">Seleccione marca</option>
            {BRANDS.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Color">
          <select name="color" defaultValue={initial?.color ?? ""} required className={inputClass}>
            <option value="">Seleccione color</option>
            {COLORS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Estado">
          <select name="status" defaultValue={initial?.status ?? "PENDIENTE"} required className={inputClass}>
            {RETENTION_STATUSES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Observaciones" className="md:col-span-2">
          <textarea name="description" defaultValue={initial?.description} required className={textareaClass} />
        </FormField>
      </FormGrid>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[#dee2e6] pt-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="success" disabled={saving}>
          {saving ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function RetentionDetailsPanel({ record }: { record: RetentionRecord }) {
  const [detail, setDetail] = useState<RetentionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    apiJson<{ item: RetentionDetail }>(`/api/retenciones/${record.id}`)
      .then((data) => {
        if (!ignore) setDetail(data.item);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : "No se pudo cargar el detalle.");
      });
    return () => {
      ignore = true;
    };
  }, [record.id]);

  const current = detail ?? { ...record, histories: [], attachments: [] };
  const deliveredBy = current.histories.find((history) => history.field === "status" && history.newValue === "Entregado");

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-3 py-2 text-sm font-semibold text-[#721c24]">{error}</div> : null}
      {!detail && !error ? <div className="text-sm font-medium text-[#6c757d]">Cargando detalle...</div> : null}

      <section className="grid gap-3 rounded-sm border border-[#dee2e6] bg-[#f8f9fa] p-3 text-sm md:grid-cols-2">
        <p>
          <strong>Acta:</strong> {optionLabel(ACT_TYPES, current.actType)} Nro {current.actNumber}
        </p>
        <p>
          <strong>Legajo:</strong> {current.recordNumber}
        </p>
        <p>
          <strong>Dominio:</strong> {current.domain || "N/A"}
        </p>
        <p>
          <strong>Motor:</strong> {current.engineNumber || "N/A"}
        </p>
        <p>
          <strong>Chasis:</strong> {current.chassisNumber || "N/A"}
        </p>
        <p>
          <strong>Vehiculo:</strong> {optionLabel(VEHICLE_TYPES, current.vehicleType)} / {current.brand} / {current.color}
        </p>
        <p>
          <strong>Cargado por:</strong> {current.createdBy}
        </p>
        <p>
          <strong>Fecha:</strong> {formatDateTime(current.dateTime)}
        </p>
        <p className="md:col-span-2">
          <strong>Observaciones:</strong> {current.description}
        </p>
        <div className="md:col-span-2">
          <strong className="mr-2">Estado:</strong>
          <StatusBadge value={current.status} />
          {deliveredBy ? <span className="ml-2 text-xs text-[#6c757d]">Entregado por {deliveredBy.editedBy}</span> : null}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-[#212529]">Historial de edicion</h3>
        <Table
          title="Historial de edición"
          itemLabel="cambios"
          total={current.histories.length}
          showPagination={false}
          headers={["Campo", "Valor anterior", "Valor nuevo", "Editado por", "Fecha"]}
          empty={!current.histories.length}
          minWidth={760}
        >
          {current.histories.map((history) => (
            <tr key={history.id}>
              <Td>{RETENTION_FIELD_LABELS[history.field] ?? history.field}</Td>
              <Td>{history.oldValue}</Td>
              <Td>{history.newValue}</Td>
              <Td>{history.editedBy}</Td>
              <Td>{formatDateTime(history.editedAt)}</Td>
            </tr>
          ))}
        </Table>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-[#212529]">Archivos</h3>
        <AttachmentGrid attachments={current.attachments} />
      </section>
    </div>
  );
}

function AttachmentGrid({ attachments }: { attachments: RetentionAttachment[] }) {
  if (!attachments.length) return <p className="rounded-sm border border-[#dee2e6] bg-[#f8f9fa] p-3 text-sm font-medium text-[#6c757d]">Sin archivos cargados.</p>;

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {attachments.map((file) => (
        <a
          key={file.id}
          href={file.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-sm border border-[#dee2e6] bg-[#f8f9fa] px-3 py-2 text-sm transition duration-150 hover:border-[#0667b0] hover:bg-white"
        >
          <div className="font-semibold text-[#0667b0] [overflow-wrap:anywhere]">{file.originalName || file.fileName}</div>
          <div className="mt-1 text-xs font-medium text-[#6c757d]">
            {formatFileSize(file.size)} - {file.mimeType || "application/octet-stream"}
          </div>
          <div className="mt-1 text-xs font-medium text-[#6c757d]">
            {file.uploadedBy} - {formatDateTime(file.createdAt)}
          </div>
        </a>
      ))}
    </div>
  );
}

function FileUploadPanel({
  retentions,
  onUploaded,
}: {
  retentions: RetentionRecord[];
  onUploaded: (item: RetentionDetail) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [attachments, setAttachments] = useState<RetentionAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeSelectedId = selectedId || retentions[0]?.id || "";

  useEffect(() => {
    if (!activeSelectedId) return;

    let ignore = false;
    apiJson<{ item: RetentionDetail }>(`/api/retenciones/${activeSelectedId}`)
      .then((data) => {
        if (!ignore) setAttachments(data.item.attachments);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : "No se pudieron cargar los archivos.");
      })
    return () => {
      ignore = true;
    };
  }, [activeSelectedId]);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.currentTarget.value = "";
    if (!activeSelectedId || !files.length) return;

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    setUploading(true);
    setError(null);
    try {
      const data = await apiJson<{ item: RetentionDetail }>(`/api/retenciones/${activeSelectedId}/archivos`, {
        method: "POST",
        body: formData,
      });
      setAttachments(data.item.attachments);
      onUploaded(data.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron subir los archivos.");
    } finally {
      setUploading(false);
    }
  }

  const selectedRetention = retentions.find((record) => record.id === activeSelectedId);

  return (
    <section className="mt-4 rounded-sm border border-[#dee2e6] bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[#dee2e6] bg-[#e9ecef] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#212529]">
          <FileText className="h-4 w-4 text-[#0667b0]" />
          Imagenes / archivos
        </div>
        <label className={cn("inline-flex min-h-9 max-w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-[#0667b0] bg-[#0667b0] px-3 py-1.5 text-center text-sm font-semibold leading-tight text-white shadow-sm transition duration-150 hover:border-[#0a61b9] hover:bg-[#0a61b9] focus-within:ring-2 focus-within:ring-[#80bdff]", (!activeSelectedId || uploading) && "pointer-events-none opacity-60")}>
          <Upload className="h-4 w-4" />
          {uploading ? "Subiendo..." : "Subir imagenes / archivos"}
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" className="sr-only" onChange={handleChange} disabled={!activeSelectedId || uploading} />
        </label>
      </div>

      <div className="grid gap-3 p-3">
        {error ? <div className="rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-3 py-2 text-sm font-semibold text-[#721c24]">{error}</div> : null}
        <label className="block max-w-xl">
          <span className="mb-1 block text-xs font-semibold text-[#495057]">Retencion / acta</span>
          <select
            value={activeSelectedId}
            onChange={(event) => {
              setError(null);
              setSelectedId(event.target.value);
            }}
            className={inputClass}
            disabled={!retentions.length || uploading}
          >
            {!retentions.length ? <option value="">Sin retenciones disponibles</option> : null}
            {retentions.map((record) => (
              <option key={record.id} value={record.id}>
                {record.internalNumber} - Acta {record.actNumber} - {record.domain || record.engineNumber || record.chassisNumber}
              </option>
            ))}
          </select>
        </label>
        {selectedRetention ? (
          <p className="text-xs font-medium text-[#6c757d]">
            Archivos asociados a {selectedRetention.internalNumber}. Se guardan en Cloudflare R2 al seleccionar archivos.
          </p>
        ) : null}
        <AttachmentGrid attachments={activeSelectedId ? attachments : []} />
      </div>
    </section>
  );
}

export function RetentionsClient() {
  const [retentions, setRetentions] = useState<RetentionRecord[]>([]);
  const [filters, setFilters] = useState<RetentionFilters>({});
  const [filterRenderKey, setFilterRenderKey] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasActiveFilters = Object.keys(filters).length > 0;
  const pageSize = 10;

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters, page]);

  const refreshRetentions = useCallback(() => setRefreshKey((current) => current + 1), []);

  useEffect(() => {
    let ignore = false;
    apiJson<{ items: RetentionRecord[]; total: number }>(`/api/retenciones?${queryString}`)
      .then((data) => {
        if (!ignore) {
          setRetentions(data.items);
          setTotal(data.total);
          if (data.total > 0 && data.items.length === 0 && page > 1) setPage(1);
        }
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : "No se pudieron cargar las retenciones.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [page, queryString, refreshKey]);

  const refreshList = useCallback(() => {
    setLoading(true);
    setError(null);
    refreshRetentions();
  }, [refreshRetentions]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setPage(1);
    setFilters(cleanFilters(new FormData(event.currentTarget)));
    setFilterRenderKey((current) => current + 1);
  }

  function clearFilters() {
    setLoading(true);
    setError(null);
    setPage(1);
    setFilters({});
    setFilterRenderKey((current) => current + 1);
  }

  async function addRetention(input: RetentionInput, close: () => void) {
    await apiJson<{ item: RetentionDetail }>("/api/retenciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    refreshList();
    close();
  }

  async function updateRetention(id: string, input: RetentionInput, close: () => void) {
    await apiJson<{ item: RetentionDetail }>(`/api/retenciones/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    refreshList();
    close();
  }

  function updateUploadedRecord(item: RetentionDetail) {
    setRetentions((current) =>
      current.map((record) =>
        record.id === item.id
          ? {
              ...record,
              attachmentCount: item.attachments.length,
              historyCount: item.histories.length,
              status: item.status,
            }
          : record,
      ),
    );
  }

  return (
    <>
      <PageHeader
        title="Retenciones / actas"
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Retenciones / actas" }]}
      />

      <ListToolbar
        actions={
          <AppModal title="Nueva retencion" trigger={<><Plus className="h-4 w-4" />Nueva retencion</>} size="xl">
            {({ close }) => (
              <RetentionForm submitLabel="Crear retencion" onCancel={close} onSave={(input) => addRetention(input, close)} />
            )}
          </AppModal>
        }
      >
        <div key={filterRenderKey}>
          <FilterBar resetHref="/retenciones" label="Buscar retencion" onSubmit={applyFilters} onClear={clearFilters}>
            <FilterInput label="Desde" name="from" type="date" defaultValue={filters.from} />
            <FilterInput label="Hasta" name="to" type="date" defaultValue={filters.to} />
            <FilterInput label="Nro de acta" name="actNumber" defaultValue={filters.actNumber} />
            <FilterSelect label="Tipo de acta" name="actType" defaultValue={filters.actType} options={ACT_TYPES.map(([value, label]) => [value, label])} />
            <FilterInput label="Legajo" name="recordNumber" defaultValue={filters.recordNumber} />
            <FilterInput label="Dominio" name="domain" defaultValue={filters.domain} />
            <FilterInput label="Nro de motor" name="engineNumber" defaultValue={filters.engineNumber} />
            <FilterInput label="Nro de chasis" name="chassisNumber" defaultValue={filters.chassisNumber} />
            <FilterSelect label="Vehiculo" name="vehicleType" defaultValue={filters.vehicleType} options={VEHICLE_TYPES.map(([value, label]) => [value, label])} />
            <FilterSelect label="Marca" name="brand" defaultValue={filters.brand} options={[...BRANDS]} />
            <FilterSelect label="Color" name="color" defaultValue={filters.color} options={[...COLORS]} />
            <FilterSelect label="Estado" name="status" defaultValue={filters.status} options={RETENTION_STATUSES.map(([value, label]) => [value, label])} />
          </FilterBar>
        </div>
      </ListToolbar>

      <p className="mb-2 text-sm font-medium text-[#495057]">Fecha de inicio: 11 de Octubre de 2024</p>

      {error ? <div className="mb-3 rounded-sm border border-[#f5c6cb] bg-[#f8d7da] px-3 py-2 text-sm font-semibold text-[#721c24]">{error}</div> : null}

      <Table
        title={hasActiveFilters ? "Retenciones filtradas" : "Retenciones"}
        itemLabel="retenciones"
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage) => {
          setLoading(true);
          setPage(nextPage);
        }}
        onRefresh={refreshList}
        headers={["Fecha y hora", "Tipo de acta / Nro", "Identificador", "Vehiculo / Marca / Color", "Estado", "Acciones"]}
        empty={!loading && !retentions.length}
        minWidth={1180}
      >
        {retentions.map((record) => (
          <tr key={record.id}>
            <Td>
              <div className="font-medium">{formatDateTime(record.dateTime)}</div>
              <div className="mt-1 text-xs text-[#6c757d]">Registro {record.internalNumber}</div>
            </Td>
            <Td>
              <div className="font-medium">{optionLabel(ACT_TYPES, record.actType)}</div>
              <div className="mt-1 text-xs text-[#6c757d]">Nro: {record.actNumber} - Legajo: {record.recordNumber}</div>
            </Td>
            <Td>
              <IdentifierLine label="Dominio" value={record.domain} />
              <IdentifierLine label="Motor" value={record.engineNumber} />
              <IdentifierLine label="Chasis" value={record.chassisNumber} />
            </Td>
            <Td>
              <div className="font-medium">{optionLabel(VEHICLE_TYPES, record.vehicleType)}</div>
              <div className="mt-1 text-xs text-[#6c757d]">{record.brand} - {record.color}</div>
            </Td>
            <Td>
              <StatusBadge value={record.status} />
              <div className="mt-1 text-xs text-[#6c757d]">Cargado por: {record.createdBy}</div>
              <div className="mt-1 text-xs text-[#6c757d]">
                {record.attachmentCount} archivos - {record.historyCount} cambios
              </div>
            </Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                <AppModal title={`Detalle ${record.internalNumber}`} trigger={<><Eye className="h-4 w-4" />Ver</>} triggerVariant="secondary" size="lg">
                  <RetentionDetailsPanel record={record} />
                </AppModal>
                <AppModal title={`Editar ${record.internalNumber}`} trigger={<><Edit3 className="h-4 w-4" />Editar</>} triggerVariant="secondary" size="xl">
                  {({ close }) => (
                    <RetentionForm
                      initial={record}
                      submitLabel="Guardar cambios"
                      onCancel={close}
                      onSave={(input) => updateRetention(record.id, input, close)}
                    />
                  )}
                </AppModal>
              </div>
            </Td>
          </tr>
        ))}
      </Table>

      {loading ? <p className="mt-3 text-sm font-medium text-[#6c757d]">Cargando retenciones...</p> : null}

      <FileUploadPanel retentions={retentions} onUploaded={updateUploadedRecord} />
    </>
  );
}

function IdentifierLine({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("text-xs leading-5", value ? "text-[#212529]" : "text-[#6c757d]")}>
      <span className="font-semibold">{label}:</span> {value || "N/A"}
    </div>
  );
}
